// scripts/qa/check-contrast.mjs — デザイントークンの WCAG AA コントラスト機械チェック。
//
// src/styles/global.css の :root（ライト）と html.dark（ダーク）から
// カスタムプロパティを読み取り、実際に使われている前景/背景ペアが
// AA 基準を満たすか検査する。しきい値は用途で分ける:
//   - 本文・通常サイズテキスト: 4.5
//   - 大きい/太字のラベル・見出し色 (18px+ or 14px bold+): 3.0
// 1件でも fail があれば exit 1（リニューアルの merge 条件）。
//
// 実行: node scripts/qa/check-contrast.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cssPath = resolve(process.cwd(), "src/styles/global.css");
const css = readFileSync(cssPath, "utf8");

function extractBlock(source, selector) {
  const start = source.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = source.indexOf("{", start);
  const end = source.indexOf("\n}", open);
  return source.slice(open + 1, end);
}

function parseVars(block) {
  const vars = {};
  for (const m of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

function resolveValue(vars, value, depth = 0) {
  if (depth > 8) return value;
  const m = value.match(/^var\(--([\w-]+)\)$/);
  if (m && vars[m[1]]) return resolveValue(vars, vars[m[1]], depth + 1);
  return value;
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance([r, g, b]) {
  const [rs, gs, bs] = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrast(hex1, hex2) {
  const l1 = luminance(hexToRgb(hex1));
  const l2 = luminance(hexToRgb(hex2));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const lightVars = parseVars(extractBlock(css, ":root"));
const darkVars = { ...lightVars, ...parseVars(extractBlock(css, "html.dark")) };

// [前景, 背景, しきい値, 用途]
const PAIRS = [
  ["fg", "bg", 4.5, "本文 on ページ背景"],
  ["fg", "bg-elev", 4.5, "本文 on カード"],
  ["fg-mid", "bg-elev", 4.5, "サブテキスト on カード"],
  ["fg-mid", "bg", 4.5, "サブテキスト on ページ背景"],
  ["fg-faint", "bg-elev", 3.0, "補足キャプション（小・非本質情報）"],
  ["brand", "bg-elev", 4.5, "ブランド色ラベル・目次見出し"],
  ["brand", "bg", 4.5, "ブランド色 on ページ背景"],
  ["teal-deep", "bg-elev", 4.5, "リンク on カード"],
  ["facts", "facts-bg", 4.5, "確定情報の見出し"],
  ["claims", "claims-bg", 4.5, "報道ベースの見出し"],
  ["unc", "unc-bg", 4.5, "未確定の見出し"],
  ["himari", "himari-bg", 3.0, "ひまり名ラベル（太字小）"],
  ["labo", "labo-bg", 3.0, "らぼまる名ラベル（太字小）"],
  ["fg", "himari-bg", 4.5, "吹き出し本文（ひまり）"],
  ["fg", "labo-bg", 4.5, "吹き出し本文（らぼまる）"],
  ["fg", "facts-bg", 4.5, "コールアウト本文（確定）"],
  ["fg", "claims-bg", 4.5, "コールアウト本文（報道）"],
  ["fg", "unc-bg", 4.5, "コールアウト本文（未確定）"],
];

let failCount = 0;
for (const [theme, vars] of [
  ["light", lightVars],
  ["dark", darkVars],
]) {
  for (const [fgName, bgName, threshold, usage] of PAIRS) {
    const fg = resolveValue(vars, vars[fgName] ?? "");
    const bg = resolveValue(vars, vars[bgName] ?? "");
    if (!fg.startsWith("#") || !bg.startsWith("#")) {
      console.log(`SKIP [${theme}] --${fgName} on --${bgName}: 非hex値 (${fg} / ${bg})`);
      continue;
    }
    const ratio = contrast(fg, bg);
    const ok = ratio >= threshold;
    if (!ok) failCount++;
    const mark = ok ? "ok  " : "FAIL";
    console.log(
      `${mark} [${theme}] --${fgName}(${fg}) on --${bgName}(${bg}) = ${ratio.toFixed(2)} (>= ${threshold}) ${usage}`,
    );
  }
}

// サマリー番号丸（白/濃色文字 on brand）
for (const [theme, vars, numFg] of [
  ["light", lightVars, "#ffffff"],
  ["dark", darkVars, "#10141b"],
]) {
  const brand = resolveValue(vars, vars.brand);
  const ratio = contrast(numFg, brand);
  const ok = ratio >= 3.0; // 太字数字13px相当
  if (!ok) failCount++;
  console.log(
    `${ok ? "ok  " : "FAIL"} [${theme}] 番号丸文字(${numFg}) on --brand(${brand}) = ${ratio.toFixed(2)} (>= 3)`,
  );
}

console.log(failCount === 0 ? "\nAA contrast check: all pass" : `\nAA contrast check: ${failCount} FAIL`);
process.exitCode = failCount === 0 ? 0 : 1;
