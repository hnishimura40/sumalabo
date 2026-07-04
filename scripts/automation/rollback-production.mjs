#!/usr/bin/env node
// scripts/automation/rollback-production.mjs — 本番を直前の正常デプロイに戻す (L1 基盤)。
//
// 呼び出し: npm run rollback:production [-- --slug=<slug>] [--reason=<why>] [--dry-run]
//
// 方式（2 段構え。調査 2026-07-04 実測に基づく）:
//   1. Cloudflare Pages API の deployment rollback
//      POST /accounts/{acc}/pages/projects/sumalabo/deployments/{id}/rollback
//      ビルド不要・数秒で切り替わるため最速。対象 deployment は
//      builds/last-good/last-good.json の deploymentId を最優先、無ければ
//      本番 deployment 一覧から canonical 以外の最新 deploy:success を選ぶ。
//   2. API rollback 不可のとき: builds/last-good/dist を wrangler で再デプロイ
//      （deploy:production 成功時に退避してある正常ビルド成果物）。
//
// rollback 後: strict verify（/api/verify-publication）で「戻った」ことを機械確認する。
// rollback 自体が失敗したら autonomy.json を paused: true にして通知する
// （壊れた状態で自動運転を続けない）。
//
// 終了コード: 0=rollback+verify 成功 / 1=失敗（paused 化） / 2=引数・前提エラー
//
// セキュリティ: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID の値は出力しない。

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { loadAutonomy, saveAutonomy, recordIncident } from "./autonomy.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";
import { purgeForSlug, checkArticleGone } from "./cache-purge.mjs";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..", "..");
const LAST_GOOD_DIR = join(ROOT, "builds", "last-good");
const LAST_GOOD_META = join(LAST_GOOD_DIR, "last-good.json");
const PROJECT = "sumalabo";

function parseArgs(argv) {
  const out = { slug: null, reason: null, dryRun: false, verifyTimeoutMs: 6 * 60 * 1000, output: null, noNotify: false, expectGone: false, noPurge: false };
  for (const a of argv) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--no-notify") out.noNotify = true;
    else if (a === "--expect-gone") out.expectGone = true;
    else if (a === "--no-purge") out.noPurge = true;
    else if (a.startsWith("--slug=")) out.slug = a.slice("--slug=".length).trim();
    else if (a.startsWith("--reason=")) out.reason = a.slice("--reason=".length).trim();
    else if (a.startsWith("--verify-timeout-ms=")) {
      const n = Number(a.slice("--verify-timeout-ms=".length));
      if (Number.isFinite(n) && n > 0) out.verifyTimeoutMs = Math.min(Math.max(n, 30_000), 30 * 60_000);
    } else if (a.startsWith("--output=")) out.output = a.slice("--output=".length).trim();
  }
  return out;
}

function cfCreds() {
  return {
    token: process.env.CLOUDFLARE_API_TOKEN || "",
    account: process.env.CLOUDFLARE_ACCOUNT_ID || "",
  };
}

async function cfApi(path, { method = "GET", body = null } = {}) {
  const { token, account } = cfCreds();
  if (!token || !account) return { ok: false, reason: "missing_cf_credentials" };
  const url = `https://api.cloudflare.com/client/v4/accounts/${account}${path}`;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    return { ok: false, reason: "network_error", message: e && e.message };
  }
  let json = null;
  try {
    json = await res.json();
  } catch {}
  if (!json || json.success !== true) {
    return { ok: false, reason: "api_error", status: res.status, errors: json && json.errors };
  }
  return { ok: true, result: json.result };
}

function readLastGood() {
  if (!existsSync(LAST_GOOD_META)) return null;
  try {
    return JSON.parse(readFileSync(LAST_GOOD_META, "utf-8"));
  } catch {
    return null;
  }
}

// 対象 deployment の決定: last-good 優先 → 一覧から canonical 以外の最新 success
async function resolveTarget(result) {
  const proj = await cfApi(`/pages/projects/${PROJECT}`);
  if (!proj.ok) {
    result.steps.resolveTarget = { status: "failed", reason: proj.reason };
    return null;
  }
  const canonicalId = proj.result?.canonical_deployment?.id || null;
  const lastGood = readLastGood();
  result.steps.resolveTarget = { status: "pending", canonicalId: canonicalId ? canonicalId.slice(0, 8) : null };

  if (lastGood?.deploymentId && lastGood.deploymentId !== canonicalId) {
    result.steps.resolveTarget = {
      status: "ok",
      source: "last_good_meta",
      targetId: lastGood.deploymentId.slice(0, 8),
      lastGoodSlug: lastGood.slug || null,
    };
    return { id: lastGood.deploymentId, slug: lastGood.slug || null };
  }

  const list = await cfApi(`/pages/projects/${PROJECT}/deployments?env=production&per_page=15`);
  if (!list.ok) {
    result.steps.resolveTarget = { status: "failed", reason: list.reason };
    return null;
  }
  const candidates = (list.result || []).filter(
    (d) => d.id !== canonicalId && d.latest_stage?.name === "deploy" && d.latest_stage?.status === "success",
  );
  if (candidates.length === 0) {
    result.steps.resolveTarget = { status: "failed", reason: "no_previous_success_deployment" };
    return null;
  }
  const target = candidates[0]; // 一覧は新しい順
  result.steps.resolveTarget = { status: "ok", source: "deployment_list", targetId: target.id.slice(0, 8) };
  return { id: target.id, slug: null };
}

async function apiRollback(result, targetId, dryRun) {
  if (dryRun) {
    result.steps.apiRollback = { status: "dry_run", targetId: targetId.slice(0, 8) };
    return true;
  }
  const r = await cfApi(`/pages/projects/${PROJECT}/deployments/${targetId}/rollback`, { method: "POST" });
  result.steps.apiRollback = r.ok
    ? { status: "ok", targetId: targetId.slice(0, 8) }
    : { status: "failed", reason: r.reason, apiStatus: r.status, errors: r.errors };
  return r.ok;
}

function wranglerRedeployLastGood(result, dryRun) {
  const lastGoodDist = join(LAST_GOOD_DIR, "dist");
  if (!existsSync(join(lastGoodDist, "index.html"))) {
    result.steps.wranglerFallbackRedeploy = { status: "failed", reason: "last_good_dist_missing" };
    return false;
  }
  if (dryRun) {
    result.steps.wranglerFallbackRedeploy = { status: "dry_run" };
    return true;
  }
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    result.steps.wranglerFallbackRedeploy = { status: "failed", reason: "missing_CLOUDFLARE_API_TOKEN" };
    return false;
  }
  console.log("[rollback] wrangler pages deploy builds/last-good/dist --branch=main");
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["wrangler", "pages", "deploy", lastGoodDist, `--project-name=${PROJECT}`, "--branch=main", "--commit-dirty=true"],
    { cwd: ROOT, stdio: "inherit", env: process.env, shell: process.platform === "win32" },
  );
  result.steps.wranglerFallbackRedeploy = r.status === 0 ? { status: "ok" } : { status: "failed", code: r.status };
  return r.status === 0;
}

async function verifyRestored(result, slug, timeoutMs, dryRun) {
  if (dryRun) {
    result.steps.verify = { status: "dry_run" };
    return true;
  }
  // slug 不明のときはトップの 200 + 記事一覧 200 だけ確認する（最低限の生存確認）
  if (!slug) {
    try {
      const home = await fetch("https://sumalabo.com/", { cache: "no-store" });
      const list = await fetch("https://sumalabo.com/articles/", { cache: "no-store" });
      const ok = home.status === 200 && list.status === 200;
      result.steps.verify = { status: ok ? "ok" : "failed", mode: "liveness_only", home: home.status, articles: list.status };
      return ok;
    } catch (e) {
      result.steps.verify = { status: "failed", mode: "liveness_only", reason: "network_error" };
      return false;
    }
  }
  const url = `https://sumalabo.com/api/verify-publication?slug=${encodeURIComponent(slug)}`;
  const deadline = Date.now() + timeoutMs;
  let attempts = 0;
  console.log(`[rollback] strict verify polling: ${url}`);
  while (Date.now() < deadline) {
    attempts++;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (body && body.status === "published") {
        result.steps.verify = { status: "ok", mode: "strict", attempts, slug };
        return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 10_000));
  }
  result.steps.verify = { status: "timeout", mode: "strict", attempts, slug };
  return false;
}

async function stepCachePurge(result, args) {
  if (args.noPurge) {
    result.steps.cachePurge = { status: "skipped", reason: "--no-purge" };
    return;
  }
  if (args.dryRun) {
    result.steps.cachePurge = { status: "dry_run" };
    return;
  }
  const purge = await purgeForSlug({ slug: result.slug || undefined, everything: !result.slug });
  if (purge.ok) {
    result.steps.cachePurge = { status: "ok", method: purge.method, urlCount: purge.urls?.length, fallbackFrom: purge.fallbackFrom };
    console.log(`[rollback] cache purge ok (method=${purge.method})`);
  } else {
    result.steps.cachePurge = { status: "skipped", reason: purge.reason, errors: purge.errors };
    console.warn(`[rollback] cache purge 不可 (${purge.reason})。旧ページが TTL までキャッシュ配信され続ける可能性があります。`);
    console.warn("           必要権限: Zone → Cache Purge → Purge（CLOUDFLARE_ZONE_PURGE_TOKEN で設定可）");
  }
}

async function pauseAndNotify(result, reasonText) {
  const state = loadAutonomy();
  state.paused = true;
  saveAutonomy(state);
  recordIncident({ slug: result.slug, kind: "rollback_failed", detail: reasonText });
  result.pausedSet = true;
  console.error(`[rollback] FAILED → autonomy.paused=true に設定しました: ${reasonText}`);
  if (!result.noNotify) {
    const n = await notifyAutonomyEvent({
      slug: result.slug || "production",
      status: "autonomy_paused",
      title: `[autonomy] rollback失敗のため自動運転を停止: ${reasonText}`,
    });
    result.steps.notify = { status: n.ok ? "ok" : "failed", reason: n.reason };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = {
    ok: false,
    slug: args.slug || null,
    reason: args.reason || null,
    dryRun: args.dryRun,
    noNotify: args.noNotify,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    steps: {},
    pausedSet: false,
  };

  console.log(`[rollback] production rollback${args.dryRun ? " (DRY RUN)" : ""}${args.reason ? ` reason=${args.reason}` : ""}`);

  const target = await resolveTarget(result);
  let rolledBack = false;
  if (target) {
    result.slug = result.slug || target.slug || readLastGood()?.slug || null;
    rolledBack = await apiRollback(result, target.id, args.dryRun);
  }
  if (!rolledBack) {
    console.warn("[rollback] API rollback 不可 → builds/last-good/dist から wrangler 再デプロイを試行");
    rolledBack = wranglerRedeployLastGood(result, args.dryRun);
    if (rolledBack) result.slug = result.slug || readLastGood()?.slug || null;
  }

  if (!rolledBack) {
    result.errorReason = "rollback_failed_all_methods";
    await pauseAndNotify(result, "API rollback と last-good 再デプロイの両方が失敗");
    finish(result, args, 1);
    return;
  }

  // rollback 成功後（API / last-good どちらの経路でも）: CDN キャッシュを能動パージ。
  // 訓練 (2026-07-04) でエッジキャッシュが旧ページを TTL まで配信し続けることを
  // 実測したため。パージ権限が無い場合は skip 記録 + 警告（rollback 自体は成立）。
  await stepCachePurge(result, args);

  // 「消えるべき記事が消えたか」の実フェッチ確認（expect-gone = 誤記事の引っ込め時）。
  // 通常の restore（記事が残るのが正）では strict verify 側で確認する。
  if (args.expectGone && result.slug && !args.dryRun) {
    const goneCheck = await checkArticleGone({ slug: result.slug });
    result.steps.purgeCheck = goneCheck;
    if (!goneCheck.gone) {
      result.errorReason = "stale_cache_still_serving";
      console.error(`[rollback] 記事 ${result.slug} がまだ配信されています（cache=${goneCheck.cfCacheStatus}）。パージ権限とキャッシュ状態を確認してください。`);
      if (!args.noNotify) {
        await notifyAutonomyEvent({
          slug: result.slug,
          status: "rollback_stale_cache",
          title: `[autonomy] rollback後もキャッシュが旧記事を配信中: ${result.slug}（要確認）`,
        });
      }
      finish(result, args, 1);
      return;
    }
  }

  // verify: expect-gone（引っ込め）は liveness、restore は strict published
  const verified = args.expectGone
    ? await verifyRestored(result, null, args.verifyTimeoutMs, args.dryRun)
    : await verifyRestored(result, result.slug, args.verifyTimeoutMs, args.dryRun);
  if (!verified) {
    result.errorReason = "rollback_verify_failed";
    await pauseAndNotify(result, "rollback 後の verify が通らない（本番状態が不明）");
    finish(result, args, 1);
    return;
  }

  result.ok = true;
  if (!args.dryRun && !args.noNotify) {
    const n = await notifyAutonomyEvent({
      slug: result.slug || "production",
      status: "rolled_back",
      title: `[autonomy] 本番を直前の正常デプロイへ rollback しました${args.reason ? `（${args.reason}）` : ""}`,
      previewUrl: result.slug ? `https://sumalabo.com/articles/${result.slug}/` : undefined,
    });
    result.steps.notify = { status: n.ok ? "ok" : "failed", reason: n.reason };
  }
  finish(result, args, 0);
}

function finish(result, args, exitCode) {
  result.finishedAt = new Date().toISOString();
  const json = JSON.stringify(result, null, 2);
  if (args.output) {
    try {
      mkdirSync(dirname(args.output), { recursive: true });
      writeFileSync(args.output, json + "\n", "utf-8");
    } catch {}
  }
  console.log("---ROLLBACK RESULT JSON---");
  console.log(json);
  // fetch ハンドル残存時の process.exit() は Windows Node でクラッシュするため自然終了
  process.exitCode = exitCode;
}

main().catch((err) => {
  console.error("[rollback fatal]", err && err.message ? err.message : err);
  process.exitCode = 1;
});
