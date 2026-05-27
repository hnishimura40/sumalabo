#!/usr/bin/env node
// sumalabo:from-folder — フォルダ指定起点の記事化ガイド
//
// 役割:
//   素材ありフォルダ（inbox/<テーマ>/ など）を起点に記事化する操作のガイドを表示するだけ。
//   実体の処理は Claude Code との会話で行う運用とする（user-directed mode）。
//
// 使い方:
//   npm run sumalabo:from-folder -- "D:\\documents\\動画作成関連\\すまラボ\\inbox\\<テーマ>"
//
// 動作:
//   1. 引数のフォルダの存在確認
//   2. 中身（画像枚数 + ブログ記事.txt 有無）を一覧表示
//   3. Claude にどう依頼するかの定型文を表示
//
// 注意:
//   このスクリプト自体は記事を生成しない。
//   ユーザーが Claude にフォルダパスを伝えることで、Claude が自律的に
//   WebP 化 → MDX 化 → build → PR 作成までを行う（ポリシーは CLAUDE.md 参照）。

import { existsSync, statSync, readdirSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const folder = args[0];

if (!folder) {
  console.error("Usage: npm run sumalabo:from-folder -- \"<absolute folder path>\"");
  console.error("");
  console.error("Example:");
  console.error("  npm run sumalabo:from-folder -- \"D:\\\\documents\\\\動画作成関連\\\\すまラボ\\\\inbox\\\\<テーマ>\"");
  process.exit(2);
}

if (!existsSync(folder)) {
  console.error(`[from-folder] ERROR: folder not found: ${folder}`);
  process.exit(2);
}

const stat = statSync(folder);
if (!stat.isDirectory()) {
  console.error(`[from-folder] ERROR: not a directory: ${folder}`);
  process.exit(2);
}

const entries = readdirSync(folder, { withFileTypes: true });
const files = entries.filter((e) => e.isFile()).map((e) => e.name);
const subdirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

const imageExt = /\.(png|jpe?g|webp|gif|avif)$/i;
const images = files.filter((f) => imageExt.test(f));
const txts = files.filter((f) => /\.txt$/i.test(f));
const mds = files.filter((f) => /\.(md|mdx)$/i.test(f));

console.log("=== sumalabo:from-folder ===");
console.log(`folder: ${folder}`);
console.log(`files: ${files.length} (images: ${images.length}, txt: ${txts.length}, md/mdx: ${mds.length})`);
if (subdirs.length > 0) {
  console.log(`subdirs: ${subdirs.join(", ")}`);
}
console.log("");

const hasArticleTxt = txts.some((n) => /ブログ記事|article|draft/i.test(n));
console.log(`下書きテキスト: ${hasArticleTxt ? "あり" : "見つからない（手動で配置してください）"}`);
console.log(`画像素材: ${images.length} 枚`);
console.log("");

console.log("--- Claude への依頼テンプレ（コピーして送ってください） ---");
console.log("");
console.log(`${folder} のフォルダで記事化して。`);
console.log("素材は中の ブログ記事.txt と画像 (PNG / JPG) を使ってください。");
console.log("WebP 化 → MDX 化 → build → PR 作成までやって、");
console.log("PR URL を出してから、私の本番反映 OK を待って merge してください。");
console.log("");
console.log("------------------------------------------------------------");
console.log("");
console.log("（このスクリプトは案内のみです。実際の記事化は Claude が会話の中で行います。）");
console.log("参考: docs/user_directed_mode.md");
