#!/usr/bin/env node
/**
 * dashboard/scripts/fetch-dashboard-data.mjs
 *
 * ダッシュボード用のライブJSON (public/data/dashboard-latest.json) を生成するスクリプト。
 *
 * Phase 3A + 3B (現状):
 *   - GA4 Data API から各サイトの日別 / ページ別 / チャネル別 / デバイス別データを取得。
 *   - Search Console API (webmasters/v3 REST) から検索クリック / 表示 / CTR / 掲載順位 /
 *     上位クエリ / Discover 掲載状況を取得。認証は GA4 と同じサービスアカウント鍵で
 *     scope=webmasters.readonly のトークンを取り、googleapis を追加せず REST を直接叩く。
 *   - SC プロパティ識別子はハードコードせず、起動時に sites.list を 1 回呼び、
 *     各サイトのホスト名 (site.url 由来、www 無視) でマッチして動的解決する。
 *     解決できない / SC 取得に失敗したサイトは searchSource: 'none' として続行し、
 *     GA4 側の取得や全体の実行は落とさない。
 *   - 既存 UI 互換の sites[] と、後段分析用の stats を 1 つの snapshot にまとめて書き出す。
 *   - GA4 credentials / property ID が揃わないサイトは sample にフォールバック (画面側で 🟡)。
 *
 * 使う Secrets (環境変数):
 *   - GA4_SERVICE_ACCOUNT_JSON         サービスアカウント鍵 JSON 全文 (GA4 / SC 兼用)
 *   - GA4_PROPERTY_ID_AINITORYU        GA4 プロパティ ID (数値文字列)
 *   - GA4_PROPERTY_ID_SUMALAB          同上
 *   - GA4_PROPERTY_ID_MIRADIA          同上
 *   ※ SEARCH_CONSOLE_* 系の env / Secrets は不要 (sites.list 動的解決のため廃止)。
 *
 * 出力:
 *   - dashboard/public/data/dashboard-latest.json (gitignore 対象、commit しない)
 *   - ローカル自動更新 (update-dashboard-local.ps1) から呼ばれ、Wrangler が
 *     dist/ ごと Cloudflare Pages へ Direct Upload する。
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

const SAMPLE_PATH = resolve(ROOT, 'src/data/sample-dashboard.json');
const OUT_PATH = resolve(ROOT, 'public/data/dashboard-latest.json');

const SITE_KEYS = ['ainitoryu', 'sumalab', 'miradia'];

/* -------------------------------------------------------------------------- */
/*  ヘルパ                                                                    */
/* -------------------------------------------------------------------------- */

function jstIso(d = new Date()) {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .replace(/Z$/, '+09:00');
}

function jstDate(d = new Date()) {
  return jstIso(d).slice(0, 10);
}

function ga4DateToIso(yyyymmdd) {
  // GA4 returns `date` dimension as 'YYYYMMDD' string
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

function intOf(v) {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function floatOf(v) {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function loadCredentials() {
  const raw = process.env.GA4_SERVICE_ACCOUNT_JSON;
  if (!raw) return { creds: null, error: 'GA4_SERVICE_ACCOUNT_JSON not set' };
  try {
    const j = JSON.parse(raw);
    if (!j.client_email || !j.private_key) {
      return { creds: null, error: 'GA4_SERVICE_ACCOUNT_JSON missing client_email/private_key' };
    }
    return { creds: j, error: null };
  } catch (err) {
    return { creds: null, error: `GA4_SERVICE_ACCOUNT_JSON parse failed: ${err.message}` };
  }
}

function getPropertyId(siteId) {
  const map = {
    ainitoryu: process.env.GA4_PROPERTY_ID_AINITORYU,
    sumalab: process.env.GA4_PROPERTY_ID_SUMALAB,
    miradia: process.env.GA4_PROPERTY_ID_MIRADIA,
  };
  return map[siteId] || null;
}

/* -------------------------------------------------------------------------- */
/*  Search Console (Phase 3B)                                                 */
/*                                                                            */
/*  googleapis は重量級なので追加せず、google-auth-library でアクセストークン */
/*  だけ取り webmasters/v3 REST を直接叩く。プロパティは sites.list から      */
/*  ホスト名マッチで動的解決する (sc-domain: をドメイン一致で優先、次点で    */
/*  URL プレフィックスのホスト一致)。                                         */
/* -------------------------------------------------------------------------- */

const SC_API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3';
const SC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
/** 集計ウィンドウ (直近N日) */
const SC_DAYS = 28;
/** 前期比のための日別取得幅 (直近28日 + その前28日) */
const SC_TREND_DAYS = 56;

/** URL からホスト名 (小文字、先頭 www. は無視) を取る。パース不能なら null */
function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** JST で n 日前の YYYY-MM-DD */
function jstDateAgo(n) {
  return jstDate(new Date(Date.now() - n * 86400000));
}

/**
 * SC 用の認証済み fetch クライアントを作る。
 * google-auth-library がトークン取得/更新を面倒見るので、こちらは
 * リクエストごとに getRequestHeaders() を呼ぶだけでよい。
 */
async function createScClient(creds) {
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
    scopes: [SC_SCOPE],
  });
  const authed = await auth.getClient();
  return {
    /** @param {string} path  SC_API_BASE 以下のパス  @param {object} [body]  あれば POST */
    async request(path, body) {
      const raw = await authed.getRequestHeaders();
      // google-auth-library v10 は Headers、旧版は plain object を返すので両対応
      const authHeaders =
        typeof raw?.entries === 'function' ? Object.fromEntries(raw.entries()) : raw;
      const res = await fetch(`${SC_API_BASE}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`SC API ${res.status} ${path}: ${text.slice(0, 200)}`);
      }
      return res.json();
    },
  };
}

/** sites.list — サービスアカウントに見えている SC プロパティ一覧 (未検証は除外) */
async function listScProperties(sc) {
  const data = await sc.request('/sites');
  return (data.siteEntry || []).filter(
    (e) => e.permissionLevel && e.permissionLevel !== 'siteUnverifiedUser',
  );
}

/**
 * サイト URL のホスト名で SC プロパティを解決する。
 * sc-domain: プロパティ (ドメイン一致 / サブドメイン包含) を優先し、
 * なければ URL プレフィックスプロパティのホスト一致を使う。
 * 見つからなければ null。
 */
function resolveScProperty(siteUrl, entries) {
  const host = hostOf(siteUrl || '');
  if (!host) return null;
  let domainMatch = null;
  let urlPrefixMatch = null;
  for (const e of entries) {
    const u = e.siteUrl || '';
    if (u.startsWith('sc-domain:')) {
      const domain = u.slice('sc-domain:'.length).toLowerCase();
      if (host === domain || host.endsWith(`.${domain}`)) domainMatch = u;
    } else if (!urlPrefixMatch && hostOf(u) === host) {
      urlPrefixMatch = u;
    }
  }
  return domainMatch || urlPrefixMatch;
}

/**
 * 1 サイト分の Search Console データを取得する。
 *   - type=web 日別 56 日 → 直近28日 / 前28日の clicks・impressions 比較
 *   - type=web 合計 28 日 → searchClicks / searchImpressions / searchCtr / averagePosition
 *   - type=web query 別 28 日 top10 → topQueries
 *   - type=discover 合計 28 日 → discover.listed (impressions>=1)
 * discover はプロパティによっては使えないことがあるため個別に握りつぶし、
 * web 側の失敗のみ呼び出し元へ throw する。
 */
async function fetchScForSite(sc, property, warnings, siteId) {
  const enc = encodeURIComponent(property);
  const q = (body) => sc.request(`/sites/${enc}/searchAnalytics/query`, body);

  const [dailyRes, totalsRes, queriesRes] = await Promise.all([
    q({
      startDate: jstDateAgo(SC_TREND_DAYS - 1),
      endDate: jstDateAgo(0),
      dimensions: ['date'],
      type: 'web',
      rowLimit: SC_TREND_DAYS + 5,
      dataState: 'all',
    }),
    q({
      startDate: jstDateAgo(SC_DAYS - 1),
      endDate: jstDateAgo(0),
      type: 'web',
      dataState: 'all',
    }),
    q({
      startDate: jstDateAgo(SC_DAYS - 1),
      endDate: jstDateAgo(0),
      dimensions: ['query'],
      type: 'web',
      rowLimit: 10,
      dataState: 'all',
    }),
  ]);

  // Discover: 掲載実績のないプロパティでは 4xx になり得るので個別 try。
  // API エラー時は listed:false 扱い + warning (未接続 null とは区別する)。
  let discover = { listed: false, impressions28d: 0, clicks28d: 0 };
  try {
    const dRes = await q({
      startDate: jstDateAgo(SC_DAYS - 1),
      endDate: jstDateAgo(0),
      type: 'discover',
      dataState: 'all',
    });
    const row = (dRes.rows || [])[0];
    const imp = row ? Math.round(row.impressions || 0) : 0;
    const clk = row ? Math.round(row.clicks || 0) : 0;
    discover = { listed: imp >= 1, impressions28d: imp, clicks28d: clk };
  } catch (err) {
    warnings.push(`SC discover query failed for ${siteId}: ${err.message}`);
  }

  const cur28Start = jstDateAgo(SC_DAYS - 1);
  const searchTrend = {
    clicks28d: 0,
    clicksPrev28d: 0,
    impressions28d: 0,
    impressionsPrev28d: 0,
  };
  for (const row of dailyRes.rows || []) {
    const date = row.keys?.[0] || '';
    const clicks = Math.round(row.clicks || 0);
    const impressions = Math.round(row.impressions || 0);
    if (date >= cur28Start) {
      searchTrend.clicks28d += clicks;
      searchTrend.impressions28d += impressions;
    } else {
      searchTrend.clicksPrev28d += clicks;
      searchTrend.impressionsPrev28d += impressions;
    }
  }

  const t = (totalsRes.rows || [])[0] || {};
  return {
    totals: {
      searchClicks: Math.round(t.clicks || 0),
      searchImpressions: Math.round(t.impressions || 0),
      searchCtr: Number((t.ctr || 0).toFixed(4)),
      averagePosition: Number((t.position || 0).toFixed(1)),
    },
    topQueries: (queriesRes.rows || []).map((r) => ({
      query: r.keys?.[0] || '(unknown)',
      clicks: Math.round(r.clicks || 0),
      impressions: Math.round(r.impressions || 0),
      ctr: Number((r.ctr || 0).toFixed(4)),
      position: Number((r.position || 0).toFixed(1)),
    })),
    searchTrend,
    discover,
  };
}

/* -------------------------------------------------------------------------- */
/*  記事ごとの動性 (Article Momentum) — 分類・選定の定数とロジック            */
/* -------------------------------------------------------------------------- */

// 分類しきい値（要件で定数化指定）
export const MOMENTUM = Object.freeze({
  /** 急上昇: 前週比 +30% 以上 */
  RISING_MIN_DELTA_PCT: 30,
  /** 急上昇: かつ 今週PV >= 10 */
  RISING_MIN_PV7: 10,
  /** 下降: 前週比 -30% 以下 */
  FALLING_MAX_DELTA_PCT: -30,
  /** 下降: かつ 前週PV >= 10 */
  FALLING_MIN_PV_PREV7: 10,
  /** 対象記事の選定: 7日PV上位N */
  SELECT_TOP_PV: 20,
  /** 対象記事の選定: 前週比の絶対値上位N (前週PV=0 は対象外) */
  SELECT_TOP_DELTA: 10,
  /** JSON肥大防止: 1サイトあたりの最大記事数 */
  MAX_ARTICLES_PER_SITE: 30,
  /** デイリー推移の日数 */
  TREND_DAYS: 14,
});

/** 前週比(%)。前週PV=0 のときは null（新着扱い） */
export function calcDeltaPct(pv7, pvPrev7) {
  if (pvPrev7 === 0) return null;
  return Number((((pv7 - pvPrev7) / pvPrev7) * 100).toFixed(1));
}

/**
 * 記事の動性ステータス分類:
 *   - 新着:   前週PV=0 かつ 今週PV>0
 *   - 急上昇: 前週比 +30% 以上 かつ 今週PV>=10
 *   - 下降:   前週比 -30% 以下 かつ 前週PV>=10
 *   - 安定:   それ以外
 */
export function classifyArticle(pv7, pvPrev7) {
  const deltaPct = calcDeltaPct(pv7, pvPrev7);
  if (pvPrev7 === 0 && pv7 > 0) return 'new';
  if (deltaPct !== null && deltaPct >= MOMENTUM.RISING_MIN_DELTA_PCT && pv7 >= MOMENTUM.RISING_MIN_PV7) {
    return 'rising';
  }
  if (deltaPct !== null && deltaPct <= MOMENTUM.FALLING_MAX_DELTA_PCT && pvPrev7 >= MOMENTUM.FALLING_MIN_PV_PREV7) {
    return 'falling';
  }
  return 'stable';
}

/** JST で直近 N 日の YYYY-MM-DD リスト（昇順・今日を含む） */
function lastNDatesJst(n) {
  const out = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i -= 1) {
    out.push(jstDate(new Date(now - i * 86400000)));
  }
  return out;
}

/**
 * 記事ごとの動性データを取得する。
 *   クエリ1: 直近7日 + その前7日 の 2 dateRanges で記事別PVと前週比
 *   クエリ2: 選定した記事に絞った直近14日のデイリー推移
 * 選定は「7日PV上位20」∪「前週比の絶対値上位10」∪「新着」、最大30記事/サイト。
 *
 * @returns {Promise<Array<{path:string,title:string,pv7:number,pvPrev7:number,deltaPct:number|null,status:string,trend:number[]}>>}
 */
async function fetchArticleMomentum(client, property) {
  // ---- クエリ1: 記事別 今週/前週 PV ----
  const [cmpRes] = await client.runReport({
    property,
    dateRanges: [
      { startDate: '6daysAgo', endDate: 'today', name: 'current7' },
      { startDate: '13daysAgo', endDate: '7daysAgo', name: 'previous7' },
    ],
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }],
    limit: 5000,
  });

  // 2 dateRanges 指定時、GA4 は dateRange ディメンションを行末尾に自動付与する
  const byPath = new Map();
  for (const row of cmpRes.rows || []) {
    const path = row.dimensionValues[0].value || '/';
    const title = row.dimensionValues[1].value || path;
    const rangeName = row.dimensionValues[2]?.value || 'current7';
    const views = intOf(row.metricValues[0].value);
    const entry = byPath.get(path) || { path, title, pv7: 0, pvPrev7: 0 };
    if (title) entry.title = title;
    if (rangeName === 'previous7' || rangeName === 'date_range_1') {
      entry.pvPrev7 += views;
    } else {
      entry.pv7 += views;
    }
    byPath.set(path, entry);
  }

  const all = [...byPath.values()].map((a) => ({
    ...a,
    deltaPct: calcDeltaPct(a.pv7, a.pvPrev7),
  }));

  // ---- 選定: 7日PV上位20 ∪ 前週比絶対値上位10 ∪ 新着、最大30 ----
  const picked = new Map();
  const pick = (a) => {
    if (picked.size >= MOMENTUM.MAX_ARTICLES_PER_SITE) return;
    if (!picked.has(a.path)) picked.set(a.path, a);
  };
  [...all].sort((x, y) => y.pv7 - x.pv7).slice(0, MOMENTUM.SELECT_TOP_PV).forEach(pick);
  [...all]
    .filter((a) => a.deltaPct !== null)
    .sort((x, y) => Math.abs(y.deltaPct) - Math.abs(x.deltaPct))
    .slice(0, MOMENTUM.SELECT_TOP_DELTA)
    .forEach(pick);
  [...all]
    .filter((a) => a.pvPrev7 === 0 && a.pv7 > 0)
    .sort((x, y) => y.pv7 - x.pv7)
    .forEach(pick);

  if (picked.size === 0) return [];

  // ---- クエリ2: 選定記事の直近14日デイリー推移 ----
  const [trendRes] = await client.runReport({
    property,
    dateRanges: [{ startDate: `${MOMENTUM.TREND_DAYS - 1}daysAgo`, endDate: 'today' }],
    dimensions: [{ name: 'date' }, { name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    dimensionFilter: {
      filter: {
        fieldName: 'pagePath',
        inListFilter: { values: [...picked.keys()] },
      },
    },
    limit: 10000,
  });

  const dailyByPathDate = new Map();
  for (const row of trendRes.rows || []) {
    const date = ga4DateToIso(row.dimensionValues[0].value);
    const path = row.dimensionValues[1].value || '/';
    dailyByPathDate.set(`${path}\n${date}`, intOf(row.metricValues[0].value));
  }
  const dates = lastNDatesJst(MOMENTUM.TREND_DAYS);

  return [...picked.values()]
    .map((a) => ({
      path: a.path,
      title: a.title,
      pv7: a.pv7,
      pvPrev7: a.pvPrev7,
      deltaPct: a.deltaPct,
      status: classifyArticle(a.pv7, a.pvPrev7),
      trend: dates.map((d) => dailyByPathDate.get(`${a.path}\n${d}`) || 0),
    }))
    .sort((x, y) => y.pv7 - x.pv7);
}

/* -------------------------------------------------------------------------- */
/*  GA4 取得 — 1 サイト分                                                     */
/* -------------------------------------------------------------------------- */

/**
 * @param {import('@google-analytics/data').BetaAnalyticsDataClient} client
 * @param {string} propertyId
 * @param {{ id: string, name: string }} siteMeta
 */
async function fetchSiteFromGa4(client, propertyId, siteMeta) {
  const property = `properties/${propertyId}`;

  const dailyMetrics = [
    { name: 'screenPageViews' },
    { name: 'activeUsers' },
    { name: 'sessions' },
    { name: 'engagedSessions' },
  ];
  const pageMetrics = [
    { name: 'screenPageViews' },
    { name: 'activeUsers' },
    { name: 'sessions' },
  ];

  const [dailyRes, pages90Res, pages28Res, pages7Res, channelRes, deviceRes, referrerRes] = await Promise.all([
    // 1) 日別サイト合計 (90 日)
    client.runReport({
      property,
      dateRanges: [{ startDate: '89daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: dailyMetrics,
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    // 2) ページ別 (90 日 top 50)
    client.runReport({
      property,
      dateRanges: [{ startDate: '89daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: pageMetrics,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 50,
    }),
    // 3) ページ別 (28 日 top 50)
    client.runReport({
      property,
      dateRanges: [{ startDate: '27daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: pageMetrics,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 50,
    }),
    // 4) ページ別 (7 日 top 50)
    client.runReport({
      property,
      dateRanges: [{ startDate: '6daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: pageMetrics,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 50,
    }),
    // 5) チャネル別 (28 日)
    client.runReport({
      property,
      dateRanges: [{ startDate: '27daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: pageMetrics,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    }),
    // 6) デバイス別 (28 日)
    client.runReport({
      property,
      dateRanges: [{ startDate: '27daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: pageMetrics,
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    }),
    // 7) リファラー別 (28 日) — internalNavShare (サイト内回遊の PV 割合) 算出用
    client.runReport({
      property,
      dateRanges: [{ startDate: '27daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pageReferrer' }],
      metrics: [{ name: 'screenPageViews' }],
      limit: 10000,
    }),
  ]);

  // ---- daily ----
  const dailySiteStats = (dailyRes[0].rows || [])
    .map((r) => ({
      date: ga4DateToIso(r.dimensionValues[0].value),
      views: intOf(r.metricValues[0].value),
      users: intOf(r.metricValues[1].value),
      sessions: intOf(r.metricValues[2].value),
      engagedSessions: intOf(r.metricValues[3].value),
    }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => ({
      ...r,
      engagementRate: r.sessions > 0 ? r.engagedSessions / r.sessions : 0,
    }));

  const sumLast = (rows, days) => {
    const lastN = rows.slice(-days);
    return {
      views: lastN.reduce((a, x) => a + x.views, 0),
      users: lastN.reduce((a, x) => a + x.users, 0),
      sessions: lastN.reduce((a, x) => a + x.sessions, 0),
      engagedSessions: lastN.reduce((a, x) => a + x.engagedSessions, 0),
    };
  };
  const r7 = sumLast(dailySiteStats, 7);
  const r28 = sumLast(dailySiteStats, 28);
  const r90 = sumLast(dailySiteStats, 90);

  const totals = {
    views7d: r7.views,
    views28d: r28.views,
    views90d: r90.views,
    users28d: r28.users,
    sessions28d: r28.sessions,
    avgEngagementRate28d: r28.sessions > 0 ? r28.engagedSessions / r28.sessions : 0,
  };

  // ---- pages: merge 7d/28d/90d by path ----
  const pageMap = new Map();
  const ingestPages = (res, key) => {
    for (const row of res[0].rows || []) {
      const path = row.dimensionValues[0].value || '/';
      const title = row.dimensionValues[1].value || path;
      const views = intOf(row.metricValues[0].value);
      const users = intOf(row.metricValues[1].value);
      const sessions = intOf(row.metricValues[2].value);
      const entry =
        pageMap.get(path) || {
          path,
          title,
          views7d: 0,
          views28d: 0,
          views90d: 0,
          users28d: 0,
          sessions28d: 0,
        };
      if (title) entry.title = title;
      entry[`views${key}`] = views;
      if (key === '28d') {
        entry.users28d = users;
        entry.sessions28d = sessions;
      }
      pageMap.set(path, entry);
    }
  };
  ingestPages(pages90Res, '90d');
  ingestPages(pages28Res, '28d');
  ingestPages(pages7Res, '7d');
  const pageStats = [...pageMap.values()]
    .sort((a, b) => b.views90d - a.views90d)
    .slice(0, 50);

  // ---- channels / devices ----
  const channelStats = (channelRes[0].rows || []).map((r) => ({
    channel: r.dimensionValues[0].value || '(unknown)',
    views: intOf(r.metricValues[0].value),
    users: intOf(r.metricValues[1].value),
    sessions: intOf(r.metricValues[2].value),
  }));
  const deviceStats = (deviceRes[0].rows || []).map((r) => ({
    device: r.dimensionValues[0].value || '(unknown)',
    views: intOf(r.metricValues[0].value),
    users: intOf(r.metricValues[1].value),
    sessions: intOf(r.metricValues[2].value),
  }));

  // ---- trend scores ----
  const trendScores = pageStats
    .filter((p) => p.views28d >= 20)
    .map((p) => {
      const score = p.views28d > 0 ? (p.views7d / 7) / (p.views28d / 28) : 0;
      return {
        path: p.path,
        title: p.title,
        views7d: p.views7d,
        views28d: p.views28d,
        views90d: p.views90d,
        trendScore: Number(score.toFixed(3)),
      };
    })
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 10);

  // ---- internalNavShare: リファラーが自サイトの PV / 全 PV (0〜1) ----
  // pageReferrer で group した全行の合計は総 PV に一致する ((not set) 含む) ので、
  // それを分母に、リファラーのホストが自サイトと同一の行だけ分子に積む。
  const siteHost = hostOf(siteMeta.url || '');
  let internalViews = 0;
  let totalReferrerViews = 0;
  for (const r of referrerRes[0].rows || []) {
    const views = intOf(r.metricValues[0].value);
    totalReferrerViews += views;
    if (siteHost && hostOf(r.dimensionValues[0].value || '') === siteHost) {
      internalViews += views;
    }
  }
  const internalNavShare =
    totalReferrerViews > 0 ? Number((internalViews / totalReferrerViews).toFixed(4)) : 0;

  // ---- 記事ごとの動性 (前週比 + 14日デイリー推移) ----
  const articles = await fetchArticleMomentum(client, property);

  return {
    siteId: siteMeta.id,
    totals,
    dailySiteStats,
    pageStats,
    channelStats,
    deviceStats,
    trendScores,
    // sites[] へ写す一時フィールド（stats には残さない: main 側で削除）
    articles,
    internalNavShare,
    source: 'ga4',
    fetchedAt: jstIso(),
  };
}

/* -------------------------------------------------------------------------- */
/*  既存 UI 用 SiteDashboard へのマッピング (sites[])                          */
/* -------------------------------------------------------------------------- */

/**
 * @param {object} statsBlock  fetchSiteFromGa4 の戻り値
 * @param {object} sampleSite  sample-dashboard.json の該当サイト (表示メタ / improvements 供給元)
 * @param {object|null} scData  fetchScForSite の戻り値。SC 未接続 / 失敗時は null
 * @param {'sc'|'none'} searchSource  scData が入っていれば 'sc'
 */
function buildSiteDashboardFromStats(statsBlock, sampleSite, scData, searchSource) {
  const daily = statsBlock.dailySiteStats;
  const last28 = daily.slice(-28);
  const lastDay = daily[daily.length - 1];
  const prevDay = daily[daily.length - 2];

  return {
    site: sampleSite.site, // 表示用メタ (色 / カテゴリ) はサンプル維持
    metrics: {
      todayViews: lastDay ? lastDay.views : 0,
      yesterdayViews: prevDay ? prevDay.views : 0,
      last7DaysViews: statsBlock.totals.views7d,
      last28DaysViews: statsBlock.totals.views28d,
      users: statsBlock.totals.users28d,
      sessions: statsBlock.totals.sessions28d,
      // Search Console live 値。未接続 (searchSource: 'none') は 0 で埋める
      // — sample の架空値を live サイトに混ぜると誤読を招くため使わない。
      searchClicks: scData ? scData.totals.searchClicks : 0,
      searchImpressions: scData ? scData.totals.searchImpressions : 0,
      searchCtr: scData ? scData.totals.searchCtr : 0,
      averagePosition: scData ? scData.totals.averagePosition : 0,
    },
    dailyViews: last28.map((d) => ({ date: d.date, views: d.views })),
    topPages: statsBlock.pageStats.slice(0, 10).map((p) => ({
      path: p.path,
      title: p.title,
      views: p.views28d,
    })),
    risingPages: statsBlock.trendScores.slice(0, 5).map((t) => ({
      path: t.path,
      title: t.title,
      views: t.views7d,
      delta: t.trendScore - 1,
    })),
    topQueries: scData ? scData.topQueries : [],
    improvements: sampleSite.improvements ?? [],
    // 記事ごとの動性 (ArticleMomentum UI 用)
    articles: statsBlock.articles ?? [],
    // ---- Phase 3B ----
    searchSource,
    // undefined は JSON.stringify で落ちるので、未接続時も null 込みの形で出す
    discover: scData ? scData.discover : { listed: null, impressions28d: 0, clicks28d: 0 },
    searchTrend: scData ? scData.searchTrend : undefined,
    internalNavShare: statsBlock.internalNavShare,
    source: 'mixed', // GA4 (+ SC)
    fetchedAt: statsBlock.fetchedAt,
  };
}

/* -------------------------------------------------------------------------- */
/*  メイン                                                                    */
/* -------------------------------------------------------------------------- */

async function main() {
  const sample = JSON.parse(await readFile(SAMPLE_PATH, 'utf8'));
  const sampleBySite = new Map(sample.sites.map((s) => [s.site.id, s]));

  const { creds, error: credError } = loadCredentials();
  const warnings = [];
  let dataSource = 'sample';

  // GA4 credentials なし → 全サイト sample
  if (!creds) {
    console.warn(`[fetch-dashboard-data] ${credError || 'no GA4 credentials'} — sample fallback for all sites.`);
    warnings.push(credError || 'GA4 credentials missing');
    const now = jstIso();
    sample.generatedAt = now;
    for (const s of sample.sites) {
      s.fetchedAt = now;
      s.source = 'sample';
    }
    sample.stats = {
      generatedAt: now,
      dataRange: { start: '', end: jstDate(), days: 0 },
      meta: { warnings, source: 'sample' },
      siteStats: [],
    };
    await write(sample);
    return;
  }

  // GA4 取得
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: creds.client_email,
      private_key: creds.private_key,
    },
    projectId: creds.project_id,
  });

  // Search Console — 同じ鍵で webmasters.readonly トークンを取り、
  // sites.list を 1 回だけ呼んでプロパティ一覧をキャッシュする。
  // ここで失敗しても warning を積んで続行 (全サイト searchSource: 'none')。
  let sc = null;
  let scEntries = [];
  try {
    sc = await createScClient(creds);
    scEntries = await listScProperties(sc);
    console.log(
      `[fetch-dashboard-data] Search Console: ${scEntries.length} properties visible to service account`,
    );
  } catch (err) {
    const msg = `Search Console unavailable: ${err.message}`;
    console.warn(`[fetch-dashboard-data] ${msg}`);
    warnings.push(msg);
    sc = null;
  }

  const siteStatsBlocks = [];
  const newSites = [];
  let liveCount = 0;

  for (const siteId of SITE_KEYS) {
    const sampleSite = sampleBySite.get(siteId);
    const propertyId = getPropertyId(siteId);
    if (!propertyId) {
      const msg = `GA4_PROPERTY_ID_${siteId.toUpperCase()} not set — using sample for ${siteId}`;
      console.warn(`[fetch-dashboard-data] ${msg}`);
      warnings.push(msg);
      newSites.push({ ...sampleSite, source: 'sample', fetchedAt: jstIso() });
      continue;
    }
    try {
      const statsBlock = await fetchSiteFromGa4(client, propertyId, sampleSite.site);
      // 機能A: 取得成功でも直近7日の合計PVが0なら WARN（タグ未設置の検知。
      // すまラボのGA4タグ未設置がログ上は正常扱いになっていた事故の再発防止）
      if (statsBlock.totals.views7d === 0) {
        const zeroMsg = `${siteId}: GA4 returned 0 total pageviews for last 7 days (tag missing?)`;
        console.warn(`[fetch-dashboard-data] WARN ${zeroMsg}`);
        warnings.push(zeroMsg);
      }
      // ---- Search Console (SC 失敗は per-site warning に留め GA4 は活かす) ----
      let scData = null;
      let searchSource = 'none';
      if (sc) {
        const scProperty = resolveScProperty(sampleSite.site.url, scEntries);
        if (!scProperty) {
          const msg = `SC property not resolved for ${siteId} (no sites.list entry matches host of ${sampleSite.site.url || '(no url)'})`;
          console.warn(`[fetch-dashboard-data] ${msg}`);
          warnings.push(msg);
        } else {
          try {
            scData = await fetchScForSite(sc, scProperty, warnings, siteId);
            searchSource = 'sc';
            console.log(
              `[fetch-dashboard-data] ${siteId}: SC fetch OK (property=${scProperty}, ${scData.topQueries.length} queries, discover.listed=${scData.discover.listed})`,
            );
          } catch (err) {
            const msg = `SC fetch failed for ${siteId}: ${err.message}`;
            console.warn(`[fetch-dashboard-data] ${msg}`);
            warnings.push(msg);
          }
        }
      }

      const dashboardSite = buildSiteDashboardFromStats(statsBlock, sampleSite, scData, searchSource);
      // articles / internalNavShare は sites[] 側にのみ持たせる（stats 側と二重に持たない = JSON肥大防止）
      delete statsBlock.articles;
      delete statsBlock.internalNavShare;
      siteStatsBlocks.push(statsBlock);
      newSites.push(dashboardSite);
      liveCount += 1;
      console.log(`[fetch-dashboard-data] ${siteId}: GA4 fetch OK (${statsBlock.dailySiteStats.length} days, ${statsBlock.pageStats.length} pages, ${dashboardSite.articles.length} momentum articles)`);
    } catch (err) {
      const msg = `GA4 fetch failed for ${siteId}: ${err.message}`;
      console.warn(`[fetch-dashboard-data] ${msg}`);
      warnings.push(msg);
      newSites.push({ ...sampleSite, source: 'sample', fetchedAt: jstIso() });
    }
  }

  if (liveCount === 0) {
    dataSource = 'sample';
  } else if (liveCount === SITE_KEYS.length) {
    dataSource = 'ga4';
  } else {
    dataSource = 'mixed';
  }

  const end = jstDate();
  const start = siteStatsBlocks[0]?.dailySiteStats[0]?.date || '';
  const days = start && end ? (Date.parse(end) - Date.parse(start)) / 86400000 + 1 : 0;

  const snapshot = {
    generatedAt: jstIso(),
    sites: newSites,
    stats: {
      generatedAt: jstIso(),
      dataRange: { start, end, days },
      meta: { warnings, source: dataSource },
      siteStats: siteStatsBlocks,
    },
  };

  await write(snapshot);
}

async function write(snapshot) {
  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`[fetch-dashboard-data] Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('[fetch-dashboard-data] Failed:', err);
  process.exit(1);
});
