#!/usr/bin/env node
// scripts/automation/x-post-options.mjs — Phase C 強化のフラグ管理（M3 Part 2）。
//
// autonomy.json の xPostOptions を読み、投稿の型（スライド添付 / 返信ツリー /
// 投稿時間帯）を決める。**初期値はすべて現状維持（フラグOFF）**で、ONへの
// 切り替えは testMode 完了後にユーザーが宣言する。
//
//   "xPostOptions": {
//     "attachSlides": false,      // ONで本投稿に画像を直接添付（バズの主戦場をX画像投稿に）
//     "attachSlidesCount": 4,     // 本投稿の添付枚数（最大4）
//     "leadWithThumbnail": false, // ONで1枚目をサムネ、続けてslide01..でN枚に満たす（サムネが最強フックのとき）
//     "linkInReply": false,       // ONで記事リンクを本投稿から外し、返信(リプライ)に置く（画像単体投稿でインプレを伸ばす）
//     "threadAllSlides": false,   // ONで残りスライドを返信ツリーにぶら下げる（1返信4枚まで）
//     "postWindow": null          // {"start":"07:20","end":"08:00"} で投稿時間帯を指定。nullなら即投稿
//   }
//
// 2026-07-14 バズ強化: 既定運転を「リンク付き投稿1本」→「画像4枚を直接添付した本投稿
// ＋リプライに記事リンク」に切り替える（Xはリンク付き投稿の露出を絞るため画像単体投稿の方が
// 伸びる。スライドは単体で読める設計なので相性が良い）。autonomy.json 側でフラグをON。
//
// 提供関数（純関数中心・テスト可能）:
//   loadXPostOptions()                    … autonomy.json から読み込み（欠落は既定値で補完）
//   resolvePostWindow(now, options)       … {postNow:true} | {waitUntil:Date, reason}
//   buildAttachmentPlan(slug, options)    … {variant, attach:[], threadBatches:[][]}
//   variantName(options, attachedCount)   … 台帳に記録する variant 文字列

import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { loadAutonomy } from "./autonomy.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export const X_POST_OPTIONS_DEFAULT = Object.freeze({
  attachSlides: false,
  attachSlidesCount: 4,
  leadWithThumbnail: false,
  linkInReply: false,
  threadAllSlides: false,
  postWindow: null,
});

export function loadXPostOptions(state = null) {
  const s = state || loadAutonomy();
  const raw = s.xPostOptions && typeof s.xPostOptions === "object" ? s.xPostOptions : {};
  return {
    attachSlides: raw.attachSlides === true,
    attachSlidesCount: Number.isInteger(raw.attachSlidesCount) && raw.attachSlidesCount > 0 ? Math.min(raw.attachSlidesCount, 4) : X_POST_OPTIONS_DEFAULT.attachSlidesCount,
    leadWithThumbnail: raw.leadWithThumbnail === true,
    linkInReply: raw.linkInReply === true,
    threadAllSlides: raw.threadAllSlides === true,
    postWindow:
      raw.postWindow && typeof raw.postWindow === "object" && /^\d{2}:\d{2}$/.test(raw.postWindow.start || "") && /^\d{2}:\d{2}$/.test(raw.postWindow.end || "")
        ? { start: raw.postWindow.start, end: raw.postWindow.end }
        : null,
  };
}

/**
 * 投稿時間帯の判定（JST基準）。
 * - postWindow が null → 即投稿（現状どおり）
 * - now が窓より前 → 窓の開始まで保留（waitUntil）
 * - now が窓の中 → 即投稿
 * - now が窓を過ぎている → 即投稿（翌日まで待たない。公開済み記事を放置しない安全側）
 */
export function resolvePostWindow(now = new Date(), options = X_POST_OPTIONS_DEFAULT) {
  if (!options.postWindow) return { postNow: true, reason: "no_window" };
  const jst = new Date(now.getTime() + 9 * 3600_000);
  const [sh, sm] = options.postWindow.start.split(":").map(Number);
  const [eh, em] = options.postWindow.end.split(":").map(Number);
  const minutes = jst.getUTCHours() * 60 + jst.getUTCMinutes();
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (minutes < startMin) {
    const waitUntil = new Date(now.getTime() + (startMin - minutes) * 60_000);
    return { postNow: false, waitUntil, waitMinutes: startMin - minutes, reason: "before_window" };
  }
  if (minutes <= endMin) return { postNow: true, reason: "in_window" };
  return { postNow: true, reason: "after_window_post_anyway" };
}

/** slug のスライドWebP一覧（slide01.. / 旧 fig01.. 順）を返す。 */
export function listSlideImages(slug, root = ROOT) {
  const dir = path.join(root, "public", "images", "articles", slug);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    // slide01-*.webp（新）と fig01-*.webp（旧）の両方に対応（2026-07-14 修正: 従来 fig のみで
    // 新記事のスライドが 0 件になり text_only に落ちていた不具合を修正）
    .filter((f) => /^(?:slide|fig)\d+.*\.webp$/.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

/** slug のサムネ WebP パス（無ければ null）。 */
export function thumbnailPath(slug, root = ROOT) {
  const p = path.join(root, "public", "images", "thumbnails", `${slug}.webp`);
  return existsSync(p) ? p : null;
}

/**
 * 独立検品（Phase C 前）の xSelection を実ファイルパス配列に解決する。
 * logs/article/{slug}.independent-inspection.json の xSelection（id 配列・'thumbnail' / slide id）を
 * public 以下の実ファイルへマップする。ファイルが無い id はスキップ。最大4枚。
 * 検品結果が無い / xSelection 空 → null（呼び出し側は従来のサムネ+先頭スライドにフォールバック）。
 */
export function loadInspectionSelection(slug, root = ROOT) {
  const p = path.join(root, "logs", "article", `${slug}.independent-inspection.json`);
  if (!existsSync(p)) return null;
  let data;
  try { data = JSON.parse(readFileSync(p, "utf-8")); } catch { return null; }
  const sel = Array.isArray(data.xSelection) ? data.xSelection : [];
  if (sel.length === 0) return null;
  const resolved = [];
  for (const id of sel.slice(0, 4)) {
    let file;
    if (id === "thumbnail") file = path.join(root, "public", "images", "thumbnails", `${slug}.webp`);
    else file = path.join(root, "public", "images", "articles", slug, `${id}.webp`);
    if (existsSync(file)) resolved.push(file);
  }
  return resolved.length ? resolved : null;
}

/**
 * 添付計画。フラグOFF → 添付なし（現状どおり）。
 * attachSlides ON → 本投稿に画像を N 枚（最大4）添付。
 *   leadWithThumbnail ON → 1枚目=サムネ、続けて slide01.. で N 枚に満たす。
 *   linkInReply ON → 記事リンクは本投稿に含めず、返信(リプライ)に置く（画像単体投稿でインプレを伸ばす）。
 * threadAllSlides ON → 本投稿に載らなかった残りスライドを4枚ずつ返信ツリー用にバッチ化。
 * 戻り値の linkInReply は Phase C 実行側（本投稿にURLを入れない／リプライにURLを付ける）が参照する。
 */
export function buildAttachmentPlan(slug, options = X_POST_OPTIONS_DEFAULT, root = ROOT) {
  if (!options.attachSlides) {
    return { variant: "text_only", attach: [], threadBatches: [], linkInReply: false, selectionSource: "none" };
  }
  const slides = listSlideImages(slug, root);
  const count = options.attachSlidesCount;

  // 優先: 独立検品（Phase C 前）が選んだ xSelection を使う（文字量少・数字正確・単体で意味が通る上位4枚。
  // needs_revision と文字密度 high は検品側で除外済み）。無ければ従来のサムネ+先頭スライドにフォールバック。
  const inspected = loadInspectionSelection(slug, root);
  let attach;
  let usedSlides;
  let selectionSource;
  if (inspected && inspected.length) {
    attach = inspected.slice(0, count);
    selectionSource = "independent_inspection";
    const attachSet = new Set(attach);
    usedSlides = slides.filter((s) => attachSet.has(s));
  } else if (options.leadWithThumbnail) {
    const thumb = thumbnailPath(slug, root);
    const lead = thumb ? [thumb] : [];
    usedSlides = slides.slice(0, Math.max(0, count - lead.length));
    attach = [...lead, ...usedSlides];
    selectionSource = "default_lead_thumbnail";
  } else {
    usedSlides = slides.slice(0, count);
    attach = usedSlides;
    selectionSource = "default_first_slides";
  }
  const rest = slides.filter((s) => !usedSlides.includes(s));
  const threadBatches = [];
  if (options.threadAllSlides) {
    for (let i = 0; i < rest.length; i += 4) threadBatches.push(rest.slice(i, i + 4));
  }
  return {
    variant: variantName(options, attach.length),
    attach,
    threadBatches,
    linkInReply: options.linkInReply === true,
    selectionSource,
  };
}

export function variantName(options, attachedCount = 0) {
  if (!options.attachSlides || attachedCount === 0) return "text_only";
  const base = `images${attachedCount}`;
  const reply = options.linkInReply ? "+reply" : "";
  const thread = options.threadAllSlides ? "+thread" : "";
  return `${base}${reply}${thread}`;
}

// ---- CLI（状態確認用） ----
async function main() {
  const opts = loadXPostOptions();
  const win = resolvePostWindow(new Date(), opts);
  console.log(JSON.stringify({ options: opts, windowNow: win }, null, 2));
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[x-post-options fatal]", e && e.message ? e.message : e);
    process.exitCode = 1;
  });
}
