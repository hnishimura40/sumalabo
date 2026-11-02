#!/usr/bin/env node
// Read a PRIVATE observed GA4 snapshot. Never query credentials, publish the
// results, treat missing paths as zero, or fit weights using this script.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scoreItem, isEligible, loadConfig } from "./scout.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = process.argv.slice(2);
const input = args[args.indexOf("--input") + 1];
if (!args.includes("--input") || !input) throw new Error("--input <private observed-ga4.json> is required");
const observed = JSON.parse(readFileSync(path.resolve(input), "utf8"));
const config = loadConfig();
const baseline = { ...config, readerValuePolicy: { enabled: false } };
const asOf = Date.parse(`${observed.observedOn}T00:00:00+09:00`);
const fresh = new Date(asOf - 3 * 3600_000).toISOString();
const metadata = (slug) => {
  const text = readFileSync(path.join(root, "content/articles", `${slug}.mdx`), "utf8");
  const get = (key) => (text.match(new RegExp(`^${key}:\\s*"([^"]*)"`, "m")) || [])[1];
  return { title: get("title"), description: get("description"), publishedOn: get("pubDate") };
};
const score = (article, policy) => {
  const candidate = scoreItem({ ...article, pubDate: fresh }, { weight: 10 }, policy, asOf);
  return { score: candidate.score, eligible: isEligible(candidate, policy.minScore, policy.minCriticality), reasons: candidate.readerValue?.reasons || [], deductions: candidate.readerValue?.deductions || [] };
};
const rows = observed.articles.map(([slug, views]) => {
  const article = metadata(slug);
  const days = Math.floor((asOf - Date.parse(`${article.publishedOn}T00:00:00+09:00`)) / 86400000);
  return { slug, ...article, views, exposureDays: days, observedViewsPer30Days: Number((views / Math.max(1, days) * 30).toFixed(2)), old: score(article, baseline), current: score(article, config) };
});
const cohort = rows.filter((r) => r.publishedOn >= "2026-07-01" && r.publishedOn <= "2026-07-31" && r.exposureDays >= 90);
const median = (values) => { const v = [...values].sort((a,b) => a-b); return v.length ? (v[Math.floor((v.length-1)/2)] + v[Math.ceil((v.length-1)/2)]) / 2 : null; };
const summary = {
  observedOn: observed.observedOn,
  cohort: { count: cohort.length, exposureDays: [Math.min(...cohort.map(r=>r.exposureDays)), Math.max(...cohort.map(r=>r.exposureDays))], medianViews: median(cohort.map(r=>r.views)) },
  limitations: [...observed.limitations, "Scoring replay uses final article metadata, not original RSS; freshness fixed at 3h and source weight at 10 for all articles. Not an out-of-sample forecast."],
  mechanismGroups: ["consumerChange", "benefitConditions", "concreteCuriosity", "practicalWorkflow", "nicheAiUpdate", "announcementOnly"].map((mechanism) => {
    const group = cohort.filter(r=>[...r.current.reasons,...r.current.deductions].includes(mechanism));
    return { mechanism, count: group.length, medianViews: median(group.map(r=>r.views)), slugs: group.map(r=>r.slug) };
  }),
  rows,
};
const outDir = path.dirname(path.resolve(input));
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "comparison.json"), JSON.stringify(summary, null, 2) + "\n");
const table = cohort.sort((a,b)=>b.views-a.views).map(r=>`| ${r.title} | ${r.publishedOn} | ${r.views} | ${r.exposureDays} | ${r.old.score}/${r.old.eligible ? "可":"不可"} | ${r.current.score}/${r.current.eligible ? "可":"不可"} | ${[...r.current.reasons,...r.current.deductions].join(", ") || "なし"} |`).join("\n");
writeFileSync(path.join(outDir, "比較結果.md"), `# 記事選定の比較（private・${observed.observedOn}）\n\nGA4全流入・累計PV。7月公開で観測できた${cohort.length}記事、公開後${summary.cohort.exposureDays.join("〜")}日を比較。中央値${summary.cohort.medianViews}PV。データにない記事は0扱いしない。\n\n## 機序別（重複あり・仮説の確認）\n\n${summary.mechanismGroups.map(g=>`- ${g.mechanism}: ${g.count}件、中央値${g.medianViews ?? "対象なし"}PV`).join("\n")}\n\n## 記事別\n\n鮮度3時間・ソース重み10に統一して完成記事の題材を再採点。実際の過去選定の完全な再現ではない。\n\n| 記事 | 公開日 | 累計PV | 経過日 | 旧点/適格 | 新点/適格 | 根拠 |\n|---|---|---:|---:|---|---|---|\n${table}\n\n## 限界\n\n${summary.limitations.map(s=>`- ${s}`).join("\n")}\n\n## 運用上の対応\n\n重みは控えめな編集判断として設定。公開後7日・28日の新旧比較で見直す。未登録・配信経路・自己アクセスの影響を題材の良し悪しと混同しない。元RSSの作品＋AIから調査用の切り口が残るかは別途回帰テストする。\n`);
console.log(JSON.stringify({ cohort: summary.cohort, mechanismGroups: summary.mechanismGroups.map(({slugs,...g})=>g), output: outDir }, null, 2));
