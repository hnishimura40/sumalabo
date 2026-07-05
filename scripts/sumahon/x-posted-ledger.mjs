// すまラボ自動化: X 投稿の重複防止台帳。
//
// 保存先: data/social/x-posted.json
// 構造:
//   {
//     "version": 1,
//     "posts": [
//       {
//         "slug": "...",
//         "articleUrl": "https://sumalabo.com/articles/.../",
//         "postedAt": "2026-05-11T11:00:00+09:00",
//         "postText": "...",
//         "postUrl": "https://x.com/suma_labo/status/...",
//         "method": "chrome" | "api",
//         "thumbnailAttached": true,
//         "charCount": 178
//       },
//       ...
//     ]
//   }
//
// 注意: パスワード/トークンは絶対に保存しない。postedAt と postUrl だけを記録する。

import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const LEDGER_PATH = "data/social/x-posted.json";
const EMPTY_LEDGER = { version: 1, posts: [] };

async function readLedger(ledgerPath = LEDGER_PATH) {
  if (!existsSync(ledgerPath)) return { ...EMPTY_LEDGER };
  try {
    const raw = await readFile(ledgerPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.posts)) {
      return { ...EMPTY_LEDGER };
    }
    return parsed;
  } catch (e) {
    // 壊れたファイルは上書きせず例外で気付かせる
    throw new Error(`x-posted.json が壊れています: ${e.message}`);
  }
}

async function writeLedger(ledger, ledgerPath = LEDGER_PATH) {
  const dir = path.dirname(ledgerPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  await writeFile(ledgerPath, JSON.stringify(ledger, null, 2) + "\n", "utf-8");
}

export async function hasPosted(slug, ledgerPath = LEDGER_PATH) {
  const ledger = await readLedger(ledgerPath);
  return ledger.posts.some((p) => p.slug === slug);
}

export async function getPostRecord(slug, ledgerPath = LEDGER_PATH) {
  const ledger = await readLedger(ledgerPath);
  return ledger.posts.find((p) => p.slug === slug) || null;
}

export async function recordPost({
  slug,
  articleUrl,
  postText,
  postUrl = "",
  method = "chrome",
  thumbnailAttached = false,
  charCount = 0,
  variant = "text_only",
  ledgerPath = LEDGER_PATH,
}) {
  if (!slug) throw new Error("recordPost: slug is required");
  const ledger = await readLedger(ledgerPath);
  // 同じ slug が既にあれば二重投稿。例外を投げる（呼び出し側で hasPosted で先に確認すべき）
  if (ledger.posts.some((p) => p.slug === slug)) {
    throw new Error(`recordPost: slug "${slug}" は既に投稿済みです`);
  }
  ledger.posts.push({
    slug,
    articleUrl,
    postedAt: new Date().toISOString(),
    postText,
    postUrl,
    method,
    thumbnailAttached: Boolean(thumbnailAttached),
    charCount,
    // 投稿の型（計測用）: text_only / slides{N} / slides{N}+thread など。
    // どの型が伸びたかを後から比較するために必ず記録する（M3 Phase C強化）。
    variant,
  });
  await writeLedger(ledger, ledgerPath);
  return ledger.posts[ledger.posts.length - 1];
}

export async function listPosts(ledgerPath = LEDGER_PATH) {
  const ledger = await readLedger(ledgerPath);
  return ledger.posts.slice();
}
