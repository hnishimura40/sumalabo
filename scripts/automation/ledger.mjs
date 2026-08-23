#!/usr/bin/env node
// scripts/automation/ledger.mjs — 記事台帳の一本化 (P3)。
//
// data/automation/ledger.json を正本とする。スキーマ（1 記事 1 エントリ）:
//   slug / source / triggerKind / articleUrl / previewUrl / productionUrl /
//   xPostUrl / publishedAt / xPostedAt / autonomyLevel / trigger / incidents[]
//
// 方針:
//   - 更新は全て read-modify-write（丸ごと上書きで他フィールドを消す lossy 更新は禁止）
//   - x-posted.json は「X 投稿状態の正本」として維持し、ledger はそれを写像する
//   - queue / review item(KV) / ledger 間の整合チェックを --check で提供
//
// CLI:
//   node scripts/automation/ledger.mjs --sync    # 既存公開記事の遡及登録 + 各ソースから写像
//   node scripts/automation/ledger.mjs --check   # 整合チェック（不整合は exit 1）
//   node scripts/automation/ledger.mjs --show <slug>
//   node scripts/automation/ledger.mjs --update <slug> --patch '{"xPostUrl":"..."}'

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, renameSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { X_POSTED_LEDGER_PATH } from "../sumahon/x-posted-path.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER_PATH = path.join(ROOT, "data", "automation", "ledger.json");
const QUEUE_PATH = path.join(ROOT, "data", "automation", "sumahon-queue.json");
const XPOSTED_PATH = X_POSTED_LEDGER_PATH;
const AUTONOMY_PATH = path.join(ROOT, "data", "automation", "autonomy.json");
const ARTICLES_DIR = path.join(ROOT, "content", "articles");
const REVIEW_ITEMS_URL = process.env.REVIEW_ITEMS_URL || "https://sumalabo.com/api/review-items";

const FIELDS = [
  "slug", "source", "triggerKind", "articleUrl", "previewUrl", "productionUrl",
  "xPostUrl", "publishedAt", "xPostedAt", "autonomyLevel", "trigger", "incidents",
  // 収益系（2026-07-11 アフィリエイト導入）: 広告あり記事の流入・成果を後から追う下地。
  // MDX frontmatter の hasAffiliate から --sync で写像される。
  "hasAffiliate",
];

// ---------- read-modify-write ----------
export function readLedger(ledgerPath = LEDGER_PATH) {
  if (!existsSync(ledgerPath)) return { version: 1, updatedAt: null, entries: [] };
  return JSON.parse(readFileSync(ledgerPath, "utf-8"));
}

export function writeLedger(ledger, ledgerPath = LEDGER_PATH) {
  ledger.updatedAt = new Date().toISOString();
  mkdirSync(path.dirname(ledgerPath), { recursive: true });
  // 原子的更新（tmp → rename）で書きかけ破損を防ぐ
  const tmp = ledgerPath + ".tmp";
  writeFileSync(tmp, JSON.stringify(ledger, null, 2) + "\n", "utf-8");
  renameSync(tmp, ledgerPath);
  return ledger;
}

/** 既存エントリへのマージ更新（undefined は無視 = lossy 禁止）。無ければ新規作成。 */
export function upsertEntry(slug, patch, ledgerPath = LEDGER_PATH) {
  const ledger = readLedger(ledgerPath);
  let entry = ledger.entries.find((e) => e.slug === slug);
  if (!entry) {
    entry = { slug, incidents: [] };
    ledger.entries.push(entry);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === null) continue;
    if (k === "incidents" && Array.isArray(v)) {
      const seen = new Set((entry.incidents || []).map((i) => JSON.stringify(i)));
      entry.incidents = [...(entry.incidents || []), ...v.filter((i) => !seen.has(JSON.stringify(i)))];
    } else {
      entry[k] = v;
    }
  }
  writeLedger(ledger, ledgerPath);
  return entry;
}

// ---------- ソース読み取り ----------
function readJsonSafe(p, fallback) {
  try {
    return existsSync(p) ? JSON.parse(readFileSync(p, "utf-8")) : fallback;
  } catch {
    return fallback;
  }
}

function listPublishedArticles() {
  if (!existsSync(ARTICLES_DIR)) return [];
  const out = [];
  for (const f of readdirSync(ARTICLES_DIR)) {
    if (!f.endsWith(".mdx")) continue;
    const slug = f.replace(/\.mdx$/, "");
    const raw = readFileSync(path.join(ARTICLES_DIR, f), "utf-8");
    const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const get = (key) => {
      const m = (fm ? fm[1] : "").match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, "m"));
      return m ? m[1].trim() : null;
    };
    const publishAt = get("publishAt") || get("pubDate");
    const isLive = publishAt ? new Date(publishAt).getTime() <= Date.now() : true;
    out.push({ slug, publishAt, isLive, pubDate: get("pubDate"), hasAffiliate: get("hasAffiliate") === "true" });
  }
  return out;
}

async function fetchReviewItems() {
  try {
    const r = await fetch(REVIEW_ITEMS_URL, { cache: "no-store" });
    if (!r.ok) return [];
    const j = await r.json();
    return Array.isArray(j.items) ? j.items : [];
  } catch {
    return [];
  }
}

// ---------- sync（遡及登録 + 写像） ----------
export async function syncLedger({ ledgerPath = LEDGER_PATH } = {}) {
  const articles = listPublishedArticles();
  const queue = readJsonSafe(QUEUE_PATH, []);
  const xposted = readJsonSafe(XPOSTED_PATH, { posts: [] });
  const xpostList = Array.isArray(xposted) ? xposted : xposted.posts || [];
  const autonomy = readJsonSafe(AUTONOMY_PATH, { incidents: [] });
  const reviewItems = await fetchReviewItems();

  let added = 0, updated = 0;
  for (const a of articles) {
    if (!a.isLive) continue; // 公開済みのみ遡及登録
    const q = (Array.isArray(queue) ? queue : []).find((e) => e.slug === a.slug) || {};
    const xp = xpostList.find((p) => p.slug === a.slug) || {};
    const rv = reviewItems.find((i) => i.slug === a.slug) || {};
    const incidents = (autonomy.incidents || []).filter((i) => i.slug === a.slug);
    const before = readLedger(ledgerPath).entries.find((e) => e.slug === a.slug);
    upsertEntry(a.slug, {
      source: q.source || "user_directed",
      triggerKind: q.triggeredBy ? "user" : (before?.triggerKind ?? "user"),
      articleUrl: `https://sumalabo.com/articles/${a.slug}/`,
      previewUrl: rv.previewUrl || q.previewUrl || undefined,
      productionUrl: q.productionUrl || `https://sumalabo.com/articles/${a.slug}/`,
      xPostUrl: xp.postUrl || q.xPostUrl || undefined,
      publishedAt: q.publishedAt || a.publishAt || undefined,
      xPostedAt: xp.postedAt || q.xPostedAt || undefined,
      autonomyLevel: rv.autonomyLevel ?? (before?.autonomyLevel ?? 0),
      trigger: rv.trigger || q.trigger || "manual",
      incidents,
      hasAffiliate: a.hasAffiliate === true,
    }, ledgerPath);
    if (before) updated++; else added++;
  }
  return { articles: articles.filter((a) => a.isLive).length, added, updated };
}

// ---------- check（整合チェック） ----------
export async function checkLedger({ ledgerPath = LEDGER_PATH } = {}) {
  const problems = [];
  const ledger = readLedger(ledgerPath);
  const articles = listPublishedArticles().filter((a) => a.isLive);
  const xposted = readJsonSafe(XPOSTED_PATH, { posts: [] });
  const xpostList = Array.isArray(xposted) ? xposted : xposted.posts || [];
  const queue = readJsonSafe(QUEUE_PATH, []);

  // 1. 公開済み記事はすべて台帳にある
  for (const a of articles) {
    if (!ledger.entries.find((e) => e.slug === a.slug)) {
      problems.push(`ledger_missing: 公開記事 ${a.slug} が台帳にない（--sync を実行）`);
    }
  }
  // 2. X 投稿の正本 (x-posted.json) と台帳の xPostUrl が一致する
  for (const p of xpostList) {
    const e = ledger.entries.find((en) => en.slug === p.slug);
    if (!e) { problems.push(`ledger_missing_xpost: ${p.slug}（X投稿済みだが台帳にない）`); continue; }
    if (p.postUrl && e.xPostUrl !== p.postUrl && !p.deletedAt) {
      problems.push(`xpost_mismatch: ${p.slug} 台帳=${e.xPostUrl} 正本=${p.postUrl}`);
    }
  }
  // 3. queue の published/x_posted は台帳にも同状態の痕跡がある
  for (const q of Array.isArray(queue) ? queue : []) {
    if (!["published", "x_posted"].includes(q.status)) continue;
    const e = ledger.entries.find((en) => en.slug === q.slug);
    if (!e) { problems.push(`ledger_missing_queue: ${q.slug}`); continue; }
    if (q.status === "x_posted" && !e.xPostUrl) problems.push(`queue_says_x_posted_but_no_xPostUrl: ${q.slug}`);
    if (!e.publishedAt) problems.push(`queue_published_but_no_publishedAt: ${q.slug}`);
  }
  // 4. 台帳エントリのスキーマ逸脱（未知フィールドは許容、必須は slug のみ）
  for (const e of ledger.entries) {
    if (!e.slug) problems.push("entry_without_slug");
  }
  return { ok: problems.length === 0, problems, entries: ledger.entries.length };
}

// ---------- CLI ----------
async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--sync")) {
    const r = await syncLedger({});
    console.log(JSON.stringify({ synced: true, ...r }, null, 2));
    return;
  }
  if (argv.includes("--check")) {
    const r = await checkLedger({});
    console.log(JSON.stringify(r, null, 2));
    process.exitCode = r.ok ? 0 : 1;
    return;
  }
  const showIdx = argv.indexOf("--show");
  if (showIdx >= 0) {
    const slug = argv[showIdx + 1];
    const e = readLedger().entries.find((en) => en.slug === slug);
    console.log(JSON.stringify(e || { error: "not_found", slug }, null, 2));
    return;
  }
  const updIdx = argv.indexOf("--update");
  if (updIdx >= 0) {
    const slug = argv[updIdx + 1];
    const patchIdx = argv.indexOf("--patch");
    const patch = patchIdx >= 0 ? JSON.parse(argv[patchIdx + 1]) : {};
    console.log(JSON.stringify(upsertEntry(slug, patch), null, 2));
    return;
  }
  console.error("usage: --sync | --check | --show <slug> | --update <slug> --patch '{...}'");
  process.exitCode = 2;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[ledger fatal]", e && e.message ? e.message : e);
    process.exitCode = 1;
  });
}
