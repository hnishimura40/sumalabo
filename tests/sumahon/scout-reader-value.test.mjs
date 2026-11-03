import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreItem, isEligible, findExclusion, findDuplicate, runScout } from "../../scripts/automation/scout.mjs";
import { scoreReaderValue } from "../../scripts/automation/scout-reader-value.mjs";

const config = JSON.parse(readFileSync(new URL("../../data/automation/watch-sources.json", import.meta.url), "utf8"));
const now = Date.parse("2026-11-02T00:00:00Z");
const item = (title, description = "") => ({ title, description, pubDate: new Date(now - 3 * 3600_000).toISOString() });
const score = (title, description = "", cfg = config) => scoreItem(item(title, description), { weight: 8 }, cfg, now);
const eligible = (candidate) => isEligible(candidate, config.minScore, config.minCriticality);

test("重要モデルは主軸として残し、身近な変更も採用対象にする", () => {
  const change = score("Googleの保存設定と利用規約が変更。何を確認すればいい？");
  const model = score("OpenAI ChatGPT Claude Geminiの新モデルを発表、日本でも提供開始");
  assert.ok(model.readerValue.aiCoreEligible);
  assert.equal(eligible(model), true);
  assert.ok(change.readerValue.signals.consumerChange);
  assert.equal(eligible(change), true);
  assert.equal(model.readerValue.signals.nicheAiUpdate, false);
});

test("無料・期限だけの限定枠延長は、広いサービスの条件解説より下位になる", () => {
  const broad = score("Yahoo!フリマの手数料が実質無料に。対象と条件を確認");
  const narrow = score("Claude Fableのサブスク無料枠を延長、期限は明日まで");
  assert.ok(broad.score > narrow.score);
  assert.ok(narrow.readerValue.signals.nicheAiUpdate);
});

test("RSSに完成記事の問いがなくても、作品とAIの接点から切り口を引き継ぐ", () => {
  const candidate = score("ドラマ『VIVANT』に対話型の生成AIが登場。声に注目");
  assert.equal(candidate.criticality.net, 0);
  assert.ok(candidate.readerValue.signals.cultureTechOpportunity);
  assert.ok(candidate.readerValue.suggestedAngle.includes("一次情報"));
  assert.ok(candidate.readerChange);
  assert.equal(eligible(candidate), true);
  const legacy = score("ドラマ『VIVANT』に対話型の生成AIが登場。声に注目", "", { ...config, readerValuePolicy: { enabled: false } });
  assert.equal(eligible(legacy), false);
});

test("完成済みの問いとRSSの切り口候補は二重加点しない", () => {
  const candidate = score("ドラマのAIは現実に作れる？");
  assert.equal(candidate.readerValue.signals.concreteCuriosity, true);
  assert.equal(candidate.readerValue.signals.cultureTechOpportunity, false);
});

test("作品名だけ・疑問形だけでは好奇心の採用経路を開かない", () => {
  for (const title of ["ドラマ『VIVANT』の俳優が新作を発表", "AIの新機能とは？何が変わる？"]) {
    const candidate = score(title);
    assert.equal(candidate.readerValue.curiosityEligible, false);
    assert.equal(candidate.readerValue.signals.concreteCuriosity, false);
  }
});

test("作品AIでも海外限定の除外を迂回しない", () => {
  const candidate = score("米国限定のドラマAIは現実に作れる？日本は対象外");
  assert.equal(candidate.japanAxes.usOnlyBlocked, true);
  assert.equal(eligible(candidate), false);
});

test("作品AIでも調査・専門用途による負のcriticalityを迂回しない", () => {
  const candidate = score("ドラマのAIは現実に作れる？利用実態を305人に聞いた調査");
  assert.ok(candidate.criticality.net < 0);
  assert.equal(eligible(candidate), false);
});

test("記事案の採点を上げても除外カテゴリと既出判定は維持する", () => {
  const candidate = item("ドラマのAIは現実に作れる？詐欺で逮捕");
  assert.equal(findExclusion(candidate, config).category, "incident_crime");
  assert.ok(findDuplicate(item("ドラマのAIは現実に作れる？"), ["ドラマのAIは現実に作れる？"]));
});

test("研究者への無料提供は、一般消費者の料金変更として加点しない", () => {
  const candidate = score("OpenAIの最上位AIを研究者なら無料提供", "学術研究者向けに日本の大学も対象");
  assert.equal(candidate.readerValue.signals.consumerChange, false);
  assert.equal(candidate.readerValue.signals.benefitConditions, false);
  assert.ok(candidate.readerValue.net < 0);
});

test("実作業と検証が揃う場合だけ実用検証として加点する", () => {
  assert.equal(score("Googleの動画編集を実機で確認").readerValue.signals.practicalWorkflow, true);
  assert.equal(score("Googleの動画編集モデルを発表").readerValue.signals.practicalWorkflow, false);
});

test("ブランド名の列挙とキーワード追加による無制限の積み上げを防ぐ", () => {
  const many = score("ChatGPT Claude Gemini OpenAI iPhone Android AIを発表");
  assert.ok(many.breakdown.tier1 <= config.readerValuePolicy.brandCap);
  const strong = score("GoogleとAppleの規約と料金を変更、値下げし無料に。実質0円の対象条件とは？", "動画編集を実機で検証");
  assert.ok(strong.readerValue.positive <= config.readerValuePolicy.positiveCap);
  assert.ok(many.readerValue.negative >= -config.readerValuePolicy.negativeCap);
});

test("HTML属性や英単語の一部を作品AI・サービス名として誤検出しない", () => {
  const result = scoreReaderValue(item("ドラマの詳細", '<a href="https://example.com/AI/LINE">detail deadline</a>'), config);
  assert.equal(result.signals.cultureTechOpportunity, false);
  assert.equal(result.matched.technology.length, 0);
  assert.equal(result.matched.mainstreamServices.length, 0);
});

test("新しい採点方針がない設定では旧採点と既存の採用条件を維持する", () => {
  const legacy = { ...config, readerValuePolicy: undefined };
  const candidate = score("ChatGPTの利用制限を撤廃、日本でも上限を開放", "", legacy);
  assert.equal(candidate.readerValue, null);
  assert.equal(candidate.breakdown.recency, 30);
  assert.equal(eligible({ ...candidate, criticality: { net: 0 }, readerChange: null }), false);
});

test("RSS取得からランキング・適格性まで新基準が接続されている", async (t) => {
  const titles = [
    "LINEの写真保存設定と利用規約が変更。何を確認すればいい？",
    "OpenAI ChatGPT Claude Geminiの新モデルを発表、日本でも提供開始",
    "架空ドラマに対話型AIが登場、その声に注目",
    "AI企業の担当者を逮捕",
  ];
  const xml = `<rss><channel>${titles.map((title, i) => `<item><title>${title}</title><link>https://example.com/${i}</link><pubDate>${new Date(now - 3 * 3600_000).toUTCString()}</pubDate></item>`).join("")}</channel></rss>`;
  t.mock.method(globalThis, "fetch", async () => new Response(xml, { status: 200 }));
  const sources = [{ id: "test-feed", name: "offline fixture", url: "https://example.com/feed", weight: 8 }];
  const current = await runScout({ config: { ...config, sources }, now });
  const old = await runScout({ config: { ...config, sources, readerValuePolicy: { enabled: false } }, now });
  assert.ok(old.candidates[0].title.includes("新モデル"));
  assert.ok(current.candidates[0].title.includes("新モデル"), "AI主軸を非AIの設定ニュースより先に残す");
  assert.ok(current.candidates.find(c => c.title.includes("保存設定")).readerValue.signals.consumerChange);
  assert.ok(current.candidates.filter(eligible).some(c => c.title.includes("架空ドラマ") && c.readerValue.suggestedAngle));
  assert.ok(current.excluded.some(c => c.category === "incident_crime"));
  assert.equal(current.candidates.some(c => c.title.includes("逮捕")), false);
});
