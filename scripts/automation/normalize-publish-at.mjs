#!/usr/bin/env node
// normalize-publish-at.mjs
//
// finalize / deploy 時に記事 frontmatter の publishAt を「実公開時刻」へ自動補正する。
//   node scripts/automation/normalize-publish-at.mjs --slug <slug> [--now <ISO>] [--dry]
//
// 背景（2026-07-14）: publishAt を固定の朝時刻（08:00 等）でデフォルトにすると、
//   同日に後から公開する記事が一覧の最上位に来ず、実公開時刻より古い順位になる。
//   逆に未来日時は build から除外される（過去化が必要）。
//   → 公開時点で publishAt を「今（実公開見込み時刻）」へ寄せることで一覧順を実態に合わせる。
//
// 補正規則（JST 基準）:
//   - publishAt が **未来**（now より後）      → now に前倒し（build 除外回避）
//   - publishAt が **他の最新公開記事より古い** → now に前進（一覧最上位に来る）
//   - それ以外（既に妥当な最新時刻）           → 変更しない
//   ※ 対象は「いま公開しようとしている slug」のみ。過去記事の日付は動かさない。
//
// 終了コード: 0=正常（変更有無に関わらず） / 2=入力不足・記事なし

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARTICLES = path.join(ROOT, "content", "articles");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}
const hasFlag = (name) => process.argv.includes(`--${name}`);

// JST の ISO 文字列（+09:00）を返す。--now が渡ればそれを、無ければ現在時刻。
function jstIso(nowArg) {
  const d = nowArg ? new Date(nowArg) : new Date();
  const jst = new Date(d.getTime() + 9 * 3600 * 1000);
  const p = (n, w = 2) => String(n).padStart(w, "0");
  return `${jst.getUTCFullYear()}-${p(jst.getUTCMonth() + 1)}-${p(jst.getUTCDate())}T${p(jst.getUTCHours())}:${p(jst.getUTCMinutes())}:${p(jst.getUTCSeconds())}+09:00`;
}

function readPublishAt(text) {
  const m = text.match(/^publishAt:\s*"?([^"\n]+)"?\s*$/m);
  return m ? m[1].trim() : null;
}

function main() {
  const slug = arg("slug");
  if (!slug) { console.error("usage: --slug <slug> [--now <ISO>] [--dry]"); process.exit(2); }
  const nowArg = arg("now");
  const dry = hasFlag("dry");

  const file = path.join(ARTICLES, `${slug}.mdx`);
  let text;
  try { text = readFileSync(file, "utf-8"); } catch { console.error(`記事が見つかりません: ${file}`); process.exit(2); }

  const current = readPublishAt(text);
  if (!current) { console.error(`publishAt が frontmatter にありません: ${slug}`); process.exit(2); }

  const nowIso = jstIso(nowArg);
  const nowMs = new Date(nowIso).getTime();
  const curMs = new Date(current).getTime();

  // 他記事の最新 publishAt（この slug は除く）
  let newestOtherMs = -Infinity;
  for (const f of readdirSync(ARTICLES)) {
    if (!f.endsWith(".mdx") || f === `${slug}.mdx`) continue;
    const pa = readPublishAt(readFileSync(path.join(ARTICLES, f), "utf-8"));
    if (pa) { const t = new Date(pa).getTime(); if (t > newestOtherMs) newestOtherMs = t; }
  }

  const isFuture = curMs > nowMs;
  const isStale = curMs < newestOtherMs; // 他の最新より古い＝一覧で最上位に来ない
  let reason = null;
  if (isFuture) reason = "future→now（build除外回避）";
  else if (isStale) reason = "stale→now（一覧最上位化）";

  if (!reason) {
    console.log(`publishAt OK（補正不要）: ${current} slug=${slug}`);
    process.exit(0);
  }

  if (dry) {
    console.log(`[dry] publishAt 補正予定: ${current} → ${nowIso}（${reason}）slug=${slug}`);
    process.exit(0);
  }

  const next = text.replace(/^publishAt:\s*"?[^"\n]+"?\s*$/m, `publishAt: "${nowIso}"`);
  writeFileSync(file, next, "utf-8");
  console.log(`publishAt 補正: ${current} → ${nowIso}（${reason}）slug=${slug}`);
  console.log(`※ このあと build → commit に含めて deploy すること。`);
  process.exit(0);
}

main();
