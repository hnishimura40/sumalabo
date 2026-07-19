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
// 採点（クリティカル度＝自分ごと度を最重要軸にする・2026-07-18 方針転換）:
//   ±criticality クリティカル度（自分ごと度）＝最重要軸。加点 最大+40 / 減点 最大-20 の
//               振れ幅で、他のどの単一軸より大きくランキングを支配する。詳細は scoreCriticality。
//               加点=提供開始/終了/締切・料金/制限・日本で使える・今日できる対処・安全。
//               減点=事業者向けのみ・米国限定(日本展開見込み薄)・調査/統計・資金調達。
//   +30..0      鮮度（6h/24h/48h の段階）
//   +24 max     tier1 キーワード（AI・主要製品名）×8
//   +12 max     tier2 キーワード（発表・料金・日本 等）×4
//   +8          インパクト語（値上げ/無料/提供終了 等）
//   +weight     ソース信頼度（設定値。公式は高め）
//
// 「今日書くか」の判定（part 3・量より的中率）:
//   auto-pick は isEligible（score>=minScore かつ criticality.net>=minCriticality かつ
//   readerChange が書ける）を満たす 1 位だけ採用する。クリティカル度が低い候補しか
//   ない日は picked=null（exit 10）＝書かない日があってよい。
//
// 選定ログの言語化（part 4）: 各候補に readerChange（「この記事で読者の何が変わるか」1行）を
//   付ける。加点シグナルが 0 で readerChange が書けない候補は選ばない。
//
// 除外:
//   - 除外カテゴリ語（事件・政治・訴訟・相場・アダルト）を含む → excluded
//   - 既出 dedupe: 既存記事タイトル・過去採用済み candidates とのトークン重なり
//     （Jaccard >= 0.5）→ excluded
//
// 既報テーマペナルティ（2026-07-12）:
//   - 公開済み記事 slug / 採用済み候補の suggestedSlug とエンティティ照合し、
//     重み付き一致 >= 2 でスコア -40（除外ではなく減点。ログで観察可能）
//   - これにより「1位が既報で全部やめる」ではなく、次点の適格候補へ自動で
//     繰り下がる（auto-pick は減点後スコアで閾値以上の 1 位を採る）
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
import { classifyArticleCategory } from "../sumahon/category-classification.mjs";

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

// ---- クリティカル度（自分ごと度）＝最重要軸（2026-07-18 方針転換） ----
//
// 選定基準を「ニュースの大きさ」から「読者の自分ごと度」に変更。
// 判定: 日本で ChatGPT/Claude/スマホを日常利用する人が、この記事を読んで
// 今日〜今週の行動や判断を変えるか。加点(最大 POSITIVE_CAP)と減点で評価し、
// 加点の最大 40 / 減点の最大 -20 という「他のどの単一軸(鮮度30・tier1 24)より
// 大きい振れ幅」でランキングを支配する＝最重要の重み。
//
// 加点（読者の行動が変わる兆候）:
//   availability  使えるものが増える/減る/締切（提供開始・終了・期限・撤廃・開放）
//   priceLimit    料金・制限・無料枠が変わる（プラン・上限・無料枠）
//   japanUsable   日本で使える（日本提供・日本語対応）
//   actionable    今日できる対処・設定がある（データ退避・設定変更・申込）
//   safety        安全に関わる（リコール・脆弱性・詐欺）
// 減点（単体では行動が変わらない）:
//   usOnly        米国限定で日本展開の見込みが薄い（「日本にも来る流れの初報」= japanComingCues があれば減点しない＝中立）
//   businessOnly  事業者向けのみ（API価格・企業契約・開発者向け）
//   surveyStats   調査レポート/統計もの
//   funding       資金調達（人事は excludeCategories.hr_ma 側で除外済み）
//
// readerChange（part 4 の義務化）: 加点シグナルから「この記事で読者の何が変わるか」を
// 1 行で合成する。加点シグナルが 0（＝行動変化を言語化できない）候補は readerChange=null
// とし、auto-pick の対象外にする＝「書けない候補は選ばない」。
export const CRITICALITY = Object.freeze({
  AVAILABILITY: 12,
  PRICE_LIMIT: 12,
  JAPAN_USABLE: 8,
  ACTIONABLE: 8,
  SAFETY: 14,
  /** 加点の上限。criticality を最重要軸にする最大値 */
  POSITIVE_CAP: 40,
  US_ONLY: -16,
  BUSINESS_ONLY: -16,
  SURVEY_STATS: -20,
  FUNDING: -14,
});

const READER_CHANGE_TEMPLATES = Object.freeze({
  availability: "使えるもの・締切が動く（提供開始/終了/期限）",
  priceLimit: "料金・制限・無料枠が変わる",
  japanUsable: "日本で/日本語で使える",
  actionable: "今日できる対処・設定がある",
  safety: "安全に関わる（確認・対処が要る）",
});

/**
 * クリティカル度（自分ごと度）を採点する純関数。
 * config.criticalityKeywords / criticalityDeductions / japanComingCues を使う。
 * これらが未設定なら net=0（既存テスト・旧設定と後方互換）。
 */
export function scoreCriticality(item, config, w = CRITICALITY) {
  const text = `${item.title} ${item.description || ""}`;
  const groups = config.criticalityKeywords || {};
  const ded = config.criticalityDeductions || {};
  const comingCues = config.japanComingCues || [];
  const hit = (words) => (words || []).filter((k) => text.includes(k));

  const matched = {
    availability: hit(groups.availability),
    priceLimit: hit(groups.priceLimit),
    japanUsable: hit(groups.japanUsable),
    actionable: hit(groups.actionable),
    safety: hit(groups.safety),
    usOnly: hit(ded.usOnly),
    businessOnly: hit(ded.businessOnly),
    surveyStats: hit(ded.surveyStats),
    funding: hit(ded.funding),
    comingCues: hit(comingCues),
  };

  const reasons = [];
  let positive = 0;
  if (matched.availability.length) { positive += w.AVAILABILITY; reasons.push("availability"); }
  if (matched.priceLimit.length) { positive += w.PRICE_LIMIT; reasons.push("priceLimit"); }
  if (matched.japanUsable.length) { positive += w.JAPAN_USABLE; reasons.push("japanUsable"); }
  if (matched.actionable.length) { positive += w.ACTIONABLE; reasons.push("actionable"); }
  if (matched.safety.length) { positive += w.SAFETY; reasons.push("safety"); }
  positive = Math.min(w.POSITIVE_CAP, positive);

  const deductions = [];
  let negative = 0;
  // 米国限定は減点。ただし「日本にも来る流れの初報」キューがあれば中立（減点しない）
  if (matched.usOnly.length && matched.comingCues.length === 0) { negative += w.US_ONLY; deductions.push("usOnly"); }
  if (matched.businessOnly.length) { negative += w.BUSINESS_ONLY; deductions.push("businessOnly"); }
  if (matched.surveyStats.length) { negative += w.SURVEY_STATS; deductions.push("surveyStats"); }
  if (matched.funding.length) { negative += w.FUNDING; deductions.push("funding"); }

  return { net: positive + negative, positive, negative, reasons, deductions, matched };
}

/** 加点シグナルから「読者の何が変わるか」を 1 行で合成。加点 0 なら null（＝選ばない） */
export function readerChangeLine(criticality) {
  if (!criticality || criticality.positive <= 0 || criticality.reasons.length === 0) return null;
  return criticality.reasons.map((r) => READER_CHANGE_TEMPLATES[r]).filter(Boolean).join(" / ");
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
  const criticality = scoreCriticality(item, config);
  return {
    score: recency + tier1 + tier2 + impact + weight + criticality.net,
    breakdown: { recency, tier1, tier2, impact, sourceWeight: weight, criticality: criticality.net },
    criticality,
    readerChange: readerChangeLine(criticality),
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

// ---- 既報テーマペナルティ（2026-07-12 恒久修正） ----
//
// 背景: 同一トピックでも媒体によって語彙が変わる（「usage credits制」vs「従量課金制」）。
// タイトル同士の Jaccard は実測 0.04〜0.07 で無関係ペア(0.07)と区別できず、
// 7/12 の夜間 run で「Fable5 従量課金」既報が dedupe をすり抜けて 1 位に浮上した。
// 対策: 公開済み記事の slug（英語ケバブケース = 編集済みエンティティ列）と
// 候補タイトル中の ASCII エンティティを重み付きで照合し、一致が閾値以上なら
// スコアに強いペナルティを掛けて上位に来ないようにする（除外ではなく減点。
// ログで観察可能にする）。
//
// 較正（実タイトルで確認済み）:
//   WIRED「Fable 5を従量課金制に」 vs slug claude-fable-5-usage-credits-switch
//     → claude(0.5)+fable(1)+5(0.5) = 2.0 ≥ 2.0 → ペナルティ ✓
//   「ChatGPT Atlas提供終了」 vs slug openai-gpt-5-6-chatgpt-work
//     → openai(0.5)+chatgpt(0.5) = 1.0 < 2.0 → ペナルティなし（誤爆しない）✓
export const COVERED_TOPIC = Object.freeze({
  /** 減点幅。58点級の既報が確実に閾値50を割る強さ */
  PENALTY: 40,
  /** 重み付き一致がこの値以上でペナルティ発動 */
  MIN_OVERLAP: 2,
  /** ベンダー名・汎用製品名・数字は単体では弱い証拠なので半分の重み */
  GENERIC_WEIGHT: 0.5,
});

const GENERIC_ENTITY_TOKENS = new Set([
  "ai", "openai", "anthropic", "google", "apple", "microsoft", "meta", "samsung",
  "chatgpt", "gemini", "claude", "gpt", "iphone", "android", "pixel", "galaxy",
  "japan", "news", "pro", "plus", "max", "new",
]);

/** 候補タイトルから ASCII エンティティトークンを抽出（"gpt-5.6" は gpt/5/6 にも分解） */
export function entityTokens(text) {
  const tokens = new Set();
  for (const m of String(text).toLowerCase().match(/[a-z0-9][a-z0-9.\-]*/g) || []) {
    tokens.add(m);
    for (const sub of m.split(/[.\-]/)) {
      if (sub) tokens.add(sub);
    }
  }
  return tokens;
}

function tokenWeight(t) {
  if (GENERIC_ENTITY_TOKENS.has(t) || /^\d+$/.test(t)) return COVERED_TOPIC.GENERIC_WEIGHT;
  return 1;
}

/** slug（YYYYMM-english-kebab）→ 照合用トークン集合。日付プレフィックスは捨てる */
export function slugTopicTokens(slug) {
  return new Set(
    String(slug)
      .split("-")
      .filter((t) => t && !/^\d{6}$/.test(t)),
  );
}

/**
 * 候補タイトルと既報トピック（slugトークン集合の配列）を照合し、
 * 重み付き一致が最大のものを返す。MIN_OVERLAP 未満なら null。
 */
export function findCoveredTopic(title, topics) {
  const cand = entityTokens(title);
  let best = null;
  for (const topic of topics) {
    let overlap = 0;
    const hits = [];
    for (const t of topic.tokens) {
      if (cand.has(t)) {
        overlap += tokenWeight(t);
        hits.push(t);
      }
    }
    if (overlap >= COVERED_TOPIC.MIN_OVERLAP && (!best || overlap > best.overlap)) {
      best = { slug: topic.slug, overlap: Math.round(overlap * 10) / 10, hits };
    }
  }
  return best;
}

function loadCoveredTopics() {
  const topics = [];
  if (existsSync(ARTICLES_DIR)) {
    for (const f of readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".mdx") && !f.startsWith("_"))) {
      const slug = f.replace(/\.mdx$/, "");
      topics.push({ slug, tokens: slugTopicTokens(slug) });
    }
  }
  // 過去に scout が採用した候補の suggestedSlug も既報テーマとして扱う
  if (existsSync(PICKED_PATH)) {
    try {
      for (const p of JSON.parse(readFileSync(PICKED_PATH, "utf-8"))) {
        if (p && p.suggestedSlug) topics.push({ slug: p.suggestedSlug, tokens: slugTopicTokens(p.suggestedSlug) });
      }
    } catch {}
  }
  return topics;
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
  const coveredTopics = loadCoveredTopics();
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
      // 既報テーマペナルティ: 語彙が違う同一トピック（Jaccardで拾えない）を
      // 公開済み slug のエンティティ照合で減点し、上位に来ないようにする
      const covered = findCoveredTopic(item.title, coveredTopics);
      if (covered) {
        scored.score = Math.max(0, scored.score - COVERED_TOPIC.PENALTY);
        scored.breakdown.coveredTopicPenalty = -COVERED_TOPIC.PENALTY;
        scored.coveredTopic = covered;
      }
      candidates.push({
        ...item,
        source: r.source,
        sourceName: source.name,
        suggestedCategory: classifyArticleCategory(`${item.title} ${item.description || ""}`),
        ...scored,
      });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return {
    candidates,
    excluded,
    sourceStatus,
    minScore: config.minScore || 50,
    minCriticality: Number.isFinite(config.minCriticality) ? config.minCriticality : 12,
  };
}

/**
 * auto-pick / 「今日書くか」判定の適格性。
 * score>=minScore かつ クリティカル度>=minCriticality かつ readerChange が書ける候補だけ。
 * これで「クリティカル度が低い候補しかない日は書かない」を実装（part 3）。
 */
export function isEligible(candidate, minScore, minCriticality) {
  return (
    candidate.score >= minScore &&
    candidate.criticality != null &&
    candidate.criticality.net >= minCriticality &&
    Boolean(candidate.readerChange)
  );
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
  arr.push({ title: pick.title, link: pick.link, score: pick.score, suggestedSlug: pick.suggestedSlug || null, at: new Date().toISOString() });
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
    const eligible = result.candidates.filter((c) => isEligible(c, result.minScore, result.minCriticality));
    const picked = autoPick && eligible.length > 0 ? eligible[0] : null;
    if (picked) {
      picked.suggestedSlug = slugFromPick(picked);
      recordPicked(picked);
    }
    console.log(
      JSON.stringify(
        {
          picked,
          top: top.map((c) => ({
            score: c.score,
            title: c.title,
            source: c.source,
            ageHours: c.ageHours,
            breakdown: c.breakdown,
            readerChange: c.readerChange,
            criticalityDeductions: c.criticality ? c.criticality.deductions : [],
            eligible: isEligible(c, result.minScore, result.minCriticality),
          })),
          excludedCount: result.excluded.length,
          excludedSample: result.excluded.slice(0, 8),
          sourceStatus: result.sourceStatus,
          minScore: result.minScore,
          minCriticality: result.minCriticality,
          logPath: path.relative(ROOT, logPath),
        },
        null,
        2,
      ),
    );
    process.exitCode = autoPick && !picked ? 10 : 0;
    return;
  }

  console.log(
    `=== scout: 候補 ${result.candidates.length} 件 / 除外 ${result.excluded.length} 件（閾値 ${result.minScore} / クリティカル度 ${result.minCriticality}） ===`,
  );
  for (const c of top) {
    const mark = isEligible(c, result.minScore, result.minCriticality) ? "○" : "×";
    const crit = c.criticality ? c.criticality.net : 0;
    console.log(`  ${mark} [${String(c.score).padStart(3)}|c${String(crit).padStart(3)}] ${c.title.slice(0, 52)} (${c.source}, ${c.ageHours}h)`);
    console.log(`       読者変化: ${c.readerChange || "（書けない＝選ばない）"}`);
  }
  console.log(`log: ${path.relative(ROOT, logPath)}`);
  process.exitCode = result.candidates.some((c) => isEligible(c, result.minScore, result.minCriticality)) ? 0 : 10;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[scout fatal]", e && e.message ? e.message : e);
    process.exitCode = 1;
  });
}
