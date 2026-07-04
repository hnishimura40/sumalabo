#!/usr/bin/env node
// scripts/automation/auto-phase-b.mjs — veto 期限経過後の Phase B 自動実行 (L1)。
//
// 実行主体: GitHub Actions（.github/workflows/auto-phase-b.yml、5 分間隔 schedule）。
//   Actions は自前トークンで自リポジトリを clone できるため、P1 で特定した
//   Cloudflare GitHub App の clone 障害の影響を受けない。
//
// 流れ:
//   1. autonomy ゲート（paused / level<1 なら何もせず exit 0 = L0 の現行動作を壊さない）
//   2. /api/review-items から確認待ち一覧を取得
//   3. 対象条件: status=review_waiting かつ vetoDeadline 経過 かつ 未veto かつ prUrl あり
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
  const out = { decide: false, dryRun: false, itemsFile: null, now: null };
  for (const a of argv) {
    if (a === "--decide") out.decide = true;
    else if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--items-file=")) out.itemsFile = a.slice("--items-file=".length).trim();
    else if (a.startsWith("--now=")) out.now = a.slice("--now=".length).trim();
  }
  return out;
}

/**
 * 自動 Phase B の対象を選ぶ（純関数・テスト可能）。
 * 条件: review_waiting / vetoDeadline 経過 / 未veto / prUrl あり。
 * 複数該当時は vetoDeadline が古い順。
 */
export function selectEligible(items, nowMs = Date.now()) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it) => {
      if (!it || typeof it.slug !== "string" || !it.slug) return false;
      if (it.status !== "review_waiting") return false;
      if (it.vetoedAt) return false;
      if (typeof it.prUrl !== "string" || !it.prUrl) return false;
      if (typeof it.vetoDeadline !== "string") return false;
      const deadline = Date.parse(it.vetoDeadline);
      if (!Number.isFinite(deadline)) return false;
      return deadline < nowMs;
    })
    .sort((a, b) => Date.parse(a.vetoDeadline) - Date.parse(b.vetoDeadline));
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

function mergePr(prNumber, dryRun) {
  const view = run("gh", ["pr", "view", String(prNumber), "--json", "state,isDraft,mergeable,mergeStateStatus"], { capture: true });
  if (view.code !== 0) return { ok: false, reason: "gh_pr_view_failed" };
  let info;
  try {
    info = JSON.parse(view.stdout);
  } catch {
    return { ok: false, reason: "gh_pr_view_unparseable" };
  }
  if (info.state === "MERGED") return { ok: true, alreadyMerged: true };
  if (info.state !== "OPEN") return { ok: false, reason: `pr_state_${info.state}` };
  if (info.isDraft) return { ok: false, reason: "pr_is_draft" };
  if (info.mergeable !== "MERGEABLE") return { ok: false, reason: `not_mergeable_${info.mergeable}` };
  if (dryRun) return { ok: true, dryRun: true };
  const merge = run("gh", ["pr", "merge", String(prNumber), "--merge", "--delete-branch=false"]);
  return merge.code === 0 ? { ok: true } : { ok: false, reason: "gh_pr_merge_failed" };
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
  let items;
  try {
    items = await loadItems(args);
  } catch (e) {
    console.error(`[auto-phase-b] review-items 取得失敗: ${e && e.message}`);
    writeGithubOutput("eligible", "none");
    process.exitCode = args.decide ? 0 : 1;
    return;
  }
  const eligible = selectEligible(items, nowMs);
  if (eligible.length === 0) {
    console.log("[auto-phase-b] veto期限超過の対象なし");
    writeGithubOutput("eligible", "none");
    process.exitCode = 0;
    return;
  }

  const target = eligible[0]; // 4. 1 実行 1 slug
  console.log(`[auto-phase-b] 対象: ${target.slug} (vetoDeadline=${target.vetoDeadline}, PR=${target.prUrl})`);
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
  const merged = mergePr(prNumber, false);
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

  const pull = run("git", ["pull", "origin", "main"]);
  if (pull.code !== 0) {
    console.error("[auto-phase-b] git pull origin main 失敗");
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

  // 7. Phase C 自動起動の配線 (L2): level>=2 かつ post-publish verify 合格のときだけ
  //    phase-c-auto が進む（現 level では gate が skip する）
  const phaseC = run(process.execPath, [
    join(ROOT, "scripts", "automation", "phase-c-auto.mjs"),
    `--slug=${target.slug}`,
    "--trigger=auto_after_veto",
  ]);
  if (phaseC.code !== 0 && phaseC.code !== 10) {
    console.warn(`[auto-phase-b] phase-c-auto exit=${phaseC.code}（非致命。Phase B自体は成功）`);
  }

  // 8. Phase B 完了通知（既存の完了報告テンプレ相当の要点）
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
