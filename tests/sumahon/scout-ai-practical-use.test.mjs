import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreItem, isEligible, runScout } from "../../scripts/automation/scout.mjs";

const config = JSON.parse(readFileSync(new URL("../../data/automation/watch-sources.json", import.meta.url), "utf8"));
const now = Date.parse("2026-11-03T08:00:00Z");
const score = (title, description = "") => scoreItem({title,description,pubDate:new Date(now-3600000).toISOString()}, {weight:10}, config, now);

test("GMOに限らず具体的な企業AI導入を主軸で拾い、法人限定だけで落とさない", () => {
  for (const brand of ["GMO", "別の企業"]) {
    const c = score(`${brand}が企業向けAIで問い合わせ対応の作業時間を削減した`, "法人向けサービスの導入事例を公開");
    assert.equal(c.readerValue.signals.aiPracticalUse, true);
    assert.equal(c.readerValue.aiPriority, 1);
    assert.equal(isEligible(c,config.minScore,config.minCriticality),true);
    assert.match(c.readerValue.suggestedAngle,/比較条件/);
  }
});

test("天秤AIの比較機能とフィジカルAIの現場利用を拾う", () => {
  for (const title of [
    "天秤AIをリニューアル、複数モデルの回答を比較",
    "GMOが対話機能を強化したヒューマノイドの取り扱いを開始",
    "店舗の口コミ・写真投稿に生成AI審査を導入",
  ]) assert.equal(score(title).readerValue.signals.aiPracticalUse,true,title);
});

test("企業名・利用率・催事・未確認情報や説明欄のAI定型文だけでは昇格しない", () => {
  for (const [title,description] of [
    ["GMOの新サービスを発表", ""],
    ["GMOがAI利用率90％を発表、業務時間の調査", ""],
    ["AIの導入率調査、問い合わせ対応について聞いた", ""],
    ["GMOがAIで問い合わせ対応を導入したかもしれない", ""],
    ["AIの問い合わせ対応を導入するセミナーを開催", ""],
    ["GMOが新しい店舗運営サービスの提供開始", "当社はAIを導入しています"],
    ["GMOがAI導入で受賞", ""],
    ["GMOが問い合わせ対応AIを導入予定、作業時間削減を目指す", ""],
  ]) assert.equal(score(title,description).readerValue.signals.aiPracticalUse,false,title);
});

test("GMO発見源を日次RSSへ接続し、古い事例・決算・非AIニュースは採用しない", async t => {
  const source=config.sources.find(s=>s.id==="gnews-gmo-ai");
  assert.equal(source.official,false);
  const query=new URL(source.url).searchParams.get("q");
  assert.match(query,/site:tenbin.ai/);
  assert.match(query,/site:ai-robotics.gmo/);
  const entries=[
    ["GMOが企業向けAIで問い合わせ対応の作業時間を削減した", now-3600000],
    ["古いGMOのAIが問い合わせ対応を提供開始", now-72*3600000],
    ["GMO決算、AIの問い合わせ対応を導入したと発表", now-3600000],
    ["GMOが新サービスを提供開始", now-3600000],
  ];
  const xml=`<rss><channel>${entries.map(([title,date],i)=>`<item><title>${title}</title><link>https://example.com/gmo/${i}</link><pubDate>${new Date(date).toUTCString()}</pubDate></item>`).join("")}</channel></rss>`;
  t.mock.method(globalThis,"fetch",async()=>new Response(xml));
  const result=await runScout({config:{...config,sources:[source]},now,chartState:{}});
  const eligible=result.candidates.filter(c=>isEligible(c,config.minScore,config.minCriticality));
  assert.equal(eligible.length,1);
  assert.equal(eligible[0].title,entries[0][0]);
  assert.ok(result.sourceStatus[0].ok);
});
