#!/usr/bin/env node
// scripts/qa/validate-jsonld.mjs — 構造化データのローカル検証（M3 SEO基盤）。
//
// dist/ の全記事ページ + トップから <script type="application/ld+json"> を抽出し、
//   1. JSON.parse が通る（構文エラー0）
//   2. Article: headline / datePublished / dateModified / author / publisher / mainEntityOfPage 必須
//      + datePublished/dateModified が ISO 日付として解釈できる + image は絶対URL
//   3. トップ: WebSite schema（name / url）
// を検査する。スキーマ検証ツール（Rich Results Test）相当の必須項目チェックのローカル版。
//
// 使い方: npm run build 後に node scripts/qa/validate-jsonld.mjs
// 終了コード: 0=全pass / 1=違反あり

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

const DIST = path.resolve("dist");
const problems = [];
let checkedArticles = 0;

function extractJsonLd(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

// --- 記事ページ ---
const articlesDir = path.join(DIST, "articles");
if (existsSync(articlesDir)) {
  for (const slug of readdirSync(articlesDir, { withFileTypes: true }).filter((d) => d.isDirectory())) {
    const p = path.join(articlesDir, slug.name, "index.html");
    if (!existsSync(p)) continue;
    const blocks = extractJsonLd(readFileSync(p, "utf-8"));
    const articleBlocks = [];
    for (const b of blocks) {
      try {
        const j = JSON.parse(b);
        if (j["@type"] === "Article") articleBlocks.push(j);
      } catch (e) {
        problems.push(`${slug.name}: JSON構文エラー (${e.message})`);
      }
    }
    if (articleBlocks.length === 0) {
      problems.push(`${slug.name}: Article schema がありません`);
      continue;
    }
    checkedArticles++;
    const a = articleBlocks[0];
    for (const key of ["headline", "datePublished", "dateModified", "author", "publisher", "mainEntityOfPage"]) {
      if (!a[key]) problems.push(`${slug.name}: Article.${key} が欠落`);
    }
    for (const key of ["datePublished", "dateModified"]) {
      if (a[key] && Number.isNaN(Date.parse(a[key]))) problems.push(`${slug.name}: Article.${key} が日付として不正 (${a[key]})`);
    }
    if (a.image) {
      const imgs = Array.isArray(a.image) ? a.image : [a.image];
      for (const img of imgs) {
        if (!/^https:\/\//.test(img)) problems.push(`${slug.name}: Article.image が絶対URLでない (${img})`);
      }
    }
    if (a.author?.name !== "すまラボ編集部") problems.push(`${slug.name}: author が「すまラボ編集部」でない`);
  }
}

// --- トップ ---
const top = path.join(DIST, "index.html");
if (existsSync(top)) {
  const blocks = extractJsonLd(readFileSync(top, "utf-8"));
  let hasWebsite = false;
  for (const b of blocks) {
    try {
      const j = JSON.parse(b);
      if (j["@type"] === "WebSite") {
        hasWebsite = true;
        if (!j.name || !j.url) problems.push("top: WebSite.name/url が欠落");
      }
    } catch (e) {
      problems.push(`top: JSON構文エラー (${e.message})`);
    }
  }
  if (!hasWebsite) problems.push("top: WebSite schema がありません");
} else {
  problems.push("dist/index.html がありません（build未実行？）");
}

console.log(`=== JSON-LD validation: 記事 ${checkedArticles} 件 + トップ ===`);
if (problems.length === 0) {
  console.log("ALL PASS（構文エラー0・必須項目すべて充足）");
} else {
  for (const p of problems) console.log("✗ " + p);
  console.log(`--- ${problems.length} 件の問題 ---`);
  process.exitCode = 1;
}
