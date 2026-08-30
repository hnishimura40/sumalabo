#!/usr/bin/env node
// phase-a-finalize.mjs — Phase A 出口の共通処理（どの作り方でも必ずここを通す）。
//
// 背景:
//   記事の作り方（import-generated / 手書き MDX / ChatGPT 制作）が複数あり、
//   Phase A 完了時の「build → preview deploy → 検証 → 通知 → review item → queue」
//   が毎回バラバラに手作業で繋がれ、ローカル URL 通知などの事故が起きていた。
//   本 CLI は Phase A の「出口」を 1 本化する。
//
// やること（順番固定）:
//   1. build（--skip-build で省略可。dist が無ければ必ず build）
//   2. Cloudflare Pages へ preview branch deploy（main は拒否される）
//   3. preview URL を解決（commit 固有 URL を優先）
//   4. preview URL 検証（verifyPreviewUrl: 200 / 実記事 / fallback でない /
//      ローカル URL でない を確認）
//   5. review item 登録 + プレビュー確認待ち通知（notifyReviewReady）
//      ※ローカル/非https URL は notify 側でも二重ガードされ送信されない
//   6. 結果を JSON で報告（logs/preview/{slug}.finalize.json）
//
// 停止（exit code 2 = ブロック / 1 = 引数エラー）:
//   - deploy 失敗（protected_branch / missing token / dist 無し 等）
//   - preview URL 検証失敗（local_preview_url_rejected / http_xxx / title_is_fallback 等）
//   - 通知失敗
//
// 使い方:
//   node scripts/run/phase-a-finalize.mjs \
//     --slug 202605-xxx --title "..." --branch preview/xxx \
//     --prUrl "https://github.com/.../pull/N" \
//     --thumbnail "/images/thumbnails/202605-xxx.webp" \
//     [--status review_waiting] [--skip-build]
//
// 禁止事項（本 CLI は決して行わない）:
//   - main / production への deploy（deployPreviewToCloudflarePages が protected_branch を拒否）
//   - PR merge / production fallback deploy / X 投稿 / queue published 化
//   - secret / token / Deploy Hook URL の出力

import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deployPreviewToCloudflarePages, waitForCloudflarePagesDeployment } from "../sumahon/cloudflare-pages-deploy.mjs";
import { verifyPreviewUrl } from "../sumahon/verify-preview-url.mjs";
import {
  markPendingPublishResolved,
  previewBuildEnvironment,
  previewVerificationPolicy,
  recordPendingPublish,
  waitForPreviewUrl,
} from "../sumahon/preview-publication.mjs";
import { notifyReviewReady } from "../sumahon/notify-review-ready.mjs";
import { validateMainPreviewUrl } from "../sumahon/preview-url-policy.mjs";
import { gate, loadAutonomy, computeVetoDeadline } from "../automation/autonomy.mjs";
import { notifyAutonomyEvent } from "../automation/autonomy-notify.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

function runCommand(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32", ...options });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
}

function currentCommitSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", windowsHide: true });
  return result.status === 0 ? String(result.stdout || "").trim() : null;
}

function preservePending(report, details) {
  try {
    report.pending = recordPendingPublish({ root: ROOT, ...details });
  } catch (error) {
    report.pending = { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = (typeof args.slug === "string" ? args.slug : "").trim();
  const title = (typeof args.title === "string" ? args.title : "").trim();
  const branch = (typeof args.branch === "string" ? args.branch : "").trim();
  const prUrl = (typeof args.prUrl === "string" ? args.prUrl : "").trim();
  const thumbnail = (typeof args.thumbnail === "string" ? args.thumbnail : "").trim();
  const status = (typeof args.status === "string" ? args.status : "").trim() || "review_waiting";

  if (!slug || !branch) {
    console.error("Usage: phase-a-finalize --slug <slug> --branch <preview/...> [--title ...] [--prUrl ...] [--thumbnail ...] [--status review_waiting] [--skip-build]");
    process.exit(1);
  }

  const report = { slug, branch, steps: {}, finishedAt: null };
  const commitSha = currentCommitSha();
  const verificationPolicy = previewVerificationPolicy(ROOT);
  report.commitSha = commitSha;
  report.verificationPolicy = verificationPolicy;

  // -1. autonomy ゲート（L1 基盤・kill switch）: paused: true なら即停止。
  const autonomyState = loadAutonomy();
  const autonomyGate = gate({ phase: "finalize", trigger: "manual", state: autonomyState });
  report.autonomyLevel = autonomyGate.level;
  report.trigger = "manual";
  report.steps.autonomyGate = { ok: autonomyGate.allowed, level: autonomyGate.level, reason: autonomyGate.reason };
  if (!autonomyGate.allowed) {
    report.finishedAt = new Date().toISOString();
    await save(report);
    console.error(`[finalize] BLOCK: autonomy ${autonomyGate.reason}（data/automation/autonomy.json の paused を確認してください）`);
    await notifyAutonomyEvent({ slug, status: "autonomy_blocked", title: `[autonomy] finalize停止: ${autonomyGate.reason} (${slug})` }).catch(() => {});
    process.exit(2);
  }

  // 0. 品質ゲート（sumalabo-gate --stage full）。不合格なら以降
  //    （build / Preview URL 作成 / review item 登録 / 通知）へ一切進まない。
  console.log("[finalize] quality gate (sumalabo-gate --stage full)...");
  const gatePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "sumalabo-gate.mjs");
  // runCommand は win32 で shell:true のためスペース入り node パスが壊れる。
  // gate は引数がすべて内部生成値なので shell なしの spawn で直接実行する。
  const gateOk = await new Promise((resolve) => {
    const child = spawn(process.execPath, [gatePath, "--slug", slug, "--stage", "full"], { stdio: "inherit" });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
  report.steps.gate = { ok: gateOk };
  if (!gateOk) {
    report.finishedAt = new Date().toISOString();
    await save(report);
    console.error("[finalize] BLOCK: sumalabo-gate failed（violation あり）。Preview 作成・通知へ進みません。");
    process.exit(2);
  }

  // 0.5 成果物保全チェック（P7）: drafts/refinement/{slug} がコミット済みであること。
  //     gate --stage full 内でも検査するが、gate 側の将来変更に依存しないよう
  //     finalize でも独立に未追跡/未ステージ/未コミットを検出して停止する。
  //     背景: 2026-07 OS Temp クリーンアップで未コミット drafts が消失した事故。
  console.log("[finalize] drafts preservation check (git status drafts/refinement/{slug})...");
  const draftsDirty = await new Promise((resolve) => {
    const child = spawn("git", ["status", "--porcelain", "--", `drafts/refinement/${slug}`], { windowsHide: true });
    let out = "";
    child.stdout.on("data", (d) => { out += d; });
    child.on("close", (code) => resolve(code === 0 ? out.split(/\r?\n/).filter(Boolean) : null));
    child.on("error", () => resolve(null));
  });
  report.steps.draftsPreservation = { ok: Array.isArray(draftsDirty) && draftsDirty.length === 0, entries: draftsDirty ?? "git_unavailable" };
  if (draftsDirty === null) {
    console.warn("[finalize] warn: git 状態を確認できませんでした（drafts 保全チェックをスキップ）");
  } else if (draftsDirty.length > 0) {
    report.finishedAt = new Date().toISOString();
    await save(report);
    console.error(`[finalize] BLOCK: drafts/refinement/${slug} に未コミットの成果物があります（${draftsDirty.length} 件）。記事の PR に含めてコミットしてから finalize してください。`);
    for (const line of draftsDirty) console.error(`  ${line}`);
    process.exit(2);
  }

  // 1. build
  if (!args["skip-build"] || !existsSync("dist")) {
    console.log("[finalize] build...");
    const ok = await runCommand(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], {
      env: previewBuildEnvironment({ root: ROOT, slug }),
    });
    report.steps.build = { ok };
    if (!ok) { report.finishedAt = new Date().toISOString(); await save(report); console.error("[finalize] BLOCK: build failed"); process.exit(2); }
  } else {
    report.steps.build = { ok: true, skipped: true };
  }

  const targetHtml = path.join(ROOT, "dist", "articles", slug, "index.html");
  report.steps.previewArtifact = { ok: existsSync(targetHtml), path: path.relative(ROOT, targetHtml).replaceAll("\\", "/") };
  if (!report.steps.previewArtifact.ok) {
    preservePending(report, { slug, branch, commitSha, prUrl, reason: "preview_build_missing_target" });
    report.finishedAt = new Date().toISOString();
    await save(report);
    console.error(`[finalize] BLOCK: preview build omitted dist/articles/${slug}/index.html`);
    process.exit(2);
  }

  // 2. preview deploy（main は protected_branch で拒否される）
  console.log(`[finalize] cloudflare preview deploy (branch=${branch})...`);
  const deploy = await deployPreviewToCloudflarePages({
    distDir: "dist",
    branch,
    commitMessage: `preview ${slug}`.slice(0, 200),
    commitHash: commitSha || undefined,
  });
  report.steps.deploy = { ok: !!deploy?.ok, reason: deploy?.reason, previewUrl: deploy?.previewUrl, branchAliasUrl: deploy?.branchAliasUrl };
  if (!deploy?.ok) {
    preservePending(report, { slug, branch, commitSha, prUrl, reason: `preview_deploy_failed:${deploy?.reason}` });
    report.finishedAt = new Date().toISOString();
    await save(report);
    console.error(`[finalize] BLOCK: preview deploy failed reason=${deploy?.reason}`);
    process.exit(2);
  }

  // 2.5 Cloudflare API で、このbranch/commitに対応するdeployment IDと完了状態を確定する。
  // URLの404だけを見て伝播中・別deployment・配布失敗を混同しない。
  console.log("[finalize] wait for Cloudflare deployment status...");
  const deploymentStatus = await waitForCloudflarePagesDeployment({
    previewUrl: deploy.previewUrl || deploy.branchAliasUrl,
    branch,
    commitHash,
    intervalMs: verificationPolicy.deploymentPollIntervalMs,
    maxWaitMs: verificationPolicy.deploymentMaxWaitMs,
  });
  report.steps.deploymentStatus = deploymentStatus;
  if (!deploymentStatus.ok) {
    preservePending(report, {
      slug, branch, commitSha, prUrl,
      previewUrl: deploy.previewUrl || deploy.branchAliasUrl || null,
      deployment: deploymentStatus.deployment,
      reason: deploymentStatus.reason,
    });
    report.finishedAt = new Date().toISOString();
    await save(report);
    console.error(`[finalize] BLOCK: Cloudflare deployment status failed reason=${deploymentStatus.reason}`);
    process.exit(2);
  }

  // 3. resolve previewUrl（commit 固有 URL を優先）
  const base = (deploy.previewUrl || deploy.branchAliasUrl || "").replace(/\/+$/, "");
  const previewUrl = `${base}/articles/${slug}/`;
  report.previewUrl = previewUrl;
  report.branchAliasUrl = deploy.branchAliasUrl || null;

  // 3.5 ローカル URL ガード（出口の明示チェック）
  const policy = validateMainPreviewUrl(previewUrl);
  report.steps.urlPolicy = policy;
  if (!policy.ok) { report.finishedAt = new Date().toISOString(); await save(report); console.error(`[finalize] BLOCK: previewUrl rejected reason=${policy.reason}`); process.exit(2); }

  // 4. preview URL 検証（実記事 / fallback でない / 到達 200）
  console.log(`[finalize] verify preview url: ${previewUrl}`);
  const verify = await waitForPreviewUrl({
    verify: verifyPreviewUrl,
    url: previewUrl,
    slug,
    titlePrefix: title.slice(0, 16),
    intervalMs: verificationPolicy.httpRetryIntervalMs,
    maxWaitMs: verificationPolicy.httpMaxWaitMs,
    onRetry: ({ attempt, waitMs, elapsedMs, result }) => {
      console.log(`[finalize] verify attempt ${attempt} failed (${result?.reason}); elapsed=${Math.round(elapsedMs / 1000)}s, wait=${Math.round(waitMs / 1000)}s...`);
    },
  });
  report.steps.verify = verify;
  if (!verify?.ok) {
    preservePending(report, {
      slug, branch, commitSha, prUrl, previewUrl,
      deployment: deploymentStatus.deployment,
      reason: verify?.reason,
      status: verify?.status,
    });
    report.finishedAt = new Date().toISOString();
    await save(report);
    console.error(`[finalize] BLOCK: preview verify failed reason=${verify?.reason}; pending publish state saved`);
    process.exit(2);
  }

  // 4.5 veto 窓の計算（L1 基盤）: 期限を review item と通知に記録する。
  //     L0 では情報記録のみ（自動 Phase B は走らない）。L1 以降は期限経過で
  //     GitHub Actions の auto-phase-b が公開に進む。
  const veto = computeVetoDeadline(new Date(), autonomyState);
  report.previewReadyAt = veto.previewReadyAt;
  report.vetoDeadline = veto.vetoDeadline;

  // 5. review item 登録 + 通知（notify 側でもローカル URL を二重ガード）
  console.log("[finalize] notify + register review item...");
  const notify = await notifyReviewReady({
    item: {
      slug, title: title || undefined, branch, previewUrl, prUrl: prUrl || undefined,
      thumbnail: thumbnail || undefined, status, sourceCheckPassed: true,
      previewReadyAt: veto.previewReadyAt, vetoDeadline: veto.vetoDeadline,
      autonomyLevel: autonomyGate.level, trigger: "manual",
    },
  });
  report.steps.notify = { ok: !!notify?.ok, reason: notify?.reason, sent: notify?.response?.sent, subscribers: notify?.response?.subscribers };
  report.finishedAt = new Date().toISOString();
  try { report.pendingResolution = markPendingPublishResolved({ root: ROOT, slug }); }
  catch (error) { report.pendingResolution = { ok: false, reason: error instanceof Error ? error.message : String(error) }; }
  await save(report);

  if (!notify?.ok) {
    console.error(`[finalize] BLOCK: notify failed reason=${notify?.reason}: ${notify?.message || ""}`);
    process.exit(2);
  }

  console.log("\n=== PHASE A FINALIZE OK ===");
  console.log(JSON.stringify({ slug, previewUrl, status, prUrl, sent: notify?.response?.sent, subscribers: notify?.response?.subscribers }, null, 2));
  console.log(`\n⏱ veto期限: ${veto.vetoDeadlineJst}（veto窓 ${veto.vetoWindowMinutes} 分）`);
  if (autonomyGate.level >= 1) {
    console.log("   L1: この期限までに停止（PWAのvetoボタン or autonomy.json paused=true）が無ければ Phase B（本番公開）へ自動で進みます。");
  } else {
    console.log("   L0: 自動公開はされません。従来どおりユーザーの明示了承（「記事OK、公開へ」）を待ちます。");
  }
  process.exit(0);
}

async function save(report) {
  try {
    const dir = path.join("logs", "preview");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${report.slug}.finalize.json`), JSON.stringify(report, null, 2), "utf-8");
  } catch {}
}

main().catch((err) => { console.error("phase-a-finalize failed:", err && err.stack ? err.stack : err); process.exit(2); });
