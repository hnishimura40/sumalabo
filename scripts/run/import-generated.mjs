#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
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
    throw new Error(`Usage: npm run article:import-generated -- --slug "xxxxx" --file "drafts/generated/xxxxx.md" [--materials "drafts/materials/xxxxx.materials.md"]`);
  }

  return String(value);
}

function optionalPath(value) {
  return value && value !== true ? String(value) : "";
}

function makeBranchName(slug) {
  const suffix = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12);
  return `auto/imported-${slug.slice(0, 48)}-${suffix}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = assertRequired(args.slug, "slug");
  const filePath = assertRequired(args.file, "file");
  const materialsPath = optionalPath(args.materials);

  if (!existsSync(filePath)) {
    throw new Error(`Generated draft file was not found: ${filePath}`);
  }

  if (materialsPath && !existsSync(materialsPath)) {
    throw new Error(`Materials file was not found: ${materialsPath}`);
  }

  const currentBranch = await getCurrentBranch();
  const branchName = makeBranchName(slug);

  console.log(`Current branch: ${currentBranch}`);
  console.log(`Import branch: ${branchName}`);
  await assertNoTrackedChanges();

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

  const resolvedMaterialsInfo = materialsPath
    ? {
        path: materialsPath,
        byteLength: Buffer.byteLength(await readFile(materialsPath, "utf-8"), "utf-8"),
        role: "Claude Codeがブログ記事MDXとして整えるための補助資料。本文には直接混ぜない。",
      }
    : null;

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

  const sourceCheck = imported.review.sourceCheck || {
    ok: false,
    hasReferenceSection: false,
    urlCount: 0,
    containsSumahonPublicReference: false,
    notes: "sourceCheckが計算されていません。",
  };
  const sourceCheckPassed = !!sourceCheck.ok;
  const blockingRisk = !sourceCheckPassed;
  const provisionalDecision = sourceCheckPassed ? imported.review.provisionalDecision : "要修正";
  const publishable = sourceCheckPassed && imported.review.publishable;
  const doNotPublish = !publishable;

  const factcheckHumanCheckRequired = [
    "ChatGPT生成本文の事実関係",
    "公式発表、報道、噂、予測の区別",
    "元記事の長文コピーや近すぎる表現が残っていないか",
    "価格、発売時期、対応機種、日本展開などの最新確認",
    "公式情報と矛盾していないか",
    "元報道の内容を誤って断定していないか",
    "発売日・価格・日本展開・対応機種を断定していないか",
    "公開記事本文・参考情報・リンクにすまほん（smhn.info）が出ていないか",
    "参考情報セクションに公式情報・元報道・関連報道のURLが2件以上あるか",
  ];

  if (!sourceCheckPassed) {
    console.log("source check failed:");
    for (const reason of sourceCheck.reasons || [sourceCheck.notes]) {
      console.log("  - " + reason);
    }
    console.log("Preview branch creation and push are skipped. Fix the article and rerun.");

    await writeJson(reviewPath, {
      ...imported.review,
      sourceUrl: sourceLog?.sourceUrl || articleBrief.sourceUrl,
      articleTitle: imported.title,
      generatedDraftPath: filePath,
      materials: resolvedMaterialsInfo,
      mdxPath: null,
      sourceCheck,
      blockingRisk,
      publishable,
      provisionalDecision,
    });
    await writeJson(factcheckPath, {
      checkedAt: new Date().toISOString(),
      sourceUrl: sourceLog?.sourceUrl || articleBrief.sourceUrl,
      humanCheckRequired: factcheckHumanCheckRequired,
      issues: imported.review.issues.filter((issue) =>
        ["source_respect", "missing_reference_section", "insufficient_reference_urls", "sumahon_public_exposure", "missing_reporting_notice"].includes(issue.code),
      ),
      provisionalDecision,
      blockingRisk,
      sourceCheck,
      materials: resolvedMaterialsInfo,
    });
    await writeJson(previewLogPath, {
      branchName: null,
      articlePath: null,
      generatedDraftPath: filePath,
      materialsPath: resolvedMaterialsInfo?.path || "",
      expectedPreview: "Preview deployment skipped: sourceCheck failed.",
      checkUrls: [],
      publishable,
      provisionalDecision,
      humanReviewRequired: true,
      doNotPublish,
      blockingRisk,
      previewCreated: false,
      sourceCheck,
      thumbnail: imported.thumbnail,
      thumbnailExists: imported.thumbnailExists,
      thumbnailSourcePath: imported.thumbnailPath,
      thumbnailBriefPath,
      thumbnailPromptPath,
      materials: resolvedMaterialsInfo,
    });

    console.log(JSON.stringify({
      slug,
      importedTitle: imported.title,
      mdxPath: null,
      reviewPath,
      factcheckPath,
      previewLogPath,
      materialsPath: resolvedMaterialsInfo?.path || "",
      branchName: null,
      commitMessage: null,
      publishable,
      doNotPublish,
      blockingRisk,
      provisionalDecision,
      thumbnail: imported.thumbnail,
      thumbnailExists: imported.thumbnailExists,
      buildChecked: false,
      previewPushed: false,
      sourceCheckPassed,
      referenceSectionFound: !!sourceCheck.hasReferenceSection,
      referenceUrlCount: sourceCheck.urlCount || 0,
      containsSumahonPublicReference: !!sourceCheck.containsSumahonPublicReference,
      sourceCheckReasons: sourceCheck.reasons || [],
      sourceCheckNotes: sourceCheck.notes || "",
      updated: todayJst(),
    }, null, 2));

    process.exitCode = 1;
    return;
  }

  await createPreviewBranch(branchName);

  const mdxPath = await writeMdx({ slug, mdx: imported.mdx });

  await writeJson(reviewPath, {
    ...imported.review,
    sourceUrl: sourceLog?.sourceUrl || articleBrief.sourceUrl,
    articleTitle: imported.title,
    generatedDraftPath: filePath,
    materials: resolvedMaterialsInfo,
    mdxPath,
    sourceCheck,
    blockingRisk,
    publishable,
    provisionalDecision,
  });
  await writeJson(factcheckPath, {
    checkedAt: new Date().toISOString(),
    sourceUrl: sourceLog?.sourceUrl || articleBrief.sourceUrl,
    humanCheckRequired: factcheckHumanCheckRequired,
    issues: imported.review.issues.filter((issue) =>
      ["source_respect", "missing_reference_section", "insufficient_reference_urls", "sumahon_public_exposure", "missing_reporting_notice"].includes(issue.code),
    ),
    provisionalDecision,
    blockingRisk,
    sourceCheck,
    materials: resolvedMaterialsInfo,
  });
  await writeJson(previewLogPath, {
    branchName,
    articlePath: mdxPath,
    generatedDraftPath: filePath,
    materialsPath: resolvedMaterialsInfo?.path || "",
    expectedPreview: `Cloudflare Pages will create a preview deployment for branch ${branchName}.`,
    checkUrls: [
      `/articles/${slug}/`,
      "/articles/",
      "/categories/news/",
      "/",
    ],
    publishable,
    provisionalDecision,
    humanReviewRequired: imported.review.issues.length > 0,
    doNotPublish,
    blockingRisk,
    previewCreated: true,
    sourceCheck,
    thumbnail: imported.thumbnail,
    thumbnailExists: imported.thumbnailExists,
    thumbnailSourcePath: imported.thumbnailPath,
    thumbnailBriefPath,
    thumbnailPromptPath,
    materials: resolvedMaterialsInfo,
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
    materialsPath: resolvedMaterialsInfo?.path || "",
    branchName,
    commitMessage: `feat(article): import generated draft for ${slug}`,
    publishable,
    doNotPublish,
    blockingRisk,
    provisionalDecision,
    thumbnail: imported.thumbnail,
    thumbnailExists: imported.thumbnailExists,
    buildChecked: true,
    previewPushed: true,
    sourceCheckPassed,
    referenceSectionFound: !!sourceCheck.hasReferenceSection,
    referenceUrlCount: sourceCheck.urlCount || 0,
    containsSumahonPublicReference: !!sourceCheck.containsSumahonPublicReference,
    sourceCheckReasons: sourceCheck.reasons || [],
    sourceCheckNotes: sourceCheck.notes || "",
    updated: todayJst(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
