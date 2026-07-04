#!/usr/bin/env node
// scripts/automation/x-card-check.mjs — X 投稿の OGP カード確認（syndication 照会方式）。
//
// 2026-07-04 の実測知見のコード化:
//   - X の composer は OGP プレビューを表示しない（投稿前の視覚確認は不可能）
//   - カード画像は投稿後に X 側で非同期生成される（数分のタイムラグあり）
//   - カードの実状態は cdn.syndication.twimg.com/tweet-result（埋め込み用・認証不要・無料）
//     の card.binding_values で機械確認できる（photo_image_full_size_large 等）
//
// CLI: node scripts/automation/x-card-check.mjs --id <tweetId> [--wait-minutes N]
// 終了コード: 0=カード画像あり / 3=カードはあるが画像未生成 / 4=カードなし / 1=照会失敗

import process from "node:process";
import { pathToFileURL } from "node:url";
import path from "node:path";

const syndBase = () => process.env.X_SYND_BASE || "https://cdn.syndication.twimg.com";

/**
 * ツイートのカード状態を照会する。
 * @returns {{ok:boolean, tweetFound:boolean, cardFound:boolean, cardName:string|null,
 *            imageUrl:string|null, imageOk:boolean|null, title:string|null, reason?:string}}
 */
export async function checkCard(tweetId) {
  let res;
  try {
    res = await fetch(`${syndBase()}/tweet-result?id=${encodeURIComponent(tweetId)}&token=a`, {
      headers: { "User-Agent": "Mozilla/5.0" },
      cache: "no-store",
    });
  } catch (e) {
    return { ok: false, tweetFound: false, cardFound: false, cardName: null, imageUrl: null, imageOk: null, reason: "network_error" };
  }
  if (!res.ok) return { ok: false, tweetFound: false, cardFound: false, cardName: null, imageUrl: null, imageOk: null, reason: `http_${res.status}` };
  const j = await res.json().catch(() => null);
  if (!j || !j.text) return { ok: false, tweetFound: false, cardFound: false, cardName: null, imageUrl: null, imageOk: null, reason: "tweet_not_found" };
  const card = j.card || null;
  if (!card) return { ok: true, tweetFound: true, cardFound: false, cardName: null, imageUrl: null, imageOk: null };
  const bv = card.binding_values || {};
  const img = bv.photo_image_full_size_large?.image_value || bv.summary_photo_image_large?.image_value || bv.thumbnail_image_large?.image_value || null;
  let imageOk = null;
  if (img?.url) {
    try {
      const ir = await fetch(img.url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
      imageOk = ir.status === 200;
    } catch {
      imageOk = false;
    }
  }
  return {
    ok: true,
    tweetFound: true,
    cardFound: true,
    cardName: card.name || null,
    title: bv.title?.string_value || null,
    imageUrl: img?.url || null,
    imageOk,
  };
}

/**
 * 画像の非同期生成を考慮したリトライ付き確認（既定: 30 秒間隔 × waitMinutes 分）。
 */
export async function checkCardWithWait(tweetId, { waitMinutes = 5, intervalMs = 30000 } = {}) {
  const deadline = Date.now() + waitMinutes * 60000;
  let last = null;
  for (;;) {
    last = await checkCard(tweetId);
    if (last.cardFound && last.imageOk) return last;
    if (Date.now() >= deadline) return last;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const idIdx = argv.indexOf("--id");
  const id = idIdx >= 0 ? argv[idIdx + 1] : null;
  const wIdx = argv.indexOf("--wait-minutes");
  const waitMinutes = wIdx >= 0 ? Number(argv[wIdx + 1]) : 0;
  if (!id || !/^\d+$/.test(id)) {
    console.error("usage: node scripts/automation/x-card-check.mjs --id <tweetId> [--wait-minutes N]");
    process.exitCode = 2;
    return;
  }
  const r = waitMinutes > 0 ? await checkCardWithWait(id, { waitMinutes }) : await checkCard(id);
  console.log(JSON.stringify(r, null, 2));
  if (!r.ok) process.exitCode = 1;
  else if (!r.cardFound) process.exitCode = 4;
  else if (!r.imageOk) process.exitCode = 3;
  else process.exitCode = 0;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) main();
