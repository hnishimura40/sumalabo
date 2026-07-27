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
//         "route": "codex" | "claude-in-chrome",
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
const createEmptyLedger = () => ({ version: EMPTY_LEDGER.version, posts: [] });

async function readLedger(ledgerPath = LEDGER_PATH) {
  if (!existsSync(ledgerPath)) return createEmptyLedger();
  try {
    const raw = await readFile(ledgerPath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.posts)) {
      return createEmptyLedger();
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
  route = null,
  thumbnailAttached = false,
  charCount = 0,
  variant = "text_only",
  replyUrl = null,
  imagesAttached = 0,
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
    // 操作主体の経路。method（UI/API）とは別に、Codex対話モードか非常用Claude経路かを記録する。
    // 既存レコードは route を持たなくても有効。新規記録だけに追加する。
    route,
    thumbnailAttached: Boolean(thumbnailAttached),
    charCount,
    // 投稿の型（計測用）: text_only / images{N} / images{N}+reply / slides{N}+thread など。
    // どの型が伸びたかを後から比較するために必ず記録する（M3 Phase C強化 / 2026-07-14 画像投稿+reply）。
    variant,
    // 画像投稿+リプライ運用（2026-07-14）: 本投稿に添付した画像枚数と、記事リンクを付けた返信URL。
    imagesAttached,
    replyUrl,
  });
  await writeLedger(ledger, ledgerPath);
  return ledger.posts[ledger.posts.length - 1];
}

/**
 * 本投稿の記録後に、同じレコードへリプライ URL を追記する。
 * x-posted.json の schema/version は変えず、既存の replyUrl フィールドだけを段階更新する。
 */
export async function recordReply({ slug, replyUrl, route = null, ledgerPath = LEDGER_PATH }) {
  if (!slug) throw new Error("recordReply: slug is required");
  if (!replyUrl) throw new Error("recordReply: replyUrl is required");

  const ledger = await readLedger(ledgerPath);
  const record = ledger.posts.find((p) => p.slug === slug);
  if (!record) {
    throw new Error(`recordReply: slug "${slug}" の本投稿レコードがありません`);
  }
  if (record.replyUrl && record.replyUrl !== replyUrl) {
    throw new Error(`recordReply: slug "${slug}" には別の replyUrl が記録済みです`);
  }

  record.replyUrl = replyUrl;
  if (route && !record.route) record.route = route;
  await writeLedger(ledger, ledgerPath);
  return record;
}

export async function listPosts(ledgerPath = LEDGER_PATH) {
  const ledger = await readLedger(ledgerPath);
  return ledger.posts.slice();
}
