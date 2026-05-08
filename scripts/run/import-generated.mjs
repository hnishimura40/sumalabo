#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import { importGeneratedArticle } from "../sumahon/import-generated-article.mjs";
import { writeMdx } from "../sumahon/write-mdx.mjs";
import { assertNoTrackedChanges, commitAndPushPreview, createPreviewBranch, getCurrentBranch } from "../sumahon/push-preview.mjs";
import {
  parseArgs,
  readJson,
  runCommand,
  todayJst,
  writeJson,
} from "../sumahon/utils.mjs";

function assertRequired(value, name) {
  if (!value || value === true) {
    throw new Error(`Usage: npm run article:import-generated -- --slug "xxxxx" --file "drafts/generated/xxxxx.md"`);
  }

  return String(value);
}

function makeBranchName(slug) {
  const suffix = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
  return `auto/imported-${slug.slice(0, 48)}-${suffix}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = assertRequired(args.slug, "slug");
  const filePath = assertRequired(args.file, "file");
  const currentBranch = await getCurrentBranch();
  const branchName = makeBranchName(slug);

  console.log(`Current branch: ${currentBranch}`);
  console.log(`Import branch: ${branchName}`);
  await assertNoTrackedChanges();

  if (!existsSync(filePath)) {
    throw new Error(`Generated draft file was not found: ${filePath}`);
  }

  const articleBriefPath = path.join("logs", "brief", `${slug}.article.json`);
  const legacyArticleBriefPath = path.join("logs", "brief", `${slug}.json`);
  const sourceLogPath = path.join("logs", "source", `${slug}.json`);
  const thumbnailBriefPath = path.join("logs", "thumbnail", `${slug}.brief.json`);
  const thumbnailPromptPath = path.join("logs", "thumbnail", `${slug}.prompt.md`);
  const reviewPath = path.join("logs", "review", `${slug}.import.json`);
  const factcheckPath = path.join("logs", "factcheck", `${slug}.import.json`);
  const previewLogPath = path.join("logs", "preview", `${slug}.import.json`);

  const articleBrief = await readJson(articleBriefPath, await readJson(legacyArticleBriefPath, null));
  const sourceLog = await readJson(sourceLogPath, null);
  const thumbnailBrief = await readJson(thumbnailBriefPath, null);

  if (!articleBrief) {
    throw new Error(`Article brief was not found: ${articleBriefPath}`);
  }

  const imported = await importGeneratedArticle({
    slug,
    filePath,
    articleBrief,
    sourceLog,
    thumbnailBrief,
  });

  await createPreviewBranch(branchName);

  const mdxPath = await writeMdx({ slug, mdx: imported.mdx });
  const doNotPublish = !imported.review.publishable;

  await writeJson(reviewPath, {
    ...imported.review,
    sourceUrl: sourceLog?.sourceUrl || articleBrief.sourceUrl,
    articleTitle: imported.title,
    generatedDraftPath: filePath,
    mdxPath,
  });
  await writeJson(factcheckPath, {
    checkedAt: new Date().toISOString(),
    sourceUrl: sourceLog?.sourceUrl || articleBrief.sourceUrl,
    humanCheckRequired: [
      "ChatGPT生成本文の事実関係",
      "公式発表、報道、噂、予測の区別",
      "元記事の長文コピーや近すぎる表現が残っていないか",
      "価格、発売時期、対応機種、日本展開などの最新確認",
    ],
    issues: imported.review.issues.filter((issue) => issue.code === "source_respect"),
    provisionalDecision: imported.review.provisionalDecision,
  });
  await writeJson(previewLogPath, {
    branchName,
    articlePath: mdxPath,
    generatedDraftPath: filePath,
    expectedPreview: `Cloudflare Pages will create a preview deployment for branch ${branchName}.`,
    checkUrls: [
      `/articles/${slug}/`,
      "/articles/",
      "/categories/news/",
      "/",
    ],
    publishable: imported.review.publishable,
    provisionalDecision: imported.review.provisionalDecision,
    humanReviewRequired: imported.review.issues.length > 0,
    doNotPublish,
    previewCreated: true,
    thumbnail: imported.thumbnail,
    thumbnailExists: imported.thumbnailExists,
    thumbnailSourcePath: imported.thumbnailPath,
    thumbnailBriefPath,
    thumbnailPromptPath,
  });

  console.log("Running build...");
  await runCommand(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);

  await commitAndPushPreview({
    files: [
      mdxPath,
      reviewPath,
      factcheckPath,
      previewLogPath,
    ],
    message: `feat(article): import generated draft for ${slug}`,
    branchName,
  });

  console.log(JSON.stringify({
    slug,
    importedTitle: imported.title,
    mdxPath,
    reviewPath,
    factcheckPath,
    previewLogPath,
    branchName,
    commitMessage: `feat(article): import generated draft for ${slug}`,
    publishable: imported.review.publishable,
    doNotPublish,
    provisionalDecision: imported.review.provisionalDecision,
    thumbnail: imported.thumbnail,
    thumbnailExists: imported.thumbnailExists,
    buildChecked: true,
    updated: todayJst(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
