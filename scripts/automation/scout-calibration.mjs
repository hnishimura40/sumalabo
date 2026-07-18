#!/usr/bin/env node
// scripts/automation/scout-calibration.mjs — クリティカル度（自分ごと度）新基準の較正レポート。
//
// 過去2週間の実ネタを新基準で採点し、期待どおりの並び
// （自分ごと度の高い実ネタが上位・米国限定/調査ものが下位）になるかを表で出す。
// 本番設定 data/automation/watch-sources.json をそのまま使う。
//
// 使い方: node scripts/automation/scout-calibration.mjs
// 終了コード: 0=期待どおり / 1=並びが期待とずれた

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { scoreItem, isEligible } from "./scout.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const config = JSON.parse(readFileSync(path.join(ROOT, "data", "automation", "watch-sources.json"), "utf-8"));

// 過去2週間の実ネタ（すまラボで実際に扱った / 見送った素材）。
// expect: high=自分ごと度が高く上位に来るべき / low=下位（米国限定・調査もの）
const SAMPLES = [
  { key: "5時間制限撤廃", expect: "high", title: "ChatGPTの5時間ごとの利用制限が一時撤廃、Max/Ultraで上限が開放" },
  { key: "Atlas終了", expect: "high", title: "ChatGPT Atlasが提供終了、データの移行・退避はどうすればいい" },
  { key: "Fable延長", expect: "high", title: "Claude Fable 5 の無料枠を7月20日まで延長、いま使える範囲は" },
  { key: "教員無償(米国限定)", expect: "low", title: "Claude for Teachers、米国の教員に無償提供（日本は対象外）" },
  { key: "AI利用調査", expect: "low", title: "AI利用調査、ChatGPT・Gemini・Perplexityの利用実態を305人に聞いた" },
];

const now = Date.parse("2026-07-18T00:00:00Z");
const src = { weight: 10 }; // ソース重みは揃えて、差がクリティカル度から出ることを見る
const pubDate = new Date(now - 3 * 3600_000).toUTCString(); // 3h前で鮮度も揃える

const rows = SAMPLES.map((s) => {
  const scored = scoreItem({ title: s.title, description: "", pubDate }, src, config, now);
  return {
    ...s,
    score: scored.score,
    crit: scored.criticality.net,
    reasons: scored.criticality.reasons,
    deductions: scored.criticality.deductions,
    readerChange: scored.readerChange,
    eligible: isEligible(scored, config.minScore, config.minCriticality),
  };
});

rows.sort((a, b) => b.score - a.score);

console.log("=== scout 較正レポート: クリティカル度（自分ごと度）新基準 ===");
console.log(`（minScore=${config.minScore} / minCriticality=${config.minCriticality}・鮮度とソース重みは全件同一）\n`);
for (const r of rows) {
  const mark = r.eligible ? "○採用可" : "×見送り";
  console.log(`${mark}  score ${String(r.score).padStart(3)} / crit ${String(r.crit).padStart(4)}  ${r.key}  [${r.expect}]`);
  console.log(`        加点: ${r.reasons.join(", ") || "なし"} ／ 減点: ${r.deductions.join(", ") || "なし"}`);
  console.log(`        読者変化: ${r.readerChange || "（書けない＝選ばない）"}`);
}

// 検証: high はすべての low より上位、かつ high は適格 / low は不適格
const highs = rows.filter((r) => r.expect === "high");
const lows = rows.filter((r) => r.expect === "low");
let ok = true;
const problems = [];
for (const h of highs) {
  if (!h.eligible) { ok = false; problems.push(`${h.key} は自分ごと度が高いのに不適格`); }
  for (const l of lows) {
    if (h.score <= l.score) { ok = false; problems.push(`${h.key}(${h.score}) が ${l.key}(${l.score}) より上位でない`); }
  }
}
for (const l of lows) {
  if (l.eligible) { ok = false; problems.push(`${l.key} は下位のはずが適格になっている`); }
}

console.log("");
if (ok) {
  console.log("✅ 期待どおり: 自分ごと度の高い実ネタ（5時間制限撤廃・Atlas終了・Fable延長）が上位＝採用可、");
  console.log("   米国限定（教員無償）と調査もの（AI利用調査）は下位＝見送り。");
  process.exitCode = 0;
} else {
  console.log("❌ 並びが期待とずれています:");
  for (const p of problems) console.log(`   - ${p}`);
  process.exitCode = 1;
}
