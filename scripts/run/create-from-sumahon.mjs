#!/usr/bin/env node
import path from "node:path";
import { fetchSource } from "../sumahon/fetch-source.mjs";
import { classifyTopic } from "../sumahon/classify-topic.mjs";
import { loadAutomationConfig } from "../sumahon/automation-config.mjs";
import { generateArticleBrief } from "../sumahon/generate-article-brief.mjs";
import { generateArticlePrompt } from "../sumahon/generate-article-prompt.mjs";
import { generateExplainer } from "../sumahon/generate-explainer.mjs";
import { buildHandoffPaths, generateChromeStepsMarkdown, generateHandoffMarkdown } from "../sumahon/generate-handoff.mjs";
import { generateThumbnailBrief } from "../sumahon/generate-thumbnail-brief.mjs";
import { generateThumbnailPrompt } from "../sumahon/generate-thumbnail-prompt.mjs";
import { reviewArticle } from "../sumahon/review-article.mjs";
import { reviseArticle } from "../sumahon/revise-article.mjs";
import { writeMdx } from "../sumahon/write-mdx.mjs";
import { assertNoTrackedChanges, commitAndPushPreview, createPreviewBranch, getCurrentBranch } from "../sumahon/push-preview.mjs";
import { validateForAutomatedPublish } from "../sumahon/validate-for-automated-publish.mjs";
import { readFile as fsReadFile, unlink as fsUnlink } from "node:fs/promises";
import {
  assertSumahonUrl,
  parseArgs,
  readJson,
  runCommand,
  slugifyFromUrl,
  todayJst,
  uniqueSlug,
  writeJson,
  writeText,
} from "../sumahon/utils.mjs";

async function updateAutomationData({ sourceUrl, classification, slug, generated }) {
  const processedPath = path.join("data", "automation", "processed-urls.json");
  const ledgerPath = path.join("data", "automation", "topic-ledger.json");
  const processed = await readJson(processedPath, []);
  const ledger = await readJson(ledgerPath, []);
  const now = new Date().toISOString();

  if (!processed.some((item) => item.sourceUrl === sourceUrl)) {
    processed.push({
      sourceUrl,
      slug,
      processedAt: now,
      title: generated.title,
      classification: classification.sumalaboUse,
    });
  }

  ledger.push({
    ...classification,
    slug,
    articleTitle: generated.title,
    loggedAt: now,
  });

  await writeJson(processedPath, processed);
  await writeJson(ledgerPath, ledger);

  return [processedPath, ledgerPath];
}

function makeBranchName(slug) {
  const suffix = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
  return `auto/sumahon-${slug.slice(0, 42)}-${suffix}`;
}

// === A2: publish-gate cleanup ===
// publish-gate が rule-based 薄文を blocking した場合、writeMdx() で
// content/articles/{slug}.mdx と関連 logs を既に書いてしまっている。これらが
// working tree に残ると、後段の wrangler build が拾って production に shipped
// される事故 (2026-05-13 で gpt-5-5 / evan-blass の 2 件発生) が起きる。
//
// 対策: publish-gate fail 直後に
//   1. 当該 run が書いた per-article ファイル群を best-effort で削除
//   2. updateAutomationData() で processed-urls.json / topic-ledger.json に
//      append したエントリも rollback (= 当該 sourceUrl / slug のエントリを除去)
// する。失敗しても exit code 2 は維持。
async function cleanupOnPublishGateBlock({ filesToDelete, sourceUrl, slug }) {
  const deleted = [];
  const failed = [];
  for (const p of filesToDelete) {
    try {
      await fsUnlink(p);
      deleted.push(p);
    } catch (e) {
      if (e && e.code === "ENOENT") {
        // already gone — fine
      } else {
        failed.push({ path: p, error: e.message });
      }
    }
  }

  const automationRollback = { processedRemoved: 0, ledgerRemoved: 0, error: null };
  try {
    const processedPath = path.join("data", "automation", "processed-urls.json");
    const ledgerPath = path.join("data", "automation", "topic-ledger.json");
    const processed = await readJson(processedPath, []);
    const ledger = await readJson(ledgerPath, []);
    const beforeP = processed.length;
    const beforeL = ledger.length;
    const filteredProcessed = Array.isArray(processed)
      ? processed.filter((it) => it && it.sourceUrl !== sourceUrl)
      : processed;
    const filteredLedger = Array.isArray(ledger)
      ? ledger.filter((it) => it && it.slug !== slug)
      : ledger;
    if (filteredProcessed.length !== beforeP) {
      await writeJson(processedPath, filteredProcessed);
      automationRollback.processedRemoved = beforeP - filteredProcessed.length;
    }
    if (filteredLedger.length !== beforeL) {
      await writeJson(ledgerPath, filteredLedger);
      automationRollback.ledgerRemoved = beforeL - filteredLedger.length;
    }
  } catch (e) {
    automationRollback.error = e && e.message ? e.message : String(e);
  }

  return { deleted, failed, automationRollback };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceUrl = assertSumahonUrl(args.url);
  const config = await loadAutomationConfig();
  const currentBranch = await getCurrentBranch();
  const baseSlug = slugifyFromUrl(sourceUrl, "sumahon-topic");
  const slug = await uniqueSlug(baseSlug);
  const branchName = makeBranchName(slug);

  console.log(`Current branch: ${currentBranch}`);
  console.log(`Preview branch: ${branchName}`);
  await assertNoTrackedChanges();

  const source = await fetchSource(sourceUrl);
  const classification = classifyTopic(source);
  const generated = generateExplainer({ source, classification, slug });
  const initialReview = reviewArticle({ mdx: generated.mdx, source, generated });
  const revision = reviseArticle({ mdx: generated.mdx, review: initialReview });
  const finalGenerated = { ...generated, mdx: revision.mdx };
  const finalReview = reviewArticle({ mdx: revision.mdx, source, generated: finalGenerated });
  const articleBrief = generateArticleBrief({ source, classification, generated: finalGenerated });
  const thumbnailBrief = generateThumbnailBrief({ source, classification, generated: finalGenerated });
  const thumbnailPrompt = generateThumbnailPrompt(thumbnailBrief, {
    thumbnailNewChatUrl: config.chatgptTargets.thumbnailNewChatUrl,
  });
  const handoffPaths = buildHandoffPaths({ slug, config });
  const articlePrompt = generateArticlePrompt({ articleBrief, thumbnailBrief, config });
  const handoffMarkdown = generateHandoffMarkdown({ source, slug, paths: handoffPaths, config });
  const chromeStepsMarkdown = generateChromeStepsMarkdown({ slug, paths: handoffPaths, config });

  await createPreviewBranch(branchName);

  const mdxPath = await writeMdx({ slug, mdx: revision.mdx });

  const sourceLogPath = path.join("logs", "source", `${slug}.json`);
  const initialReviewPath = path.join("logs", "review", `${slug}.initial.json`);
  const finalReviewPath = path.join("logs", "review", `${slug}.final.json`);
  const factcheckPath = path.join("logs", "factcheck", `${slug}.json`);
  const previewLogPath = path.join("logs", "preview", `${slug}.json`);
  const articleBriefPath = handoffPaths.articleBriefPath;
  const articlePromptPath = handoffPaths.articlePromptPath;
  const thumbnailBriefPath = handoffPaths.thumbnailBriefPath;
  const thumbnailPromptPath = handoffPaths.thumbnailPromptPath;
  const handoffPath = handoffPaths.handoffPath;
  const chromeStepsPath = handoffPaths.chromeStepsPath;
  const humanReviewRequired = !finalReview.publishable || finalReview.findings.length > 0;
  const doNotPublish = !finalReview.publishable;

  await writeJson(sourceLogPath, {
    sourceMedia: source.sourceMedia,
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    sourcePublishedAt: source.sourcePublishedAt,
    detectedAt: new Date().toISOString(),
    keyPoints: source.keyPoints,
    note: "元記事本文の丸ごと保存はしない。話題発見と要点確認のための最小メモのみ保存。",
  });
  await writeJson(initialReviewPath, initialReview);
  await writeJson(finalReviewPath, finalReview);
  await writeJson(articleBriefPath, articleBrief);
  await writeText(articlePromptPath, articlePrompt);
  await writeJson(thumbnailBriefPath, thumbnailBrief);
  await writeText(thumbnailPromptPath, thumbnailPrompt);
  await writeText(handoffPath, handoffMarkdown);
  await writeText(chromeStepsPath, chromeStepsMarkdown);
  await writeJson(factcheckPath, {
    checkedAt: new Date().toISOString(),
    sourceUrl,
    humanCheckRequired: [
      "公式発表、報道、噂、予測の区別",
      "価格、発売日、対応機種、提供地域、キャンペーンの最新確認",
      "一次ソースが存在する場合の内容確認",
    ],
    blockingRisk: !finalReview.publishable,
    provisionalDecision: finalReview.provisionalDecision,
  });
  const automationPaths = await updateAutomationData({ sourceUrl, classification, slug, generated });

  const generatedFiles = [
    mdxPath,
    sourceLogPath,
    initialReviewPath,
    finalReviewPath,
    articleBriefPath,
    articlePromptPath,
    thumbnailBriefPath,
    thumbnailPromptPath,
    handoffPath,
    chromeStepsPath,
    factcheckPath,
    previewLogPath,
    ...automationPaths,
  ];

  console.log("Running build...");
  await runCommand(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
    env: { ...process.env, SUMALABO_BUILD_TARGET: "preview" },
  });

  await writeJson(previewLogPath, {
    branchName,
    articlePath: mdxPath,
    expectedPreview: `Cloudflare Pages will create a preview deployment for branch ${branchName}.`,
    checkUrls: [
      `/articles/${slug}/`,
      "/articles/",
      "/categories/news/",
      "/",
    ],
    publishable: finalReview.publishable,
    provisionalDecision: finalReview.provisionalDecision,
    humanReviewRequired,
    doNotPublish,
    previewCreated: true,
    previewPolicy: "buildが成功した記事は、本番公開可否に関係なくCloudflare Pages Previewへ送り、最後に人間がファクトチェックと公開判断を行う。",
    encodingNote: "PowerShellでJSONを確認する場合は Get-Content -Encoding UTF8 を推奨。",
    thumbnailPrompt: generated.thumbnailPrompt,
    thumbnailBriefPath,
    thumbnailPromptPath,
    thumbnailHeadlineIdeas: thumbnailBrief.headlineIdeas,
    thumbnailSublineIdeas: thumbnailBrief.sublineIdeas,
    thumbnailCoreIdea: thumbnailBrief.coreIdea,
    chatgptHandoff: {
      articleProjectUrl: config.chatgptTargets.articleProjectUrl,
      articlePromptPath,
      generatedDraftPath: handoffPaths.generatedDraftPath,
      materialsDraftPath: handoffPaths.materialsDraftPath,
      finalThumbnailPromptPath: handoffPaths.finalThumbnailPromptPath,
      thumbnailNewChatUrl: config.chatgptTargets.thumbnailNewChatUrl,
      thumbnailAttach: config.thumbnailAttach,
      thumbnailPromptPath,
      thumbnailOutputPath: handoffPaths.thumbnailOutputPath,
      handoffPath,
      chromeStepsPath,
      browser: config.browserPolicy.useBrowser,
      doNotUse: config.browserPolicy.doNotUse,
      refinementReminder: "ChatGPTの初稿をそのまま保存せず、Claude in Chromeが精錬後の最終稿だけを指定パスへ保存します。",
      materialsReminder: "最終稿本文とは別に、Claude in Chromeがブログ化用の資料一式を drafts/materials/{slug}.materials.md に保存します。本文ファイルとは混ぜません。",
      thumbnailPromptReminder: "logs/thumbnail/{slug}.prompt.md は初期サムネイル案です。最終版は台本チャットで作り、drafts/materials/{slug}.thumbnail-prompt.md に保存します。",
      thumbnailImageReminder: "サムネイル画像生成は毎回新規ChatGPTチャットで行います。Chromeウィンドウの可視タブが新規タブであり、Chromeをフォアグラウンド化していること。「＋」と「写真とファイルを追加」を画面上の実UIでクリックし、OSダイアログ #32770 が出てからUWSCでベース画像2枚を添付します。生成画像はD:\\downloadsへ保存される想定で、後で public/images/thumbnails/ へ移動・リネームしてください。",
      thumbnailRetryPolicy: "UWSC添付が1回で成功しなかった場合は、ダイアログが残っていれば同じUWSCを最大3回まで再実行する。画像生成自体に失敗した場合は、Claude in Chromeが最大3回までプロンプト送信をリトライ（1・2回目は同一、3回目は簡略版）。3回失敗で「サムネイル生成失敗・最終確認待ち」として記録する。",
      browserClickPolicy: "hidden file inputの直接クリック、JavaScriptでのfile input直接発火、file_upload APIは使わない。「＋」も「写真とファイルを追加」も画面上の実UIをクリックする。",
      automatedCompleted: [
        "source取得",
        "分類",
        "MDX下書き生成",
        "review / revise",
        "npm run build",
      ],
      nextClaudeInChrome: [
        "必要に応じてChatGPT台本チャットで本文・資料・最終版サムネイルプロンプトを再生成する",
        "ChatGPT回答完了を待ち、全文コピーして指定パスへ保存する",
        "保存後、ファイル存在と内容の完了を自動確認する",
        "サムネイル画像生成専用の新規ChatGPTチャットを開く（使い回し禁止）",
        "新規タブをChromeウィンドウの可視タブにし、ChromeをSetForegroundWindowでフォアグラウンド化する",
        "「＋」→「写真とファイルを追加」を実UIでクリックする",
        "OSダイアログ #32770 をポーリングし、出現確認後にUWSCを実行してベース画像2枚を添付する",
        "添付2件確認後、最終版サムネイルプロンプトを送信する",
        "画像生成完了後、ダウンロードして public/images/thumbnails/ へ移動・リネームする",
        "添付・生成失敗時は最大3回まで自動リトライし、失敗時は最終確認待ちとして記録する",
      ],
      nextClaudeCode: [
        "生成ファイルを読み込み、MDX化・サムネ反映・build・preview pushを実行する",
      ],
      humanFinalReview: [
        "公式情報と矛盾していないか",
        "未確定情報を断定していないか",
        "料金・日付・対象プランなどが最新か",
        "画像・サムネイルに問題がないか",
        "公開してよいか",
      ],
    },
    xPostDraft: generated.xPostDraft,
  });

  if (!finalReview.publishable) {
    console.log("Build succeeded. Review marked this article as not publishable, but preview push will continue for final human fact-check and publish decision.");
  }

  // === Quality gate ===
  // rule-based generator が薄い記事 (タイトルだけ・定型句・参考情報なし) を作るケースが
  // 2026-05-12 で 3 件 (Galaxy / Pixel / Apple spatial iPhone) 観測されたため、
  // commitAndPushPreview の直前で必ず通す publish gate を追加。
  //   - jpChars < 1500 / h2 < 3 / 参考情報セクション無し / URL < 2 / placeholder /
  //     filler フレーズ多数 のいずれかで blocking
  //   - 失敗時は exit code 2 (= needs_regeneration) で抜ける
  //   - sumahon-watch 側で exit 2 を捕捉し status=needs_regeneration として記録する
  const mdxRaw = await fsReadFile(mdxPath, "utf-8");
  const mdxFm = mdxRaw.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n([\s\S]*)$/);
  const mdxBody = mdxFm ? mdxFm[1] : mdxRaw;
  const publishGate = validateForAutomatedPublish(mdxBody, {
    frontmatterTitle: generated.title,
    isReporting: classification.articleType === "news" || true,
  });

  if (!publishGate.ok) {
    console.error("[publish-gate] BLOCKED: article fails automated publish gate; not pushing.");
    console.error(JSON.stringify({
      slug,
      branchName,
      mdxPath,
      blockingReasons: publishGate.blockingReasons,
      warningReasons: publishGate.warningReasons,
      metrics: publishGate.metrics,
      action: "needs_regeneration",
      note: "Article body is too thin or missing required sections for automated publication. Regenerate via the proper article-generation flow (ChatGPT/Claude refinement) instead of rule-based generator alone.",
    }, null, 2));

    // === A2 cleanup ===
    // 旧版コメント (「作業ファイル … は untracked のまま残るが … tracked dirty
    // にはならない」) は誤り。untracked のまま残ると、後段で wrangler build が
    // 拾って production に shipped する事故 (2026-05-13 gpt-5-5 / evan-blass)
    // が起きるため、本 run が書いた per-article 成果物を全削除する。
    // automation ledger (processed-urls.json / topic-ledger.json) は当該 entry
    // のみ rollback (ファイルそのものは保持)。
    const cleanup = await cleanupOnPublishGateBlock({
      filesToDelete: [
        mdxPath,
        sourceLogPath,
        initialReviewPath,
        finalReviewPath,
        articleBriefPath,
        articlePromptPath,
        thumbnailBriefPath,
        thumbnailPromptPath,
        handoffPath,
        chromeStepsPath,
        factcheckPath,
        previewLogPath,
      ],
      sourceUrl,
      slug,
    });
    console.error("[publish-gate] cleanup:" + JSON.stringify(cleanup));

    // ベストエフォートで main に戻す (auto/sumahon-* 居残り回避、
    // 2026-05-13 03:00 / 04:00 / 05:00 の連続失敗で観測)。
    // checkout が万一失敗しても exit code 2 (needs_regeneration) は保つ。
    try {
      await runCommand("git", ["checkout", currentBranch || "main"], { stdio: "inherit" });
    } catch (e) {
      console.warn("[publish-gate] best-effort checkout failed:", e && e.message ? e.message : e);
    }
    process.exit(2);
  }

  if (publishGate.warningReasons.length > 0) {
    console.warn("[publish-gate] WARNINGS (non-blocking):", publishGate.warningReasons.join("; "));
  }

  await commitAndPushPreview({
    files: generatedFiles,
    message: "feat(article): add preview draft from sumahon topic",
    branchName,
  });

  console.log(JSON.stringify({
    sourceUrl,
    generatedTitle: generated.title,
    classification: classification.sumalaboUse,
    priority: classification.priority,
    mdxPath,
    logs: {
      sourceLogPath,
      initialReviewPath,
      finalReviewPath,
      factcheckPath,
      previewLogPath,
      articleBriefPath,
      articlePromptPath,
      thumbnailBriefPath,
      thumbnailPromptPath,
      handoffPath,
      chromeStepsPath,
    },
    chatgptHandoff: {
      articleProjectUrl: config.chatgptTargets.articleProjectUrl,
      articlePromptPath,
      generatedDraftPath: handoffPaths.generatedDraftPath,
      materialsDraftPath: handoffPaths.materialsDraftPath,
      finalThumbnailPromptPath: handoffPaths.finalThumbnailPromptPath,
      thumbnailNewChatUrl: config.chatgptTargets.thumbnailNewChatUrl,
      thumbnailAttach: config.thumbnailAttach,
      thumbnailPromptPath,
      thumbnailOutputPath: handoffPaths.thumbnailOutputPath,
      handoffPath,
      chromeStepsPath,
      browser: config.browserPolicy.useBrowser,
      doNotUse: config.browserPolicy.doNotUse,
      refinementReminder: "ChatGPTの初稿をそのまま保存せず、Claude in Chromeが精錬後の最終稿だけを指定パスへ保存します。",
      materialsReminder: "最終稿本文とは別に、Claude in Chromeがブログ化用の資料一式を drafts/materials/{slug}.materials.md に保存します。本文ファイルとは混ぜません。",
      thumbnailPromptReminder: "logs/thumbnail/{slug}.prompt.md は初期サムネイル案です。最終版は台本チャットで作り、drafts/materials/{slug}.thumbnail-prompt.md に保存します。",
      thumbnailImageReminder: "サムネイル画像生成は毎回新規ChatGPTチャットで行います。Chromeウィンドウの可視タブが新規タブであり、Chromeをフォアグラウンド化していること。「＋」と「写真とファイルを追加」を画面上の実UIでクリックし、OSダイアログ #32770 が出てからUWSCでベース画像2枚を添付します。生成画像はD:\\downloadsへ保存される想定で、後で public/images/thumbnails/ へ移動・リネームしてください。",
      thumbnailRetryPolicy: "UWSC添付が1回で成功しなかった場合は、ダイアログが残っていれば同じUWSCを最大3回まで再実行する。画像生成自体に失敗した場合は、Claude in Chromeが最大3回までプロンプト送信をリトライ（1・2回目は同一、3回目は簡略版）。3回失敗で「サムネイル生成失敗・最終確認待ち」として記録する。",
      browserClickPolicy: "hidden file inputの直接クリック、JavaScriptでのfile input直接発火、file_upload APIは使わない。「＋」も「写真とファイルを追加」も画面上の実UIをクリックする。",
      automatedCompleted: [
        "source取得",
        "分類",
        "MDX下書き生成",
        "review / revise",
        "npm run build",
      ],
      nextClaudeInChrome: [
        "必要に応じてChatGPT台本チャットで本文・資料・最終版サムネイルプロンプトを再生成する",
        "ChatGPT回答完了を待ち、全文コピーして指定パスへ保存する",
        "保存後、ファイル存在と内容の完了を自動確認する",
        "サムネイル画像生成専用の新規ChatGPTチャットを開く（使い回し禁止）",
        "新規タブをChromeウィンドウの可視タブにし、ChromeをSetForegroundWindowでフォアグラウンド化する",
        "「＋」→「写真とファイルを追加」を実UIでクリックする",
        "OSダイアログ #32770 をポーリングし、出現確認後にUWSCを実行してベース画像2枚を添付する",
        "添付2件確認後、最終版サムネイルプロンプトを送信する",
        "画像生成完了後、ダウンロードして public/images/thumbnails/ へ移動・リネームする",
        "添付・生成失敗時は最大3回まで自動リトライし、失敗時は最終確認待ちとして記録する",
      ],
      nextClaudeCode: [
        "生成ファイルを読み込み、MDX化・サムネ反映・build・preview pushを実行する",
      ],
      humanFinalReview: [
        "公式情報と矛盾していないか",
        "未確定情報を断定していないか",
        "料金・日付・対象プランなどが最新か",
        "画像・サムネイルに問題がないか",
        "公開してよいか",
      ],
    },
    thumbnail: {
      headlineIdeas: thumbnailBrief.headlineIdeas,
      sublineIdeas: thumbnailBrief.sublineIdeas,
      coreIdea: thumbnailBrief.coreIdea,
      briefPath: thumbnailBriefPath,
      promptPath: thumbnailPromptPath,
    },
    branchName,
    previewCreated: true,
    publishable: finalReview.publishable,
    humanReviewRequired,
    doNotPublish,
    provisionalDecision: finalReview.provisionalDecision,
    publishAt: generated.publishAt,
    updated: todayJst(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
