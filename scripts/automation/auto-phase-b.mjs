#!/usr/bin/env node
// scripts/automation/auto-phase-b.mjs — Phase A完了後のPhase B自動実行。
//
// 実行主体: GitHub Actions（.github/workflows/auto-phase-b.yml、5 分間隔 schedule）。
//   Actions は自前トークンで自リポジトリを clone できるため、P1 で特定した
//   Cloudflare GitHub App の clone 障害の影響を受けない。
//
// 流れ:
//   1. autonomy ゲート（paused / level<1 なら何もせず exit 0 = L0 の現行動作を壊さない）
//   2. /api/review-items から確認待ち一覧を取得
//   3. 対象条件: status=review_waiting かつ未vetoかつprUrlあり
//   4. 1 実行につき 1 slug だけ処理（安全側）
//   5. PR merge（gh CLI。MERGEABLE/CLEAN/非Draft を確認）→ git pull main
//   6. npm run deploy:production -- --slug=<slug> --trigger=auto_after_veto
//      （内部で build → dist 検査 → wrangler → strict verify → last-good 退避 →
//        post-publish verify（hard fail なら自動 rollback）まで走る）
//   7. Phase B 完了通知（本番URL つき）
//
// モード:
//   --decide            対象の有無だけ判定して出力（npm ci 前の軽量チェック用）。
//                       GITHUB_OUTPUT があれば `eligible=<slug|none>` を書く
//   --items-file=<path> review items を API でなくファイルから読む（テスト用）
//   --now=<ISO>         現在時刻の差し替え（テスト用）
//   --dry-run           merge / deploy を実行せず、判定と手順だけ出力
//
// 終了コード: 0 = 正常（対象なし・L0 スキップ含む） / 1 = 処理失敗
//
// セキュリティ: GH_TOKEN / CLOUDFLARE_API_TOKEN / REVIEW_NOTIFY_SECRET の値は出力しない。

import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { gate, loadAutonomy } from "./autonomy.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..", "..");
const REVIEW_ITEMS_URL = process.env.REVIEW_ITEMS_URL || "https://sumalabo.com/api/review-items";

export function parseArgs(argv) {
  const out = { decide: false, dryRun: false, itemsFile: null, now: null, slug: null, waitForTarget: false, attempts: 10, intervalMs: 30_000 };
  for (const a of argv) {
    if (a === "--decide") out.decide = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--items-file=")) out.itemsFile = a.slice("--items-file=".length).trim();
    else if (a.startsWith("--now=")) out.now = a.slice("--now=".length).trim();
    else if (a.startsWith("--slug=")) out.slug = a.slice("--slug=".length).trim();
    else if (a === "--wait-for-target") out.waitForTarget = true;
    else if (a.startsWith("--attempts=")) out.attempts = Number(a.slice("--attempts=".length));
    else if (a.startsWith("--interval-ms=")) out.intervalMs = Number(a.slice("--interval-ms=".length));
  }
  if (!Number.isInteger(out.attempts) || out.attempts < 1) throw new Error("attempts must be a positive integer");
  if (!Number.isFinite(out.intervalMs) || out.intervalMs < 0) throw new Error("interval-ms must be non-negative");
  return out;
}

/**
 * 自動 Phase B の対象を選ぶ（純関数・テスト可能）。
 * 条件: review_waiting / 未veto / prUrlあり。承認・時刻待ちは設けない。
 */
export function selectEligible(items, nowMs = Date.now()) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => {
      if (!it || typeof it.slug !== "string" || !it.slug) return false;
      if (it.status !== "review_waiting") return false;
      if (it.vetoedAt) return false;
      if (typeof it.prUrl !== "string" || !it.prUrl) return false;
      return true;
    })
    .sort((a, b) => Date.parse(a.previewReadyAt || a.createdAt || 0) - Date.parse(b.previewReadyAt || b.createdAt || 0));
}

async function loadItems(args) {
  if (args.itemsFile) {
    const raw = JSON.parse(readFileSync(args.itemsFile, "utf-8"));
    return Array.isArray(raw) ? raw : raw.items || [];
  }
  const res = await fetch(REVIEW_ITEMS_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`review-items API returned ${res.status}`);
  const body = await res.json();
  return Array.isArray(body.items) ? body.items : [];
}

function writeGithubOutput(key, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (!out) return;
  try {
    appendFileSync(out, `${key}=${value}\n`, "utf-8");
  } catch {}
}

function run(cmd, cmdArgs, opts = {}) {
  const r = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    stdio: opts.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env,
    shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd),
  });
  return { code: r.status, stdout: (r.stdout || "").toString(), stderr: (r.stderr || "").toString() };
}

function parsePrNumber(prUrl) {
  const m = String(prUrl).match(/\/pull\/(\d+)/);
  return m ? Number(m[1]) : null;
}

export async function mergePr(prNumber, dryRun, { token = process.env.GH_TOKEN, fetchImpl = fetch } = {}) {
  if (!token) return { ok: false, reason: "gh_token_missing" };
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sumalabo-auto-phase-b",
  };
  const endpoint = `https://api.github.com/repos/hnishimura40/sumalabo/pulls/${prNumber}`;
  const view = await fetchImpl(endpoint, { headers });
  if (!view.ok) return { ok: false, reason: `pr_view_http_${view.status}` };
  const info = await view.json();
  if (info.merged === true) return { ok: true, alreadyMerged: true };
  if (info.state !== "open") return { ok: false, reason: `pr_state_${info.state}` };
  if (info.draft === true) return { ok: false, reason: "pr_is_draft" };
  if (dryRun) return { ok: true, dryRun: true };
  const merge = await fetchImpl(`${endpoint}/merge`, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ merge_method: "merge" }),
  });
  if (!merge.ok) return { ok: false, reason: `pr_merge_http_${merge.status}` };
  const merged = await merge.json();
  return merged?.merged === true ? { ok: true } : { ok: false, reason: merged?.message || "pr_merge_rejected" };
}

const sleep = (milliseconds) => new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));

export async function waitForEligibleTarget({ load, slug = null, attempts = 10, intervalMs = 30_000, nowMs = Date.now(), sleepImpl = sleep }) {
  for (let attempt = 1; attempt <= attempts + 1; attempt += 1) {
    const eligible = selectEligible(await load(), nowMs);
    const target = slug ? eligible.find((item) => item.slug === slug) : eligible[0];
    if (target) return { ok: true, target, attempt, retries: attempt - 1 };
    if (attempt <= attempts) await sleepImpl(intervalMs);
  }
  return { ok: false, target: null, attempt: attempts + 1, retries: attempts, reason: "phase_b_target_not_found_after_retry" };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const nowMs = args.now ? Date.parse(args.now) : Date.now();

  // 1. autonomy ゲート。L0 / paused では絶対に進まない（現行動作の保護）。
  const g = gate({ phase: "phase_b", trigger: "auto_after_veto" });
  if (!g.allowed) {
    console.log(`[auto-phase-b] skip: ${g.reason} (level=${g.level}, paused=${g.paused})`);
    writeGithubOutput("eligible", "none");
    process.exitCode = 0;
    return;
  }

  // 2-3. 対象選定
  let decision;
  try {
    decision = await waitForEligibleTarget({
      load: () => loadItems(args),
      slug: args.slug,
      attempts: args.waitForTarget ? args.attempts : 1,
      intervalMs: args.intervalMs,
      nowMs,
    });
  } catch (e) {
    console.error(`[auto-phase-b] review-items 取得失敗: ${e && e.message}`);
    writeGithubOutput("eligible", "none");
    process.exitCode = args.decide ? 0 : 1;
    return;
  }
  if (!decision.ok) {
    console.log("[auto-phase-b] Phase B対象なし");
    writeGithubOutput("eligible", "none");
    if (args.waitForTarget) {
      console.error(`[auto-phase-b] ${decision.reason} retries=${decision.retries}`);
      process.exitCode = 12;
    } else {
      process.exitCode = 0;
    }
    return;
  }

  const target = decision.target; // 4. 1 実行 1 slug
  console.log(`[auto-phase-b] 対象: ${target.slug} (PR=${target.prUrl})`);
  writeGithubOutput("eligible", target.slug);
  if (args.decide) {
    process.exitCode = 0;
    return;
  }

  if (args.dryRun) {
    console.log("[auto-phase-b] dry-run: merge → git pull → deploy:production --trigger=auto_after_veto の手順で実行されます");
    process.exitCode = 0;
    return;
  }

  // 5. PR merge
  const prNumber = parsePrNumber(target.prUrl);
  if (!prNumber) {
    console.error(`[auto-phase-b] prUrl から PR 番号を特定できません: ${target.prUrl}`);
    process.exitCode = 1;
    return;
  }
  const merged = await mergePr(prNumber, false);
  if (!merged.ok) {
    console.error(`[auto-phase-b] PR merge 失敗: ${merged.reason}`);
    await notifyAutonomyEvent({
      slug: target.slug,
      status: "auto_phase_b_failed",
      title: `[autonomy] 自動Phase B: PR #${prNumber} merge失敗 (${merged.reason})`,
    });
    process.exitCode = 1;
    return;
  }
  console.log(`[auto-phase-b] PR #${prNumber} merge ${merged.alreadyMerged ? "済み（スキップ）" : "OK"}`);

  const fetch = run("git", ["fetch", "origin", "main"]);
  const checkout = fetch.code === 0 ? run("git", ["checkout", "--detach", "origin/main"]) : { code: 1 };
  if (fetch.code !== 0 || checkout.code !== 0) {
    console.error("[auto-phase-b] origin/main同期またはdetached checkout失敗");
    process.exitCode = 1;
    return;
  }

  // 6. deploy:production（build → wrangler → strict verify → post-publish verify）
  const deploy = run(process.execPath, [
    join(ROOT, "scripts", "automation", "deploy-production-from-main.mjs"),
    `--slug=${target.slug}`,
    "--trigger=auto_after_veto",
    "--skip-git-sync",
    `--output=${join(ROOT, "logs", "publish", `${target.slug}.deploy.json`)}`,
  ]);
  if (deploy.code !== 0) {
    console.error(`[auto-phase-b] deploy:production 失敗 (exit=${deploy.code})。post-publish verify が hard fail の場合は rollback 済み。`);
    await notifyAutonomyEvent({
      slug: target.slug,
      status: "auto_phase_b_failed",
      title: `[autonomy] 自動Phase B: deploy失敗 (${target.slug})。詳細は logs/publish/`,
    });
    process.exitCode = 1;
    return;
  }

  // Phase C is intentionally not started here. The outer wrapper first verifies
  // the merged PR and production HTTP 200, then creates x-post.json.
  const productionUrl = `https://sumalabo.com/articles/${target.slug}/`;
  await notifyAutonomyEvent({
    slug: target.slug,
    status: "published",
    title: `[autonomy] 自動Phase B完了: ${target.slug} を公開しました（PR #${prNumber} merge / wrangler deploy / strict verify 8項目 / 事後検査 pass）`,
    previewUrl: productionUrl,
  });
  console.log(`[auto-phase-b] 完了: ${productionUrl}`);
  process.exitCode = 0;
}

// テストから import できるように、直接実行時のみ main を走らせる
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error("[auto-phase-b fatal]", err && err.message ? err.message : err);
    process.exitCode = 1;
    return;
  });
}
