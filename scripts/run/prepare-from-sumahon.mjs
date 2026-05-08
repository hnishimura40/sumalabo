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
    thumbnailBriefPath: handoffPaths.thumbnailBriefPath,
    thumbnailPromptPath: handoffPaths.thumbnailPromptPath,
    thumbnailOutputPath: handoffPaths.thumbnailOutputPath,
    handoffPath: handoffPaths.handoffPath,
    chromeStepsPath: handoffPaths.chromeStepsPath,
    articleProjectUrl: config.chatgptTargets.articleProjectUrl,
    thumbnailChatUrl: config.chatgptTargets.thumbnailChatUrl,
    browser: config.browserPolicy.useBrowser,
    doNotUse: config.browserPolicy.doNotUse,
    refinementReminder: "ChatGPTの初稿をそのまま保存せず、精錬後の最終稿だけを保存してください。",
    nextAction: "Chromeでhandoff手順に沿ってChatGPT 5.5へpromptを貼り付ける。Edgeは使わない。初稿は保存せず、チェック・修正後の最終稿だけを drafts/generated に保存する。",
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
