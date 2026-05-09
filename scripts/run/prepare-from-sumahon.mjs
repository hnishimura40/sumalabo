#!/usr/bin/env node
import { fetchSource } from "../sumahon/fetch-source.mjs";
import { classifyTopic } from "../sumahon/classify-topic.mjs";
import { loadAutomationConfig } from "../sumahon/automation-config.mjs";
import { generateArticleBrief } from "../sumahon/generate-article-brief.mjs";
import { generateArticlePrompt } from "../sumahon/generate-article-prompt.mjs";
import { generateExplainer } from "../sumahon/generate-explainer.mjs";
import { buildHandoffPaths, generateChromeStepsMarkdown, generateHandoffMarkdown } from "../sumahon/generate-handoff.mjs";
import { generateThumbnailBrief } from "../sumahon/generate-thumbnail-brief.mjs";
import { generateThumbnailPrompt } from "../sumahon/generate-thumbnail-prompt.mjs";
import { assertNoTrackedChanges, getCurrentBranch } from "../sumahon/push-preview.mjs";
import {
  assertSumahonUrl,
  parseArgs,
  slugifyFromUrl,
  uniqueSlug,
  writeJson,
  writeText,
} from "../sumahon/utils.mjs";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceUrl = assertSumahonUrl(args.url, "article:prepare-from-sumahon");
  const config = await loadAutomationConfig();
  const currentBranch = await getCurrentBranch();
  const baseSlug = slugifyFromUrl(sourceUrl, "sumahon-topic");
  const slug = await uniqueSlug(baseSlug);

  console.log(`Current branch: ${currentBranch}`);
  console.log(`Preparing ChatGPT handoff for: ${slug}`);
  await assertNoTrackedChanges();

  const source = await fetchSource(sourceUrl);
  const classification = classifyTopic(source);
  const generated = generateExplainer({ source, classification, slug });
  const articleBrief = generateArticleBrief({ source, classification, generated });
  const thumbnailBrief = generateThumbnailBrief({ source, classification, generated });
  const handoffPaths = buildHandoffPaths({ slug, config });
  const thumbnailPrompt = generateThumbnailPrompt(thumbnailBrief, {
    himariBaseImagePath: handoffPaths.himariBaseImagePath,
    labomaruBaseImagePath: handoffPaths.labomaruBaseImagePath,
  });
  const articlePrompt = generateArticlePrompt({ articleBrief, thumbnailBrief, config });
  const handoffMarkdown = generateHandoffMarkdown({ source, slug, paths: handoffPaths, config });
  const chromeStepsMarkdown = generateChromeStepsMarkdown({ slug, paths: handoffPaths, config });
  const sourceLogPath = `logs/source/${slug}.json`;

  await writeJson(sourceLogPath, {
    sourceMedia: source.sourceMedia,
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    sourcePublishedAt: source.sourcePublishedAt,
    detectedAt: new Date().toISOString(),
    keyPoints: source.keyPoints,
    note: "元記事本文を丸ごと保存しない。ChatGPT 5.5 handoffのための最小メモのみ保存。",
  });
  await writeJson(handoffPaths.articleBriefPath, articleBrief);
  await writeText(handoffPaths.articlePromptPath, articlePrompt);
  await writeJson(handoffPaths.thumbnailBriefPath, thumbnailBrief);
  await writeText(handoffPaths.thumbnailPromptPath, thumbnailPrompt);
  await writeText(handoffPaths.handoffPath, handoffMarkdown);
  await writeText(handoffPaths.chromeStepsPath, chromeStepsMarkdown);

  console.log(JSON.stringify({
    sourceUrl,
    slug,
    generatedTitle: generated.title,
    classification: classification.sumalaboUse,
    priority: classification.priority,
    sourceLogPath,
    articleBriefPath: handoffPaths.articleBriefPath,
    articlePromptPath: handoffPaths.articlePromptPath,
    generatedDraftPath: handoffPaths.generatedDraftPath,
    materialsDraftPath: handoffPaths.materialsDraftPath,
    finalThumbnailPromptPath: handoffPaths.finalThumbnailPromptPath,
    thumbnailBriefPath: handoffPaths.thumbnailBriefPath,
    thumbnailPromptPath: handoffPaths.thumbnailPromptPath,
    thumbnailOutputPath: handoffPaths.thumbnailOutputPath,
    himariBaseImagePath: handoffPaths.himariBaseImagePath,
    labomaruBaseImagePath: handoffPaths.labomaruBaseImagePath,
    handoffPath: handoffPaths.handoffPath,
    chromeStepsPath: handoffPaths.chromeStepsPath,
    articleProjectUrl: config.chatgptTargets.articleProjectUrl,
    browser: config.browserPolicy.useBrowser,
    doNotUse: config.browserPolicy.doNotUse,
    thumbnailGenerationPolicy: "サムネイル生成は毎回新しいチャットで行う。サムネイル専用チャットは使い回さない。本文生成用チャットとも分ける。",
    thumbnailBaseImagePolicy: "新しいサムネイル生成チャットで、ひまり・らぼまるのベース絵2枚を毎回アップロードしてから最終版プロンプトを貼る。",
    thumbnailCompositionPolicy: "ひまり・らぼまるは説明中ではなく、記事内容を理解した後の反応を見せる。毎回同じ「これ何？説明して」構図にしない。",
    thumbnailPromptReminder: "logs/thumbnail/{slug}.prompt.md は初期サムネイル案・参考プロンプト。主に使うのは、台本チャットで本文・資料一式を踏まえて作る drafts/materials/{slug}.thumbnail-prompt.md。",
    thumbnailImageReminder: "生成画像はいったん通常のダウンロード先に保存される想定。後で public/images/thumbnails/{slug}.png へ移動・リネームする。",
    thumbnailRetryPolicy: "画像生成失敗時は最大3回まで自動リトライ。1回目・2回目は同じプロンプト、3回目は簡略版プロンプト。3回失敗したら最終確認待ちにする。",
    automatedCompleted: [
      "source取得",
      "分類",
      "article brief生成",
      "article prompt生成",
      "初期サムネイル案・参考プロンプト生成",
      "handoff / chrome-steps生成",
    ],
    nextClaudeInChrome: [
      "Chromeで本文生成用ChatGPTプロジェクトを開く。Edgeは使わない",
      "article promptを貼り、ChatGPT回答完了まで待つ",
      "初稿を精錬し、最終稿だけを drafts/generated へ保存して自動確認する",
      "ブログ化用資料一式を drafts/materials へ保存して自動確認する",
      "最終版サムネイルプロンプトを drafts/materials/*.thumbnail-prompt.md へ保存して自動確認する",
      "Chromeで新しいサムネイル生成チャットを開く",
      "ひまり・らぼまるのベース絵2枚をアップロードする",
      "最終版サムネイルプロンプトを貼って画像生成する",
      "画像生成失敗時は最大3回まで自動リトライする",
      "画像をダウンロードし、public/images/thumbnails/ へ移動・リネームする",
    ],
    nextClaudeCode: [
      "article:import-generated でMDX化する",
      "サムネイルが配置済みなら記事frontmatterへ反映する",
      "review / factcheck / previewログを保存する",
      "npm run buildを実行する",
      "build成功後にpreviewブランチへcommit / pushする",
    ],
    humanFinalReview: [
      "公式情報と矛盾していないか",
      "未確定情報を断定していないか",
      "料金・日付・対象プランなどが最新か",
      "画像・サムネイルに問題がないか",
      "公開してよいか",
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
