#!/usr/bin/env node
// Offline semantic regression checks. Real GA4 snapshots remain private and are
// analyzed separately with analyze-selection-history.mjs --input <private file>.
import { scoreItem, isEligible, loadConfig } from "./scout.mjs";

const config = loadConfig();
const now = Date.parse("2026-11-02T00:00:00Z");
const samples = {
  settings: "Googleの保存設定と利用規約が変更。何を確認すればいい？",
  fee: "Yahoo!フリマの手数料が実質無料に。対象と条件を確認",
  curiosity: "ドラマのAIは現実に作れる？",
  rssOpportunity: "ドラマ『VIVANT』に対話型の生成AIが登場。声に注目",
  model: "OpenAIが新モデルGPT-6を発表",
  narrow: "Claude Fableのサブスク無料枠を延長、期限は明日まで",
  researcher: "OpenAIの最上位AIを研究者向けに無料提供、日本も対象",
  overseas: "ドラマのAIは現実に作れる？米国限定、日本は対象外",
};
const scored = Object.fromEntries(Object.entries(samples).map(([key, title]) => {
  const result = scoreItem({ title, description: "", pubDate: new Date(now - 3 * 3600_000).toISOString() }, { weight: 8 }, config, now);
  return [key, { ...result, title, eligible: isEligible(result, config.minScore, config.minCriticality) }];
}));
const checks = [
  ["AIモデル発表を主軸の採用対象に残す", scored.model.eligible && scored.model.readerValue.aiCoreEligible && !scored.model.readerValue.signals.nicheAiUpdate],
  ["身近な設定変更も採用対象に残す", scored.settings.eligible],
  ["広い利用者の手数料条件を限定枠延長より優先", scored.fee.score > scored.narrow.score],
  ["作品×技術の実現可能性を採用対象にできる", scored.curiosity.eligible],
  ["元RSSから検証する問いを提案できる", scored.rssOpportunity.eligible && Boolean(scored.rssOpportunity.readerValue.suggestedAngle)],
  ["研究者の無料枠を一般消費者の変更として加点しない", !scored.researcher.readerValue.signals.consumerChange],
  ["海外限定の除外は維持", !scored.overseas.eligible],
];
for (const row of Object.values(scored).sort((a,b)=>(b.eligible ? b.readerValue?.aiPriority || 0 : 0)-(a.eligible ? a.readerValue?.aiPriority || 0 : 0)||b.score-a.score)) {
  console.log(`${row.eligible ? "○" : "×"} ${row.score} ${row.title}\n  ${row.readerValue?.reason || "加減点なし"}`);
}
for (const [label, ok] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
process.exitCode = checks.every(([,ok])=>ok) ? 0 : 1;
