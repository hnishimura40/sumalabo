// tests/sumahon/scout.test.mjs — scout の採点・除外・dedupe（純関数）のテスト。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseFeed,
  scoreItem,
  scoreCriticality,
  readerChangeLine,
  isEligible,
  findExclusion,
  findDuplicate,
  titleSimilarity,
  slugFromPick,
  ageHours,
} from "../../scripts/automation/scout.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG = {
  minScore: 50,
  tier1Keywords: ["ChatGPT", "Claude", "Gemini", "iPhone", "AI"],
  tier2Keywords: ["発表", "料金", "日本", "開始"],
  impactKeywords: ["値上げ", "無料"],
  excludeCategories: {
    incident_crime: ["逮捕", "死亡"],
    politics_war: ["選挙", "戦争"],
    legal_scandal: ["訴訟", "炎上"],
  },
};

// 本番の watch-sources.json のクリティカル度設定を実際に使ってテストする
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PROD_CONFIG = JSON.parse(readFileSync(path.join(ROOT, "data", "automation", "watch-sources.json"), "utf-8"));

test("1. parseFeed: RSS2.0 の item から title/link/pubDate を取れる", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
    <item><title><![CDATA[テスト記事 &amp; 続報]]></title><link>https://example.com/a</link><pubDate>Sat, 05 Jul 2026 00:00:00 GMT</pubDate><description>本文</description></item>
  </channel></rss>`;
  const items = parseFeed(xml);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "テスト記事 & 続報");
  assert.equal(items[0].link, "https://example.com/a");
});

test("2. scoreItem: 新鮮+tier1+tier2+インパクト+ソース重みが加算される", () => {
  const now = Date.parse("2026-07-05T00:00:00Z");
  const item = {
    title: "ChatGPTの新料金プランを発表、日本でも値上げへ",
    description: "",
    pubDate: new Date(now - 2 * 3600_000).toUTCString(), // 2h前
  };
  const r = scoreItem(item, { weight: 10 }, CONFIG, now);
  assert.equal(r.breakdown.recency, 30);
  assert.ok(r.breakdown.tier1 >= 8); // ChatGPT
  assert.ok(r.breakdown.tier2 >= 8); // 発表+料金+日本
  assert.equal(r.breakdown.impact, 8); // 値上げ
  assert.equal(r.breakdown.sourceWeight, 10);
  assert.ok(r.score >= 60);
});

test("3. 古い記事は鮮度0", () => {
  const now = Date.parse("2026-07-05T00:00:00Z");
  const item = { title: "AIの話", pubDate: new Date(now - 100 * 3600_000).toUTCString() };
  const r = scoreItem(item, { weight: 5 }, CONFIG, now);
  assert.equal(r.breakdown.recency, 0);
});

test("4. 除外カテゴリ: 事件・政治・訴訟語で excluded", () => {
  assert.equal(findExclusion({ title: "AI企業の社長を逮捕" }, CONFIG).category, "incident_crime");
  assert.equal(findExclusion({ title: "選挙でAIが争点に" }, CONFIG).category, "politics_war");
  assert.equal(findExclusion({ title: "ChatGPT巡り訴訟" }, CONFIG).category, "legal_scandal");
  assert.equal(findExclusion({ title: "ChatGPTの新機能" }, CONFIG), null);
});

test("5. dedupe: 既出タイトルと類似なら duplicate", () => {
  const known = ["Claude Fable 5、7月8日からusage credits制へ。サブスクで使える残り枠と、切り替え後どうなるか"];
  const dup = findDuplicate(
    { title: "Claude Fable 5 が usage credits 制へ 7月8日 から切り替え" },
    known,
  );
  assert.ok(dup, "類似タイトルは重複判定されるはず");
  const notDup = findDuplicate({ title: "Pixel 11 のカメラが刷新されるという噂" }, known);
  assert.equal(notDup, null);
});

test("6. titleSimilarity: 無関係なタイトル同士は低い", () => {
  const sim = titleSimilarity("iPhone 18 Pro の価格リーク", "Gemini の新しい動画生成モデル");
  assert.ok(sim < 0.2);
});

test("7. slugFromPick: 英数字ベースの slug を生成（日本語のみでも壊れない）", () => {
  const now = new Date("2026-07-05T00:00:00+09:00");
  const s1 = slugFromPick({ title: "OpenAI announces GPT-6 for developers worldwide" }, now);
  assert.match(s1, /^202607-openai-announces-gpt-6/);
  const s2 = slugFromPick({ title: "日本語だけのタイトル" }, now);
  assert.match(s2, /^202607-scout-/); // フォールバック
});

test("8. ageHours: 不正な日付は Infinity（=捨てられる）", () => {
  assert.equal(ageHours("not-a-date"), Infinity);
});

// ---- クリティカル度（自分ごと度）＝最重要軸 ----

test("9. scoreCriticality: 提供終了+締切+料金/制限で加点、readerChange が書ける", () => {
  const r = scoreCriticality(
    { title: "ChatGPTの5時間ごとの利用制限が一時撤廃、Max/Ultraで上限が開放", description: "" },
    PROD_CONFIG,
  );
  assert.ok(r.reasons.includes("availability"), "撤廃/開放で availability");
  assert.ok(r.reasons.includes("priceLimit"), "制限/上限で priceLimit");
  assert.ok(r.positive >= 24, `加点が積み上がる (positive=${r.positive})`);
  assert.equal(r.negative, 0);
  assert.ok(readerChangeLine(r), "readerChange が書ける");
});

test("10. 減点: 調査/統計ものは surveyStats 減点、加点0なら readerChange=null（＝選ばない）", () => {
  const r = scoreCriticality(
    { title: "AI利用調査、ChatGPT・Gemini・Perplexityの利用実態を305人に聞いた", description: "" },
    PROD_CONFIG,
  );
  assert.ok(r.deductions.includes("surveyStats"), "調査/実態/人に聞いた で surveyStats");
  assert.equal(r.positive, 0, "行動が変わる加点は無い");
  assert.ok(r.net < 0, `net は負 (net=${r.net})`);
  assert.equal(readerChangeLine(r), null, "書けない候補は readerChange=null");
});

test("11. 減点: 米国限定は usOnly 減点。ただし『日本にも来る初報』キューがあれば中立", () => {
  const usOnly = scoreCriticality({ title: "Claude for Teachers、米国の教員に無償提供", description: "" }, PROD_CONFIG);
  assert.ok(usOnly.deductions.includes("usOnly"), "米国の で usOnly 減点");
  assert.ok(usOnly.positive > 0, "無償で priceLimit の加点はある");
  assert.ok(usOnly.net < usOnly.positive, "減点で net は加点より下がる");

  const coming = scoreCriticality(
    { title: "新機能を米国で先行提供、まず米国を皮切りに日本にも順次展開予定", description: "" },
    PROD_CONFIG,
  );
  assert.equal(coming.deductions.includes("usOnly"), false, "初報キュー(皮切り/順次/日本にも)があれば usOnly を打ち消す＝中立");
});

test("12. 減点: 事業者向け(API)と資金調達も減点対象", () => {
  const api = scoreCriticality({ title: "OpenAI、API料金を改定し開発者向けに新モデル提供", description: "" }, PROD_CONFIG);
  assert.ok(api.deductions.includes("businessOnly"), "API/開発者向け で businessOnly");
  const fund = scoreCriticality({ title: "AIスタートアップが資金調達、評価額は10億ドルに", description: "" }, PROD_CONFIG);
  assert.ok(fund.deductions.includes("funding"), "資金調達/評価額 で funding");
});

test("13. isEligible: クリティカル度が低い候補は不適格（今日書かない）", () => {
  const high = { score: 70, criticality: { net: 24 }, readerChange: "料金・制限・無料枠が変わる" };
  const lowCrit = { score: 70, criticality: { net: 4 }, readerChange: "料金が変わる" };
  const noChange = { score: 70, criticality: { net: 0 }, readerChange: null };
  assert.equal(isEligible(high, 50, 12), true);
  assert.equal(isEligible(lowCrit, 50, 12), false, "criticality<minCriticality は不適格");
  assert.equal(isEligible(noChange, 50, 12), false, "readerChange が書けない候補は不適格");
});

test("14. 較正: 過去2週間の実ネタで新基準の並びを確認（自分ごと上位 / 米国限定・調査は下位）", () => {
  const now = Date.parse("2026-07-18T00:00:00Z");
  const mk = (title) => ({ title, description: "", pubDate: new Date(now - 3 * 3600_000).toUTCString() });
  const topics = {
    fiveHour: "ChatGPTの5時間ごとの利用制限が一時撤廃、Max/Ultraで上限が開放",
    atlas: "ChatGPT Atlasが提供終了、データの移行・退避はどうすればいい",
    fable: "Claude Fable 5 の無料枠を7月20日まで延長、いま使える範囲は",
    teacherUS: "Claude for Teachers、米国の教員に無償提供（日本は対象外）",
    survey: "AI利用調査、ChatGPT・Gemini・Perplexityの利用実態を305人に聞いた",
  };
  const src = { weight: 10 };
  const scored = Object.fromEntries(
    Object.entries(topics).map(([k, t]) => [k, scoreItem(mk(t), src, PROD_CONFIG, now)]),
  );

  // 自分ごと度の高い3本が、米国限定・調査ものより上位に来る
  const critFor = (k) => scored[k].criticality.net;
  for (const low of ["teacherUS", "survey"]) {
    for (const high of ["fiveHour", "atlas", "fable"]) {
      assert.ok(
        scored[high].score > scored[low].score,
        `${high}(score ${scored[high].score}) は ${low}(score ${scored[low].score}) より上位のはず`,
      );
      assert.ok(critFor(high) > critFor(low), `${high} のクリティカル度 > ${low}`);
    }
  }
  // 調査ものは行動が変わらない＝readerChange 書けない＝不適格
  assert.equal(scored.survey.readerChange, null);
  assert.equal(isEligible(scored.survey, PROD_CONFIG.minScore, PROD_CONFIG.minCriticality), false);
  // 米国限定(日本対象外)も不適格に落ちる（減点で criticality が minCriticality 未満）
  assert.equal(isEligible(scored.teacherUS, PROD_CONFIG.minScore, PROD_CONFIG.minCriticality), false);
  // 自分ごとの高い3本は適格
  for (const high of ["fiveHour", "atlas", "fable"]) {
    assert.equal(isEligible(scored[high], PROD_CONFIG.minScore, PROD_CONFIG.minCriticality), true, `${high} は適格`);
  }
});
