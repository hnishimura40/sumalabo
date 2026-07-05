#!/usr/bin/env node
// scripts/automation/scout.mjs — ネタ選定（watch-sources / スコアラー / 除外 / dedupe）。
//
// 目的: 公開 RSS（有料 API 不使用）から候補を集め、すまラボ向けに採点し、
// 除外カテゴリと既出記事の dedupe を通したランキングを出す。
// testMode（autoPick）中は上位 1 件を自動採用する。
//
// 設定: data/automation/watch-sources.json
//   sources[] / minScore / maxAgeHours / excludeCategories / tier1-2 / impactKeywords
//
// 採点（0-100 目安）:
//   +30..0  鮮度（6h/24h/48h の段階）
//   +24 max tier1 キーワード（AI・主要製品名）×8
//   +12 max tier2 キーワード（発表・料金・日本 等）×4
//   +8      インパクト語（値上げ/無料/提供終了 等）
//   +weight ソース信頼度（設定値。公式は高め）
//
// 除外:
//   - 除外カテゴリ語（事件・政治・訴訟・相場・アダルト）を含む → excluded
//   - 既出 dedupe: 既存記事タイトル・過去採用済み candidates とのトークン重なり
//     （Jaccard >= 0.5）→ excluded
//
// 出力:
//   logs/scout/{YYYY-MM-DD}.json（全候補・採点・除外理由）+ コンソールに上位表
//   --auto-pick: 閾値以上の 1 位を {picked} として JSON 出力（testMode 用）。
//                採用したものは data/automation/scout-picked.json に記録し翌晩以降 dedupe。
//
// CLI:
//   node scripts/automation/scout.mjs [--auto-pick] [--limit 10] [--json]
// 終了コード: 0=候補あり / 10=閾値以上の候補なし / 1=エラー

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG_PATH = path.join(ROOT, "data", "automation", "watch-sources.json");
const PICKED_PATH = path.join(ROOT, "data", "automation", "scout-picked.json");
const ARTICLES_DIR = path.join(ROOT, "content", "articles");

export function loadConfig(p = CONFIG_PATH) {
  return JSON.parse(readFileSync(p, "utf-8"));
}

// ---- RSS 取得・パース（RSS2.0 / RSS1.0(RDF) / Atom の title+link+pubDate を雑に拾う） ----
function decodeEntities(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .trim();
}

export function parseFeed(xml) {
  const items = [];
  const blocks = String(xml).match(/<(item|entry)[\s\S]*?<\/\1>/g) || [];
  for (const block of blocks) {
    const title = decodeEntities((block.match(/<title[^>]*>([\s\S]*?)<\/title>/) || [])[1] || "");
    let link = decodeEntities((block.match(/<link[^>]*>([\s\S]*?)<\/link>/) || [])[1] || "");
    if (!link) link = decodeEntities((block.match(/<link[^>]*href="([^"]+)"/) || [])[1] || "");
    const date =
      (block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] ||
      (block.match(/<dc:date>([\s\S]*?)<\/dc:date>/) || [])[1] ||
      (block.match(/<updated>([\s\S]*?)<\/updated>/) || [])[1] ||
      "";
    const description = decodeEntities(((block.match(/<description[^>]*>([\s\S]*?)<\/description>/) || [])[1] || "").replace(/<[^>]+>/g, " ")).slice(0, 300);
    if (title) items.push({ title, link, pubDate: date.trim(), description });
  }
  return items;
}

async function fetchFeed(source) {
  try {
    const res = await fetch(source.url, {
      headers: { "User-Agent": "Mozilla/5.0 (sumalabo-scout)" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { source: source.id, ok: false, reason: `http_${res.status}`, items: [] };
    const xml = await res.text();
    return { source: source.id, ok: true, items: parseFeed(xml) };
  } catch (e) {
    return { source: source.id, ok: false, reason: e && e.message, items: [] };
  }
}

// ---- 採点・除外・dedupe（純関数） ----
export function ageHours(pubDate, now = Date.now()) {
  const t = Date.parse(pubDate);
  if (!Number.isFinite(t)) return Infinity;
  return (now - t) / 3600_000;
}

export function scoreItem(item, source, config, now = Date.now()) {
  const text = `${item.title} ${item.description || ""}`;
  const h = ageHours(item.pubDate, now);
  let recency = 0;
  if (h <= 6) recency = 30;
  else if (h <= 24) recency = 22;
  else if (h <= 48) recency = 12;
  else if (h <= 72) recency = 5;
  const tier1Hits = (config.tier1Keywords || []).filter((k) => text.toLowerCase().includes(k.toLowerCase()));
  const tier2Hits = (config.tier2Keywords || []).filter((k) => text.includes(k));
  const impactHits = (config.impactKeywords || []).filter((k) => text.includes(k));
  const tier1 = Math.min(24, tier1Hits.length * 8);
  const tier2 = Math.min(12, tier2Hits.length * 4);
  const impact = impactHits.length > 0 ? 8 : 0;
  const weight = Number(source.weight) || 0;
  return {
    score: recency + tier1 + tier2 + impact + weight,
    breakdown: { recency, tier1, tier2, impact, sourceWeight: weight },
    matched: { tier1: tier1Hits, tier2: tier2Hits, impact: impactHits },
    ageHours: Math.round(h * 10) / 10,
  };
}

export function findExclusion(item, config) {
  const text = `${item.title} ${item.description || ""}`;
  for (const [category, words] of Object.entries(config.excludeCategories || {})) {
    const hit = words.find((w) => text.includes(w));
    if (hit) return { category, word: hit };
  }
  return null;
}

export function tokenize(title) {
  // 日本語はスペース区切りされないため、ASCII 語 + CJK バイグラムでトークン化する
  const s = String(title).toLowerCase();
  const tokens = new Set();
  for (const m of s.match(/[a-z0-9][a-z0-9.\-]*/g) || []) {
    if (m.length >= 2) tokens.add(m);
  }
  const cjkRuns = s.match(/[぀-ヿ㐀-鿿]+/g) || [];
  for (const run of cjkRuns) {
    if (run.length === 1) continue;
    for (let i = 0; i < run.length - 1; i++) tokens.add(run.slice(i, i + 2));
  }
  return tokens;
}

export function titleSimilarity(a, b) {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter);
}

export function findDuplicate(item, knownTitles, threshold = 0.3) {
  for (const known of knownTitles) {
    const sim = titleSimilarity(item.title, known);
    if (sim >= threshold) return { against: known, similarity: Math.round(sim * 100) / 100 };
  }
  return null;
}

function loadKnownTitles() {
  const titles = [];
  // 既存記事の frontmatter title
  if (existsSync(ARTICLES_DIR)) {
    for (const f of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx"))) {
      try {
        const raw = readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
        const m = raw.match(/^title:\s*"([^"]+)"/m);
        if (m) titles.push(m[1]);
      } catch {}
    }
  }
  // 過去に scout が採用した候補
  if (existsSync(PICKED_PATH)) {
    try {
      for (const p of JSON.parse(readFileSync(PICKED_PATH, "utf-8"))) {
        if (p && p.title) titles.push(p.title);
      }
    } catch {}
  }
  return titles;
}

export function slugFromPick(pick, now = new Date()) {
  const ym = new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 7).replace("-", "");
  const ascii = pick.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .split("-")
    .filter(Boolean)
    .slice(0, 6)
    .join("-");
  const base = ascii && ascii.length >= 8 ? ascii : `scout-${Date.now().toString(36)}`;
  return `${ym}-${base}`.slice(0, 80);
}

// ---- 本体 ----
export async function runScout({ config = loadConfig(), now = Date.now() } = {}) {
  const results = await Promise.all((config.sources || []).map((s) => fetchFeed(s)));
  const knownTitles = loadKnownTitles();
  const seen = new Set();
  const candidates = [];
  const excluded = [];
  const sourceStatus = results.map((r) => ({ source: r.source, ok: r.ok, items: r.items.length, reason: r.reason }));

  for (const r of results) {
    const source = (config.sources || []).find((s) => s.id === r.source) || {};
    for (const item of r.items) {
      const key = item.title.slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      const h = ageHours(item.pubDate, now);
      if (h > (config.maxAgeHours || 48)) continue; // 古すぎは黙って捨てる（ノイズ）
      const exclusion = findExclusion(item, config);
      if (exclusion) {
        excluded.push({ title: item.title, source: r.source, reason: "excluded_category", ...exclusion });
        continue;
      }
      const dup = findDuplicate(item, knownTitles);
      if (dup) {
        excluded.push({ title: item.title, source: r.source, reason: "duplicate", ...dup });
        continue;
      }
      const scored = scoreItem(item, source, config, now);
      candidates.push({ ...item, source: r.source, sourceName: source.name, ...scored });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return { candidates, excluded, sourceStatus, minScore: config.minScore || 50 };
}

function saveScoutLog(result) {
  const dir = path.join(ROOT, "logs", "scout");
  mkdirSync(dir, { recursive: true });
  const date = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
  const p = path.join(dir, `${date}.json`);
  writeFileSync(p, JSON.stringify({ at: new Date().toISOString(), ...result }, null, 2) + "\n", "utf-8");
  return p;
}

function recordPicked(pick) {
  let arr = [];
  if (existsSync(PICKED_PATH)) {
    try {
      arr = JSON.parse(readFileSync(PICKED_PATH, "utf-8"));
    } catch {}
  }
  arr.push({ title: pick.title, link: pick.link, score: pick.score, at: new Date().toISOString() });
  writeFileSync(PICKED_PATH, JSON.stringify(arr, null, 2) + "\n", "utf-8");
}

async function main() {
  const argv = process.argv.slice(2);
  const autoPick = argv.includes("--auto-pick");
  const asJson = argv.includes("--json");
  const limitIdx = argv.indexOf("--limit");
  const limit = limitIdx >= 0 ? Number(argv[limitIdx + 1]) : 10;

  const result = await runScout();
  const logPath = saveScoutLog(result);
  const top = result.candidates.slice(0, limit);

  if (asJson || autoPick) {
    const eligible = result.candidates.filter((c) => c.score >= result.minScore);
    const picked = autoPick && eligible.length > 0 ? eligible[0] : null;
    if (picked) {
      picked.suggestedSlug = slugFromPick(picked);
      recordPicked(picked);
    }
    console.log(
      JSON.stringify(
        {
          picked,
          top: top.map((c) => ({ score: c.score, title: c.title, source: c.source, ageHours: c.ageHours, breakdown: c.breakdown })),
          excludedCount: result.excluded.length,
          excludedSample: result.excluded.slice(0, 8),
          sourceStatus: result.sourceStatus,
          minScore: result.minScore,
          logPath: path.relative(ROOT, logPath),
        },
        null,
        2,
      ),
    );
    process.exitCode = autoPick && !picked ? 10 : 0;
    return;
  }

  console.log(`=== scout: 候補 ${result.candidates.length} 件 / 除外 ${result.excluded.length} 件（閾値 ${result.minScore}） ===`);
  for (const c of top) {
    console.log(`  [${String(c.score).padStart(3)}] ${c.title.slice(0, 60)} (${c.source}, ${c.ageHours}h)`);
  }
  console.log(`log: ${path.relative(ROOT, logPath)}`);
  process.exitCode = result.candidates.some((c) => c.score >= result.minScore) ? 0 : 10;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[scout fatal]", e && e.message ? e.message : e);
    process.exitCode = 1;
  });
}
