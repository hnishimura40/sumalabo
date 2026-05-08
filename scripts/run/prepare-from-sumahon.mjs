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
  const thumbnailPrompt = generateThumbnailPrompt(thumbnailBrief, {
    thumbnailChatUrl: config.chatgptTargets.thumbnailChatUrl,
  });
  const handoffPaths = buildHandoffPaths({ slug, config });
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
    note: "元記事本文の丸ごと保存はしない。ChatGPT 5.5 handoffのための最小メモのみ保存。",
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
    handoffPath: handoffPaths.handoffPath,
    chromeStepsPath: handoffPaths.chromeStepsPath,
    articleProjectUrl: config.chatgptTargets.articleProjectUrl,
    thumbnailChatUrl: `${config.chatgptTargets.thumbnailChatUrl} (参考・例外運用。標準手順では同じ台本チャット内で生成)`,
    browser: config.browserPolicy.useBrowser,
    doNotUse: config.browserPolicy.doNotUse,
    refinementReminder: "ChatGPTの初稿をそのまま保存せず、Claude in Chromeが精錬後の最終稿だけを指定パスへ保存します。",
    materialsReminder: "最終稿本文とは別に、Claude in Chromeがブログ化用の資料一式を drafts/materials/{slug}.materials.md に保存します。本文ファイルとは混ぜません。",
    thumbnailPromptReminder: "logs/thumbnail/{slug}.prompt.md は初期サムネイル案です。最終版は台本チャットで作り、drafts/materials/{slug}.thumbnail-prompt.md に保存します。標準手順では同じ台本チャット内で画像生成まで行います。",
    thumbnailImageReminder: "生成画像はいったん通常のダウンロード先に保存される想定です。後で public/images/thumbnails/ へ移動・リネームしてください。",
    thumbnailRetryPolicy: "サムネイル画像生成でエラーが出た場合は、Claude in Chromeが最大3回まで自動リトライします。1回目・2回目は同じプロンプト、3回目は簡略版プロンプトで再試行します。3回失敗した場合はサムネイル生成失敗・最終確認待ちとして残します。",
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
      "初稿を精錬し、最終稿だけを全文コピーして drafts/generated へ保存する",
      "保存後、ファイル存在と本文の完了を自動確認する",
      "ブログ化用資料一式を生成し、drafts/materials に保存・自動確認する",
      "最終版サムネイルプロンプトを生成し、drafts/materials/*.thumbnail-prompt.md に保存・自動確認する",
      "同じ台本チャット内でサムネイル画像を生成し、ダウンロード完了を自動確認する",
      "画像生成失敗時は最大3回まで自動リトライし、失敗時は最終確認待ちとして記録する",
      "画像を public/images/thumbnails/ へ移動・リネームする",
    ],
    nextClaudeCode: [
      "article:import-generated でMDX化する",
      "サムネイルが配置済みなら記事frontmatterへ反映する",
      "review / factcheck / previewログを保存する",
      "npm run build を実行する",
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
