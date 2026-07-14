#!/usr/bin/env node
// scripts/run/independent-inspection.mjs
//
// Phase C 直前の「独立検品」を準備する CLI。
//   node scripts/run/independent-inspection.mjs --slug <slug>
//
// やること:
//   1. final_article / slide_plan / images.json を読み、検品プロンプトと画像パス一覧を組み立てる。
//   2. プロンプトを logs/article/{slug}.independent-inspection-prompt.md に保存。
//   3. 画像パス一覧と「独立検品エージェントの起動手順」を stdout に出す。
//
// driver（Claude）はこの出力を使い、**生成の文脈を持たない別の Task エージェント**を起動して
// 全画像を白紙の目で再検査し、その構造化出力を logs/article/{slug}.independent-inspection.json に保存する。
// スキーマは scripts/sumahon/generate-independent-inspection-prompt.mjs の INDEPENDENT_INSPECTION_SCHEMA。
//
// 終了コード: 0=準備OK / 2=入力不足（画像やドラフトが無い）

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { buildIndependentInspectionPrompt } from "../sumahon/generate-independent-inspection-prompt.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : null;
}
function readOrEmpty(p) {
  try { return readFileSync(p, "utf-8"); } catch { return ""; }
}

function main() {
  const slug = arg("slug");
  if (!slug) { console.error("usage: --slug <slug>"); process.exit(2); }

  const dir = path.join(ROOT, "drafts", "refinement", slug);
  const finalArticle = readOrEmpty(path.join(dir, "final_article.md"));
  const slidePlanText = readOrEmpty(path.join(dir, "slide_plan.md"));

  const imagesJsonPath = path.join(ROOT, "logs", "article", `${slug}.images.json`);
  if (!existsSync(imagesJsonPath)) {
    console.error(`images.json が見つかりません: ${imagesJsonPath}（factcheck_images 通過後に実行してください）`);
    process.exit(2);
  }
  const images = JSON.parse(readFileSync(imagesJsonPath, "utf-8"));

  const artDir = path.join(ROOT, "public", "images", "articles", slug);
  const slideImages = (images.slides || []).map((s) => {
    const name = s.name || path.basename(s.src || "");
    return { id: name.replace(/\.webp$/i, ""), path: path.join(artDir, name) };
  });
  const thumbOnDisk = path.join(ROOT, "public", "images", "thumbnails", `${slug}.webp`);
  const thumbnailPath = existsSync(thumbOnDisk) ? thumbOnDisk : null;

  const missing = [
    ...slideImages.filter((s) => !existsSync(s.path)).map((s) => s.path),
    ...(thumbnailPath ? [] : [`(thumbnail) ${thumbOnDisk}`]),
  ];

  const prompt = buildIndependentInspectionPrompt({ slug, finalArticle, slidePlanText, slideImages, thumbnailPath });
  const outDir = path.join(ROOT, "logs", "article");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const promptPath = path.join(outDir, `${slug}.independent-inspection-prompt.md`);
  writeFileSync(promptPath, prompt, "utf-8");

  console.log(`=== 独立検品の準備完了: ${slug} ===`);
  console.log(`プロンプト: logs/article/${slug}.independent-inspection-prompt.md`);
  console.log(`検査画像 (${slideImages.length + (thumbnailPath ? 1 : 0)} 枚):`);
  if (thumbnailPath) console.log(`  - thumbnail: ${thumbnailPath}`);
  for (const s of slideImages) console.log(`  - ${s.id}: ${s.path}`);
  if (missing.length) {
    console.log(`\n[warn] 実ファイルが見つからない画像:`);
    for (const m of missing) console.log(`  - ${m}`);
  }
  console.log(`\n--- driver への NEXT ACTION ---`);
  console.log(`1. 生成の文脈を持たない独立 Task エージェント（subagent_type: Explore など読み取り可能なもの）を起動する。`);
  console.log(`2. エージェントに上記プロンプト全文を渡し、画像を1枚ずつ Read で読ませて INDEPENDENT_INSPECTION_SCHEMA で構造化出力させる。`);
  console.log(`3. 出力を logs/article/${slug}.independent-inspection.json に保存する。`);
  console.log(`4. needs_revision のスライドは該当のみ最大2回再生成→直らなければ X から除外（記事公開は止めない）。`);
  console.log(`5. xSelection を X 直接投稿の画像に使う（x-post-options.mjs が自動で参照）。`);
  process.exit(0);
}

main();
