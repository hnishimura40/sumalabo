#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { importGeneratedArticle } from "../sumahon/import-generated-article.mjs";
import { notifyReviewReady } from "../sumahon/notify-review-ready.mjs";
import { writeMdx } from "../sumahon/write-mdx.mjs";
import { assertNoTrackedChanges, commitAndPushPreview, createPreviewBranch, getCurrentBranch } from "../sumahon/push-preview.mjs";
import {
  parseArgs,
  readJson,
  runCommand,
  todayJst,
  writeJson,
} from "../sumahon/utils.mjs";
import { findEntryBySlug, updateStatus, PATHS as QUEUE_PATHS } from "../sumahon/queue-store.mjs";
import { readProof, validateProof, proofPath } from "../sumahon/phase-b-proof.mjs";
import { verifyPreviewUrl } from "../sumahon/verify-preview-url.mjs";
import { deployPreviewToCloudflarePages } from "../sumahon/cloudflare-pages-deploy.mjs";

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

  // === Phase B proof gate ===
  // queue にこの slug の entry があり、再生成パイプライン経由
  // (status === "awaiting_chatgpt_generation" or "awaiting_import") の場合、
  // logs/automation/{slug}.phase-b-proof.json を読んで Chrome MCP + ChatGPT で
  // Phase B を実際に通った証跡を確認する。
  //
  // 証跡が無い / completed!==true / 必須メタが欠けている → blocking 終了。
  // queue は awaiting_chatgpt_generation に戻し、Phase B やり直しを促す。
  //
  // 通常の手動 import (queue に該当 slug 無し or 別 status) はゲート対象外。
  //
  // 注意: このゲートは assertNoTrackedChanges() より前に置く。working tree が
  // 汚れている状態でも証跡不足は最初に検知して止めるべきで、また smoke test 時に
  // 自己のスクリプト変更で弾かれて gate が動かないという矛盾を避けるため。
  const queueEntry = await findEntryBySlug(slug);
  const regenerationStatuses = ["awaiting_chatgpt_generation", "awaiting_import"];
  if (queueEntry && regenerationStatuses.includes(queueEntry.status)) {
    const proof = await readProof(slug);
    const verdict = validateProof(proof);
    if (!verdict.ok) {
      console.error("[phase-b-proof] BLOCKED: Phase B 証跡が不足しているため import を中止します。");
      console.error(JSON.stringify({
        slug,
        proofPath: proofPath(slug),
        queueStatus: queueEntry.status,
        blockingReasons: verdict.blockingReasons,
        warningReasons: verdict.warningReasons,
        action: "queue is rolled back to awaiting_chatgpt_generation; please run Phase B (Chrome MCP + ChatGPT) properly and record the proof.",
      }, null, 2));
      // queue 状態を awaiting_chatgpt_generation に戻す（Phase A 成果物は保持）
      await updateStatus(queueEntry.url, {
        status: "awaiting_chatgpt_generation",
        phaseB_gate_blocked_at: new Date().toISOString(),
        phaseB_gate_blocking_reasons: verdict.blockingReasons,
      });
      process.exit(2);
    }
    if (verdict.warningReasons.length > 0) {
      console.warn("[phase-b-proof] warnings:", verdict.warningReasons.join("; "));
    }
    console.log("[phase-b-proof] PASS:", proofPath(slug));
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
  const articleQualityCheck = imported.review.articleQualityCheck || {
    ok: true,
    titleDuplicate: false,
    markdownResidue: false,
    characterPresence: "n/a",
    boxHeadingWarnings: [],
    articleStructure: "ok",
    issues: [],
    reasons: [],
  };
  const sourceCheckPassed = !!sourceCheck.ok;
  const articleQualityPassed = !!articleQualityCheck.ok;
  // blocking条件: sourceCheck NG または articleQualityCheck NG（titleDuplicate / markdownResidue）
  const overallBlocking = !sourceCheckPassed || !articleQualityPassed;
  const blockingRisk = overallBlocking;
  const provisionalDecision = overallBlocking ? "要修正" : imported.review.provisionalDecision;
  const publishable = !overallBlocking && imported.review.publishable;
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

  if (overallBlocking) {
    if (!sourceCheckPassed) {
      console.log("source check failed:");
      for (const reason of sourceCheck.reasons || [sourceCheck.notes]) {
        console.log("  - " + reason);
      }
    }
    if (!articleQualityPassed) {
      console.log("article quality check failed:");
      for (const reason of articleQualityCheck.reasons || []) {
        console.log("  - " + reason);
      }
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
      articleQualityCheck,
      blockingRisk,
      publishable,
      provisionalDecision,
    });
    await writeJson(factcheckPath, {
      checkedAt: new Date().toISOString(),
      sourceUrl: sourceLog?.sourceUrl || articleBrief.sourceUrl,
      humanCheckRequired: factcheckHumanCheckRequired,
      issues: imported.review.issues.filter((issue) =>
        [
          "source_respect",
          "missing_reference_section",
          "insufficient_reference_urls",
          "sumahon_public_exposure",
          "missing_reporting_notice",
          "title_h1_in_body",
          "title_repeated_at_top",
          "markdown_residue",
          "character_missing_for_news",
          "box_heading_too_large",
          "article_starts_with_structure",
          "article_intro_too_short",
        ].includes(issue.code),
      ),
      provisionalDecision,
      blockingRisk,
      sourceCheck,
      articleQualityCheck,
      materials: resolvedMaterialsInfo,
    });
    await writeJson(previewLogPath, {
      branchName: null,
      articlePath: null,
      generatedDraftPath: filePath,
      materialsPath: resolvedMaterialsInfo?.path || "",
      expectedPreview: "Preview deployment skipped: sourceCheck or articleQualityCheck failed.",
      checkUrls: [],
      publishable,
      provisionalDecision,
      humanReviewRequired: true,
      doNotPublish,
      blockingRisk,
      previewCreated: false,
      sourceCheck,
      articleQualityCheck,
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
      articleQualityPassed,
      titleDuplicate: !!articleQualityCheck.titleDuplicate,
      markdownResidue: !!articleQualityCheck.markdownResidue,
      characterPresence: articleQualityCheck.characterPresence,
      boxHeadingWarnings: articleQualityCheck.boxHeadingWarnings || [],
      articleStructure: articleQualityCheck.articleStructure,
      articleQualityReasons: articleQualityCheck.reasons || [],
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
    articleQualityCheck,
    blockingRisk,
    publishable,
    provisionalDecision,
  });
  await writeJson(factcheckPath, {
    checkedAt: new Date().toISOString(),
    sourceUrl: sourceLog?.sourceUrl || articleBrief.sourceUrl,
    humanCheckRequired: factcheckHumanCheckRequired,
    issues: imported.review.issues.filter((issue) =>
      [
        "source_respect",
        "missing_reference_section",
        "insufficient_reference_urls",
        "sumahon_public_exposure",
        "missing_reporting_notice",
        "title_h1_in_body",
        "title_repeated_at_top",
        "markdown_residue",
        "character_missing_for_news",
        "box_heading_too_large",
        "article_starts_with_structure",
        "article_intro_too_short",
      ].includes(issue.code),
    ),
    provisionalDecision,
    blockingRisk,
    sourceCheck,
    articleQualityCheck,
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
    articleQualityCheck,
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

  // Cloudflare Pages へ preview を direct-upload (wrangler pages deploy).
  // 背景: このリポジトリの CF Pages は GitHub Apps 連携を使っておらず、
  // PR ブランチに自動 preview deploy が生成されない (PR #40 で発覚)。そのため
  // ここで明示的に `wrangler pages deploy dist --branch <branchName>` を叩いて
  // preview URL を取得し、それを notifyReviewReady に渡す。
  //
  // CLOUDFLARE_API_TOKEN が未設定なら ok:false で帰ってくる。その場合は
  // verifier 側で production URL が SPA fallback と判定されて notify が止まる
  // ので、購読者に壊れた URL を配ることはない (preview_unavailable に降格)。
  let cfDeployResult = null;
  try {
    cfDeployResult = await deployPreviewToCloudflarePages({
      distDir: "dist",
      branch: branchName,
      commitMessage: `import ${slug}`,
    });
  } catch (err) {
    cfDeployResult = {
      ok: false,
      reason: "deploy_threw",
      error: String(err && err.message ? err.message : err),
    };
  }
  if (cfDeployResult?.ok) {
    console.log(`[cf-pages-deploy] OK: ${cfDeployResult.previewUrl}${cfDeployResult.branchAliasUrl ? " (alias: " + cfDeployResult.branchAliasUrl + ")" : ""}`);
  } else {
    console.warn(`[cf-pages-deploy] FAILED reason=${cfDeployResult?.reason || "unknown"}; notify will fall through to verifier guard.`);
  }

  // 通知に使う previewUrl の決定順:
  //  1. CF wrangler deploy が成功 → そのコミット specific URL
  //  2. SUMALABO_PREVIEW_BASE_URL 環境変数指定があればそれを使う (alias 等)
  //  3. fallback: production の sumalabo.com (verifier が SPA fallback を弾く)
  let resolvedPreviewUrl;
  if (cfDeployResult?.ok && cfDeployResult.previewUrl) {
    const base = cfDeployResult.previewUrl.replace(/\/+$/, "");
    resolvedPreviewUrl = `${base}/articles/${slug}/`;
  } else if (typeof process.env.SUMALABO_PREVIEW_BASE_URL === "string" && process.env.SUMALABO_PREVIEW_BASE_URL) {
    resolvedPreviewUrl = `${process.env.SUMALABO_PREVIEW_BASE_URL.replace(/\/+$/, "")}/articles/${slug}/`;
  } else {
    resolvedPreviewUrl = `https://sumalabo.com/articles/${slug}/`;
  }

  const notifyItem = {
    slug,
    title: imported.title,
    branch: branchName,
    previewUrl: resolvedPreviewUrl,
    prUrl: typeof process.env.SUMALABO_PR_URL === "string" ? process.env.SUMALABO_PR_URL : undefined,
    thumbnail: imported.thumbnail || undefined,
    status: "review",
    sourceCheckPassed,
  };

  // Preview URL 健全性チェック (verify-preview-url.mjs)。
  // CF deploy が成功してもまだ伝播待ちの可能性があるので、最大 4 回まで
  // 短く再試行する。
  let previewVerification = null;
  const VERIFY_ATTEMPTS = cfDeployResult?.ok ? 4 : 1;
  for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++) {
    try {
      previewVerification = await verifyPreviewUrl({
        url: notifyItem.previewUrl,
        slug,
        titlePrefix: (imported.title || "").slice(0, 16),
      });
    } catch (err) {
      previewVerification = {
        ok: false,
        reason: "verifier_threw",
        error: String(err && err.message ? err.message : err),
        url: notifyItem.previewUrl,
        evidence: {},
      };
    }
    if (previewVerification?.ok) break;
    if (attempt < VERIFY_ATTEMPTS) {
      console.log(`[preview-verify] attempt ${attempt}/${VERIFY_ATTEMPTS} failed (${previewVerification?.reason || "unknown"}); waiting 6s for CF propagation...`);
      await new Promise((r) => setTimeout(r, 6000));
    }
  }

  let notifyResult;
  if (!previewVerification || !previewVerification.ok) {
    notifyResult = {
      ok: false,
      skipped: true,
      reason: "preview_unavailable",
      message:
        `Preview URL verification failed: ${previewVerification?.reason || "unknown"}. ` +
        `URL=${notifyItem.previewUrl}. Notification suppressed to avoid sending purchasers to a SPA fallback page.`,
      meta: { item: notifyItem, previewVerification },
    };
    console.warn(`[preview-verify] BLOCKED notify: ${notifyResult.message}`);
    console.warn(`[preview-verify] evidence:`, JSON.stringify(previewVerification?.evidence || {}));
    // Roll the queue entry back so it doesn't sit in "preview_created" lying about reality.
    if (queueEntry) {
      try {
        await updateStatus(queueEntry.url, {
          status: "preview_unavailable",
          previewUnavailableAt: new Date().toISOString(),
          previewUnavailableReason: notifyResult.message.slice(0, 800),
          previewVerification: previewVerification ? {
            ok: previewVerification.ok,
            reason: previewVerification.reason,
            status: previewVerification.status,
            url: previewVerification.url,
            evidence: previewVerification.evidence,
          } : null,
        });
      } catch (err) {
        console.warn("warning: failed to roll queue entry to preview_unavailable:", err && err.message ? err.message : err);
      }
    }
  } else {
    console.log(`[preview-verify] OK: ${notifyItem.previewUrl} (title="${previewVerification.evidence?.titleSeen?.slice(0, 60) || ""}")`);
    try {
      notifyResult = await notifyReviewReady({ item: notifyItem });
    } catch (err) {
      notifyResult = { ok: false, error: String(err && err.message ? err.message : err), message: "notifyReviewReady threw unexpectedly.", meta: { item: notifyItem } };
    }
  }
  const notifyLogPath = path.join("logs", "preview", `${slug}.notify.json`);
  try {
    await writeJson(notifyLogPath, {
      ...notifyResult,
      previewVerification,
      cfDeploy: cfDeployResult ? {
        ok: cfDeployResult.ok,
        reason: cfDeployResult.reason || null,
        previewUrl: cfDeployResult.previewUrl || null,
        branchAliasUrl: cfDeployResult.branchAliasUrl || null,
        durationMs: cfDeployResult.durationMs || null,
        evidence: cfDeployResult.evidence || null,
      } : null,
    });
  } catch (err) {
    console.warn(`warning: failed to write notify log to ${notifyLogPath}:`, err && err.message ? err.message : err);
  }
  if (!notifyResult.ok) {
    if (notifyResult.skipped) {
      console.warn(`warning: PWA notification skipped (${notifyResult.reason}): ${notifyResult.message || ""}`);
    } else {
      console.warn(`warning: PWA notification failed (status=${notifyResult.status || 0}): ${notifyResult.message || notifyResult.error || ""}`);
    }
  } else {
    console.log(`PWA notification sent: subscribers=${notifyResult.response?.subscribers ?? "?"} sent=${notifyResult.response?.sent ?? "?"} failed=${notifyResult.response?.failed ?? "?"}`);
  }

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
    articleQualityPassed,
    titleDuplicate: !!articleQualityCheck.titleDuplicate,
    markdownResidue: !!articleQualityCheck.markdownResidue,
    characterPresence: articleQualityCheck.characterPresence,
    boxHeadingWarnings: articleQualityCheck.boxHeadingWarnings || [],
    articleStructure: articleQualityCheck.articleStructure,
    articleQualityReasons: articleQualityCheck.reasons || [],
    notifyLogPath,
    notifySent: notifyResult.ok === true,
    notifySkipped: notifyResult.skipped === true,
    notifySubscribers: notifyResult.response?.subscribers,
    notifyDelivered: notifyResult.response?.sent,
    notifyFailed: notifyResult.response?.failed,
    updated: todayJst(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
