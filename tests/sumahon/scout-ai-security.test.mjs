import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreItem, isEligible, runScout } from "../../scripts/automation/scout.mjs";

const config = JSON.parse(readFileSync(new URL("../../data/automation/watch-sources.json", import.meta.url), "utf8"));
const now = Date.parse("2026-11-03T08:00:00Z");
const score = (title, description = "") => scoreItem({title,description,pubDate:new Date(now-3600000).toISOString()}, {weight:10}, config, now);

test("AIが見出しにないGMOの不正アクセス続報も調査候補にする", () => {
  const c = score("GMO『お名前.com デスクトップクラウド』への不正アクセスに関する現在の対応を発表", "利用者の端末を調査し、被害を確認しています");
  assert.equal(c.readerValue.signals.aiSecurityOpportunity,true);
  assert.equal(c.readerValue.aiPriority,1);
  assert.equal(isEligible(c,config.minScore,config.minCriticality),true);
  assert.match(c.readerValue.suggestedAngle,/AIが原因・攻撃に使用されたと断定しない/);
  assert.match(c.readerValue.suggestedAngle,/裏付けられなければAI記事としては採用しない/);
});

test("AI自体のサイバー被害も拾い、企業名だけの別事業を特別扱いしない", () => {
  assert.equal(score("新しいAIで個人情報流出を確認、フィッシング対策を発表").readerValue.signals.aiSecurityOpportunity,true);
  for (const title of [
    "天秤AIをリニューアル、複数モデルの回答を比較",
    "GMOが対話機能を強化したヒューマノイドの取り扱いを開始",
    "GMOが企業向けAIで問い合わせ対応の作業時間を削減した",
    "GMOがAI利用率90％を発表、業務時間の調査",
    "GMOの新サービスを発表",
    "ハッキングの歴史を読む",
  ]) assert.equal(score(title).readerValue.signals.aiSecurityOpportunity,false,title);
  assert.equal(config.readerValuePolicy.weights.aiPracticalUse,undefined);
  assert.equal(config.sources.some(s=>s.id==='gnews-gmo-ai'),false);
});

test("未確認の攻撃説や催事を優先枠に入れない", () => {
  for(const title of [
    "GMOがAIでハッキングされたかもしれない、被害を予想",
    "AIサイバー攻撃対策のセミナーを開催",
    "親子教室でAIハッキング対策を発表",
  ]) assert.equal(score(title).readerValue.signals.aiSecurityOpportunity,false,title);
});

test("日次検索からGMO続報を拾い、古い事件・株価だけの記事・既存除外は維持する", async t => {
  const source=config.sources.find(s=>s.id==='gnews-ai-security');
  assert.equal(source.official,false);
  const query=new URL(source.url).searchParams.get('q');
  assert.match(query,/GMO/);
  assert.match(query,/不正アクセス/);
  assert.match(query,/when:2d/);
  const entries=[
    ["GMO『お名前.com デスクトップクラウド』への不正アクセスについて対応を発表", now-3600000],
    ["GMOの古い不正アクセス被害を発表", now-72*3600000],
    ["GMO株価がサイバー攻撃被害で暴落", now-3600000],
    ["GMO不正アクセスの容疑で逮捕と発表", now-3600000],
    ["天秤AIをリニューアル、複数モデルの回答を比較", now-3600000],
  ];
  const xml=`<rss><channel>${entries.map(([title,date],i)=>`<item><title>${title}</title><link>https://example.com/security/${i}</link><pubDate>${new Date(date).toUTCString()}</pubDate></item>`).join('')}</channel></rss>`;
  t.mock.method(globalThis,'fetch',async()=>new Response(xml));
  const result=await runScout({config:{...config,sources:[source]},now,chartState:{}});
  const eligible=result.candidates.filter(c=>isEligible(c,config.minScore,config.minCriticality));
  assert.deepEqual(eligible.map(c=>c.title),[entries[0][0]]);
  assert.equal(result.excluded.filter(c=>c.reason==='excluded_category').length,2);
  assert.ok(result.sourceStatus[0].ok);
});
