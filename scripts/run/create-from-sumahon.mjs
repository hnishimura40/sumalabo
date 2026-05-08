#!/usr/bin/env node
import path from "node:path";
import { fetchSource } from "../sumahon/fetch-source.mjs";
import { classifyTopic } from "../sumahon/classify-topic.mjs";
import { generateExplainer } from "../sumahon/generate-explainer.mjs";
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourceUrl = assertSumahonUrl(args.url);
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

  await createPreviewBranch(branchName);

  const mdxPath = await writeMdx({ slug, mdx: revision.mdx });

  const sourceLogPath = path.join("logs", "source", `${slug}.json`);
  const initialReviewPath = path.join("logs", "review", `${slug}.initial.json`);
  const finalReviewPath = path.join("logs", "review", `${slug}.final.json`);
  const factcheckPath = path.join("logs", "factcheck", `${slug}.json`);
  const previewLogPath = path.join("logs", "preview", `${slug}.json`);
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
    previewPolicy: "buildが成功した記事は、本番公開可否に関係なくCloudflare Pages Previewで人間確認する。",
    encodingNote: "PowerShellでJSONを確認する場合は Get-Content -Encoding UTF8 を推奨。",
    thumbnailPrompt: generated.thumbnailPrompt,
    xPostDraft: generated.xPostDraft,
  });

  if (!finalReview.publishable) {
    console.log("Build succeeded. Review marked this article as not publishable, but preview push will continue for human review.");
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
