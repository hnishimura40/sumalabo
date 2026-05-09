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

function buildChatgptHandoffSummary({ config, handoffPaths, articlePromptPath, thumbnailPromptPath, handoffPath, chromeStepsPath }) {
  return {
    articleProjectUrl: config.chatgptTargets.articleProjectUrl,
    articlePromptPath,
    generatedDraftPath: handoffPaths.generatedDraftPath,
    materialsDraftPath: handoffPaths.materialsDraftPath,
    finalThumbnailPromptPath: handoffPaths.finalThumbnailPromptPath,
    thumbnailPromptPath,
    thumbnailOutputPath: handoffPaths.thumbnailOutputPath,
    himariBaseImagePath: handoffPaths.himariBaseImagePath,
    labomaruBaseImagePath: handoffPaths.labomaruBaseImagePath,
    handoffPath,
    chromeStepsPath,
    browser: config.browserPolicy.useBrowser,
    doNotUse: config.browserPolicy.doNotUse,
    thumbnailGenerationPolicy: "サムネイル生成は毎回新しいチャットで行う。サムネイル専用チャットは使い回さない。本文生成用チャットとも分ける。",
    thumbnailBaseImagePolicy: "新しいサムネイル生成チャットで、ひまり・らぼまるのベース絵2枚を毎回アップロードしてから最終版プロンプトを貼る。",
    thumbnailCompositionPolicy: "ひまり・らぼまるは説明中ではなく、記事内容を理解した後の反応を見せる。毎回同じ「これ何？説明して」構図にしない。",
    thumbnailPromptReminder: "logs/thumbnail/{slug}.prompt.md は初期サムネイル案・参考プロンプト。主に使うのは drafts/materials/{slug}.thumbnail-prompt.md。",
    thumbnailImageReminder: "生成画像はいったん通常のダウンロード先に保存される想定。後で public/images/thumbnails/{slug}.png へ移動・リネームする。",
    thumbnailRetryPolicy: "画像生成失敗時は最大3回まで自動リトライ。1回目・2回目は同じプロンプト、3回目は簡略版プロンプト。3回失敗したら最終確認待ちにする。",
    automatedCompleted: [
      "source取得",
      "分類",
      "MDX下書き生成",
      "review / revise",
      "npm run build",
    ],
    nextClaudeInChrome: [
      "必要に応じてChatGPT台本チャットで本文・資料・最終版サムネイルプロンプトを再生成する",
      "Chromeで新しいサムネイル生成チャットを開く。Edgeは使わない",
      "ひまり・らぼまるのベース絵2枚をアップロードする",
      "最終版サムネイルプロンプトを貼って画像生成する",
      "画像生成失敗時は最大3回まで自動リトライする",
      "画像をダウンロードし、public/images/thumbnails/ へ移動・リネームする",
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
  };
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
  const handoffPaths = buildHandoffPaths({ slug, config });
  const thumbnailPrompt = generateThumbnailPrompt(thumbnailBrief, {
    himariBaseImagePath: handoffPaths.himariBaseImagePath,
    labomaruBaseImagePath: handoffPaths.labomaruBaseImagePath,
  });
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
  await runCommand(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);

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
    chatgptHandoff: buildChatgptHandoffSummary({
      config,
      handoffPaths,
      articlePromptPath,
      thumbnailPromptPath,
      handoffPath,
      chromeStepsPath,
    }),
    xPostDraft: generated.xPostDraft,
  });

  if (!finalReview.publishable) {
    console.log("Build succeeded. Review marked this article as not publishable, but preview push will continue for final human fact-check and publish decision.");
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
    chatgptHandoff: buildChatgptHandoffSummary({
      config,
      handoffPaths,
      articlePromptPath,
      thumbnailPromptPath,
      handoffPath,
      chromeStepsPath,
    }),
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
