#!/usr/bin/env node
/**
 * dashboard/scripts/fetch-dashboard-data.mjs
 *
 * ダッシュボード用のライブJSON (public/data/dashboard-latest.json) を生成するスクリプト。
 *
 * Phase 3A (現状):
 *   - GA4 Data API から各サイトの日別 / ページ別 / チャネル別 / デバイス別データを取得。
 *   - 既存 UI 互換の sites[] と、後段分析用の stats を 1 つの snapshot にまとめて書き出す。
 *   - GA4 credentials / property ID が揃わないサイトは sample にフォールバック (画面側で 🟡)。
 *   - Search Console 連携は Phase 3B で別途実装する (本スクリプトでは sample の topQueries / 検索メトリクスを残置)。
 *
 * 使う Secrets (GitHub Actions / 環境変数):
 *   - GA4_SERVICE_ACCOUNT_JSON         サービスアカウント鍵 JSON 全文 (3 サイト兼用)
 *   - GA4_PROPERTY_ID_AINITORYU        GA4 プロパティ ID (数値文字列)
 *   - GA4_PROPERTY_ID_SUMALAB          同上
 *   - GA4_PROPERTY_ID_MIRADIA          同上
 *
 * まだ使わない Secrets (Phase 3B):
 *   - SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON
 *   - SEARCH_CONSOLE_SITE_AINITORYU / _SUMALAB / _MIRADIA
 *
 * 出力:
 *   - dashboard/public/data/dashboard-latest.json (gitignore 対象、commit しない)
 *   - GitHub Actions ランナー内で生成 → Wrangler が dist/ ごと Cloudflare Pages へ Direct Upload。
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

  const [dailyRes, pages90Res, pages28Res, pages7Res, channelRes, deviceRes] = await Promise.all([
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
    // sites[].articles へ写す一時フィールド（stats には残さない: main 側で削除）
    articles,
    source: 'ga4',
    fetchedAt: jstIso(),
  };
}

/* -------------------------------------------------------------------------- */
/*  既存 UI 用 SiteDashboard へのマッピング (sites[])                          */
/* -------------------------------------------------------------------------- */

function buildSiteDashboardFromStats(statsBlock, sampleSite) {
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
      // Search Console 系は Phase 3B まで sample 値を残す
      searchClicks: sampleSite.metrics?.searchClicks ?? 0,
      searchImpressions: sampleSite.metrics?.searchImpressions ?? 0,
      searchCtr: sampleSite.metrics?.searchCtr ?? 0,
      averagePosition: sampleSite.metrics?.averagePosition ?? 0,
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
    // Search Console 由来の項目は sample 維持 (Phase 3B で差し替え)
    topQueries: sampleSite.topQueries ?? [],
    improvements: sampleSite.improvements ?? [],
    // 記事ごとの動性 (ArticleMomentum UI 用)
    articles: statsBlock.articles ?? [],
    source: 'mixed', // GA4 + sample(SC)
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
      const dashboardSite = buildSiteDashboardFromStats(statsBlock, sampleSite);
      // articles は sites[] 側にのみ持たせる（stats 側と二重に持たない = JSON肥大防止）
      delete statsBlock.articles;
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
