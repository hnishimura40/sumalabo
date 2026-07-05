// tests/sumahon/scout.test.mjs — scout の採点・除外・dedupe（純関数）のテスト。
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseFeed,
  scoreItem,
  findExclusion,
  findDuplicate,
  titleSimilarity,
  slugFromPick,
  ageHours,
} from "../../scripts/automation/scout.mjs";

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
