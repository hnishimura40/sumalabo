#!/usr/bin/env node
// scripts/automation/cache-purge.mjs — Cloudflare CDN キャッシュパージ (L1 仕上げ)。
//
// 背景: L1 の rollback 訓練 (2026-07-04) で、deployment を戻しても CDN エッジ
// キャッシュが旧ページを TTL まで配信し続けることが実測された。rollback の
// 主用途は「誤りを含む記事を人間より速く引っ込める」ことなので、rollback /
// deploy の直後にキャッシュを能動的にパージする。
//
// パージ方式（優先順位）:
//   1. 対象 URL の個別パージ（記事 URL + トップ + /articles/ 一覧 + sitemap +
//      サムネイル）— 影響最小
//   2. 個別パージが失敗した場合は全体パージ (purge_everything) に自動フォール
//      バック — rollback は頻度が低い非常時操作なのでコスト許容
//
// 必要権限: Zone → Cache Purge → Purge（対象 zone: sumalabo.com のみの最小
// スコープ推奨）。現行の CLOUDFLARE_API_TOKEN に無い場合は
// CLOUDFLARE_ZONE_PURGE_TOKEN 環境変数に別トークンを設定する。
// zone ID の解決には Zone → Zone → Read も必要（CLOUDFLARE_ZONE_ID を
// 直接設定すれば不要）。
//
// 権限が無い場合は {ok:false, reason:"zone_not_visible"|"purge_forbidden"} を
// 返すだけで例外は投げない（呼び出し側が verify.json に記録して警告する）。
//
// CLI: node scripts/automation/cache-purge.mjs --slug=<slug> [--base-url=...] [--everything]
// 終了コード: 0=パージ成功 / 1=パージ不可（権限・zone 不可視など）
//
// セキュリティ: トークン値・zone ID 全体は出力しない（先頭 6 文字まで）。

import process from "node:process";

const DEFAULT_HOST = "sumalabo.com";

function purgeToken() {
  return (process.env.CLOUDFLARE_ZONE_PURGE_TOKEN || process.env.CLOUDFLARE_API_TOKEN || "").trim();
}

async function cfFetch(path, { method = "GET", body = null } = {}) {
  const token = purgeToken();
  if (!token) return { ok: false, reason: "missing_token" };
  let res;
  try {
    res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
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
    return {
      ok: false,
      reason: res.status === 403 ? "purge_forbidden" : "api_error",
      status: res.status,
      errors: (json?.errors || []).map((e) => ({ code: e.code, message: e.message })),
    };
  }
  return { ok: true, result: json.result };
}

export async function resolveZoneId(host = DEFAULT_HOST) {
  const fromEnv = (process.env.CLOUDFLARE_ZONE_ID || "").trim();
  if (fromEnv) return { ok: true, zoneId: fromEnv, source: "env" };
  const r = await cfFetch(`/zones?name=${encodeURIComponent(host)}`);
  if (!r.ok) return { ok: false, reason: r.reason, errors: r.errors };
  const zone = (r.result || [])[0];
  if (!zone) return { ok: false, reason: "zone_not_visible" };
  return { ok: true, zoneId: zone.id, source: "api" };
}

/** slug 記事の公開に関わる URL 一式（個別パージ対象） */
export function buildPurgeUrls(slug, baseUrl = `https://${DEFAULT_HOST}`) {
  const base = baseUrl.replace(/\/+$/, "");
  const urls = [
    `${base}/articles/${slug}/`,
    `${base}/articles/${slug}`,
    `${base}/`,
    `${base}/articles/`,
    `${base}/sitemap-index.xml`,
    `${base}/sitemap-0.xml`,
    `${base}/images/thumbnails/${slug}.webp`,
    `${base}/images/thumbnails/${slug}.png`,
  ];
  return urls;
}

/**
 * キャッシュパージ本体。個別 URL パージ → 失敗時 purge_everything フォールバック。
 * @returns {{ok: boolean, method?: "files"|"everything", urls?: string[], reason?: string, fallbackFrom?: string}}
 */
export async function purgeForSlug({ slug, baseUrl, everything = false, host = DEFAULT_HOST } = {}) {
  const zone = await resolveZoneId(host);
  if (!zone.ok) return { ok: false, reason: zone.reason, errors: zone.errors };

  if (!everything && slug) {
    const urls = buildPurgeUrls(slug, baseUrl);
    const r = await cfFetch(`/zones/${zone.zoneId}/purge_cache`, { method: "POST", body: { files: urls } });
    if (r.ok) return { ok: true, method: "files", urls };
    // 個別パージが構成上通らない場合は全体パージへフォールバック
    const all = await cfFetch(`/zones/${zone.zoneId}/purge_cache`, { method: "POST", body: { purge_everything: true } });
    if (all.ok) return { ok: true, method: "everything", fallbackFrom: `files:${r.reason}` };
    return { ok: false, reason: all.reason, errors: all.errors, filesAttempt: r.reason };
  }

  const all = await cfFetch(`/zones/${zone.zoneId}/purge_cache`, { method: "POST", body: { purge_everything: true } });
  return all.ok ? { ok: true, method: "everything" } : { ok: false, reason: all.reason, errors: all.errors };
}

/**
 * パージ後の実フェッチ確認: 記事 URL が「消えるべき旧内容」を返していないか。
 * gone = true を期待するのは「公開直後の誤記事を rollback で引っ込めた」ケース。
 * @returns {{fetched: boolean, status?: number, slugServed?: boolean, gone?: boolean, cfCacheStatus?: string|null}}
 */
export async function checkArticleGone({ slug, baseUrl = `https://${DEFAULT_HOST}` }) {
  const url = `${baseUrl.replace(/\/+$/, "")}/articles/${slug}/`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const html = await res.text().catch(() => "");
    const slugServed = res.status === 200 && html.includes(slug);
    return {
      fetched: true,
      url,
      status: res.status,
      cfCacheStatus: res.headers.get("cf-cache-status"),
      slugServed,
      gone: !slugServed,
    };
  } catch (e) {
    return { fetched: false, url, error: e && e.message };
  }
}

// ---- CLI ----
const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/").split("/").pop());
if (isDirectRun) {
  const args = {};
  for (const a of process.argv.slice(2)) {
    if (a === "--everything") args.everything = true;
    else if (a.startsWith("--slug=")) args.slug = a.slice(7).trim();
    else if (a.startsWith("--base-url=")) args.baseUrl = a.slice(11).trim();
  }
  const result = await purgeForSlug(args);
  console.log("---CACHE PURGE RESULT---");
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 1;
}
