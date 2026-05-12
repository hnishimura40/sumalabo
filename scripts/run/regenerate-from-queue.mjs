#!/usr/bin/env node
// すまほん regenerate-from-queue CLI
//
// 役割:
//   queue 内 status=needs_regeneration の entry を 1 件 pick し、ChatGPT 経由の
//   正式な本文生成フローに乗せるための handoff materials を準備する。
//
//   rule-based generator (`generateExplainer`) が薄い出力をして publish-gate
//   で blocking された記事を、そのまま放置せず ChatGPT で再生成するためのつなぎ。
//
// 3 フェーズ構成:
//
//   Phase A (本 CLI、auto-runnable):
//     - pick needs_regeneration entry (status → preparing_regeneration)
//     - prepare-from-sumahon が出すのと同じ handoff/brief/prompt/chrome-steps を
//       logs/handoff, logs/brief, logs/prompt 配下に生成
//     - sourceLog (logs/source/{slug}.json) も書き出す
//     - queue entry に slug / preparedAt / handoffPath などを記録
//     - 最後に status を awaiting_chatgpt_generation に更新
//     - 標準出力に "次に Claude in Chrome が何をすべきか" の指示を出す
//
//   Phase B (interactive、Claude in Chrome で人間 or Claude が運転):
//     - awaiting_chatgpt_generation entry を見つけ、article prompt を
//       ChatGPT プロジェクトに貼り付け
//     - 初稿生成 → メタ排除/ボリューム/すまラボらしさを精錬
//     - 最終稿を drafts/generated/{slug}.md に保存
//     - queue entry の status を awaiting_import に更新 (or 失敗時は needs_regeneration へ)
//     ※ この CLI は Phase B を実行しない (Chrome MCP が必要)
//
//   Phase C (auto):
//     - awaiting_import entry を取り出し、`npm run article:import-generated` 相当を実行
//     - sourceCheck / articleQualityCheck / publish-gate を通す
//     - 通れば commit → preview push → PR → notifyReviewReady
//     - status: awaiting_import → preview_created (成功) or needs_regeneration (gate 失敗)
//     ※ 本 PR の範囲では Phase C も未実装。npm run article:import-generated を
//       人間か Claude session が手動で呼ぶ前提。
//
// 安全方針 (CLAUDE.md 準拠):
//   - rule-based の薄い本文を Preview に出さない (publish-gate でブロック済)
//   - 参考情報なしの記事を出さない (publish-gate でブロック済)
//   - すまほん表記を出さない (sourceCheck でブロック済)
//   - main へ直接 push しない (preview ブランチ経由)
//   - X 投稿は呼ばない
//
// CLI:
//   --dry-run         pick + 状態確認のみ、handoff materials を書き出さない
//   --max-jobs N      1 起動あたりの最大件数 (既定 1)
//
// 終了コード:
//   0 = 正常完了 (1 件処理 or キューが空で何もしなかった)
//   1 = 致命エラー
//   2 = handoff prep でガード (assertNoTrackedChanges 等) に弾かれた

import { existsSync, mkdirSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchSource } from "../sumahon/fetch-source.mjs";
import { classifyTopic } from "../sumahon/classify-topic.mjs";
import { loadAutomationConfig } from "../sumahon/automation-config.mjs";
import { generateArticleBrief } from "../sumahon/generate-article-brief.mjs";
import { generateArticlePrompt } from "../sumahon/generate-article-prompt.mjs";
import { generateExplainer } from "../sumahon/generate-explainer.mjs";
import {
  buildHandoffPaths,
  generateChromeStepsMarkdown,
  generateHandoffMarkdown,
} from "../sumahon/generate-handoff.mjs";
import { generateThumbnailBrief } from "../sumahon/generate-thumbnail-brief.mjs";
import { generateThumbnailPrompt } from "../sumahon/generate-thumbnail-prompt.mjs";
import {
  pickNextNeedsRegeneration,
  updateStatus,
  readQueue,
  summarizeQueue,
  PATHS,
} from "../sumahon/queue-store.mjs";
import {
  parseArgs,
  slugifyFromUrl,
  toIsoJst,
  uniqueSlug,
  writeJson,
  writeText,
} from "../sumahon/utils.mjs";

function logEvent(events, type, payload = {}) {
  events.push({ type, at: toIsoJst(new Date()), ...payload });
}

async function appendLog(events, status, summary, logPath) {
  const dir = path.dirname(logPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  await writeFile(
    logPath,
    JSON.stringify({ status, ...summary, events }, null, 2) + "\n",
    "utf-8",
  );
}

async function prepareHandoff(entry, { config, dryRun }) {
  // entry.url から slug / handoff materials を作る。create-from-sumahon と
  // 同じ流れの prep フェーズだけ実行 (git push しない、MDX も書かない)。
  const baseSlug = slugifyFromUrl(entry.url, "sumahon-topic");
  const slug = await uniqueSlug(baseSlug);
  const source = await fetchSource(entry.url);
  const classification = classifyTopic(source);
  const generated = generateExplainer({ source, classification, slug });
  const articleBrief = generateArticleBrief({ source, classification, generated });
  const thumbnailBrief = generateThumbnailBrief({ source, classification, generated });
  const thumbnailPrompt = generateThumbnailPrompt(thumbnailBrief, {
    thumbnailNewChatUrl: config.chatgptTargets.thumbnailNewChatUrl,
  });
  const handoffPaths = buildHandoffPaths({ slug, config });
  const articlePrompt = generateArticlePrompt({ articleBrief, thumbnailBrief, config });
  const handoffMarkdown = generateHandoffMarkdown({ source, slug, paths: handoffPaths, config });
  const chromeStepsMarkdown = generateChromeStepsMarkdown({ slug, paths: handoffPaths, config });
  const sourceLogPath = `logs/source/${slug}.json`;

  if (dryRun) {
    return {
      dryRun: true,
      slug,
      handoffPath: handoffPaths.handoffPath,
      sourceLogPath,
    };
  }

  await writeJson(sourceLogPath, {
    sourceMedia: source.sourceMedia,
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    sourcePublishedAt: source.sourcePublishedAt,
    detectedAt: new Date().toISOString(),
    keyPoints: source.keyPoints,
    note: "元記事本文の丸ごと保存はしない。ChatGPT 5.5 handoffのための最小メモのみ保存。regenerate-from-queue 経由で生成。",
  });
  await writeJson(handoffPaths.articleBriefPath, articleBrief);
  await writeText(handoffPaths.articlePromptPath, articlePrompt);
  await writeJson(handoffPaths.thumbnailBriefPath, thumbnailBrief);
  await writeText(handoffPaths.thumbnailPromptPath, thumbnailPrompt);
  await writeText(handoffPaths.handoffPath, handoffMarkdown);
  await writeText(handoffPaths.chromeStepsPath, chromeStepsMarkdown);

  return {
    dryRun: false,
    slug,
    classification: classification.sumalaboUse,
    priority: classification.priority,
    sourceLogPath,
    handoffPath: handoffPaths.handoffPath,
    chromeStepsPath: handoffPaths.chromeStepsPath,
    articlePromptPath: handoffPaths.articlePromptPath,
    materialsDraftPath: handoffPaths.materialsDraftPath,
    generatedDraftPath: handoffPaths.generatedDraftPath,
    finalThumbnailPromptPath: handoffPaths.finalThumbnailPromptPath,
    thumbnailOutputPath: handoffPaths.thumbnailOutputPath,
    articleProjectUrl: config.chatgptTargets.articleProjectUrl,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const dryRun = Boolean(args["dry-run"] || args.dryRun);
  const maxJobs = parseInt(args["max-jobs"] || args.maxJobs || "1", 10) || 1;

  const events = [];
  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const logPath = path.join("logs", "automation", `${stamp}-regenerate-from-queue.json`);

  logEvent(events, "started", { args: { dryRun, maxJobs } });

  let config;
  try {
    config = await loadAutomationConfig();
  } catch (e) {
    logEvent(events, "config_load_error", { error: e.message });
    await appendLog(events, "fatal", {}, logPath);
    console.error("fatal: cannot load automation config:", e.message);
    process.exit(1);
  }

  let processedCount = 0;
  let preparedSlugs = [];

  for (let i = 0; i < maxJobs; i++) {
    const entry = dryRun
      ? (await readQueue()).find((q) => q.status === "needs_regeneration") || null
      : await pickNextNeedsRegeneration();

    if (!entry) {
      logEvent(events, "queue_empty", { pickedIdx: i });
      break;
    }

    logEvent(events, "picked_needs_regeneration", {
      url: entry.url,
      previousStatus: entry.previousStatus || null,
      regenerationAttempts: entry.regenerationAttempts || 1,
      regenerationReason: entry.regenerationReason || null,
    });

    try {
      const prep = await prepareHandoff(entry, { config, dryRun });
      logEvent(events, "handoff_prepared", { slug: prep.slug, dryRun, paths: prep.dryRun ? null : {
        handoffPath: prep.handoffPath,
        articlePromptPath: prep.articlePromptPath,
        chromeStepsPath: prep.chromeStepsPath,
        generatedDraftPath: prep.generatedDraftPath,
        materialsDraftPath: prep.materialsDraftPath,
      } });
      preparedSlugs.push(prep.slug);

      if (!dryRun) {
        await updateStatus(entry.url, {
          status: "awaiting_chatgpt_generation",
          slug: prep.slug,
          handoffPath: prep.handoffPath,
          articlePromptPath: prep.articlePromptPath,
          chromeStepsPath: prep.chromeStepsPath,
          generatedDraftPath: prep.generatedDraftPath,
          articleProjectUrl: prep.articleProjectUrl,
          preparedAt: new Date().toISOString(),
        });
        processedCount++;
        logEvent(events, "status_updated", { url: entry.url, newStatus: "awaiting_chatgpt_generation" });
      }
    } catch (e) {
      logEvent(events, "prep_failed", { url: entry.url, error: e.message });
      if (!dryRun) {
        // 失敗したら entry を needs_regeneration に戻す（pick で preparing_regeneration になっていたので）
        await updateStatus(entry.url, {
          status: "needs_regeneration",
          regenerationPrepError: e.message?.slice(0, 800) || "unknown",
        });
      }
      console.error("prep failed:", e.message);
      // 1 件失敗で停止
      break;
    }
  }

  const finalQueue = await readQueue();
  const summary = {
    dryRun,
    maxJobsPerRun: maxJobs,
    processedCount,
    preparedSlugs,
    queueSummary: summarizeQueue(finalQueue),
    queuePath: PATHS.QUEUE_PATH,
  };
  logEvent(events, "completed", { summary });
  await appendLog(events, "completed", summary, logPath);

  console.log(JSON.stringify({ logPath, ...summary }, null, 2));

  if (processedCount > 0) {
    console.log("");
    console.log("=== Next: Phase B (Claude in Chrome) ===");
    console.log("以下を ChatGPT 経由で実行してください:");
    for (const slug of preparedSlugs) {
      console.log(`  - slug: ${slug}`);
      console.log(`    handoff: logs/handoff/${slug}.handoff.md`);
      console.log(`    chrome-steps: logs/handoff/${slug}.chrome-steps.md`);
      console.log(`    article prompt: logs/prompt/${slug}.article.md`);
      console.log(`    final draft target: drafts/generated/${slug}.md`);
    }
    console.log("");
    console.log("最終稿が drafts/generated/{slug}.md に置かれたら、次の手順で Preview 化:");
    console.log("  1. npm run article:import-generated -- --slug <slug>");
    console.log("     → MDX 化 + sourceCheck + articleQualityCheck + publish-gate を通す");
    console.log("  2. 通れば preview branch push + PR + PWA notify");
    console.log("  3. queue entry の status は手動で awaiting_import → preview_created へ");
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error("fatal:", e.message);
  process.exit(1);
});
