import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAppChart } from "../../scripts/automation/scout-ai-trends.mjs";
import { scoreItem, isEligible, runScout } from "../../scripts/automation/scout.mjs";

const config = JSON.parse(readFileSync(new URL("../../data/automation/watch-sources.json", import.meta.url), "utf8"));
const now = Date.parse("2026-11-03T08:00:00Z");
const jp = config.sources.find(s => s.id === "apple-ai-charts-jp");
const row = (id, name) => ({ id, name, artistName: "Example AI, Inc.", releaseDate: "2026-09-01", url: `https://apps.apple.com/jp/app/example/id${id}` });
const feed = (rows) => ({ feed: { country: "jp", updated: new Date(now - 3600_000).toUTCString(), results: rows } });
const score = (title, description = "") => scoreItem({ title, description, pubDate: new Date(now - 10800000).toISOString() }, { weight: 10 }, config, now);
const eligible = c => isEligible(c, config.minScore, config.minCriticality);

test("古い公開日でも、現在の公式ランキングにいる未掲載AIを拾う", () => {
  const result = parseAppChart(feed([row("123", "Example AI")]), jp, config, now);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].pubDate, undefined);
  assert.equal(result.items[0].appChart.rank, 1);
  assert.equal(result.items[0].appChart.country, "jp");
  assert.equal(result.items[0].appChart.scope, "all-apps");
  assert.equal(result.items[0].appChart.previousRank, null);
  const candidate = scoreItem(result.items[0], jp, config, now);
  assert.equal(eligible(candidate), true);
  assert.equal(candidate.readerValue.aiPriority, 2);
  assert.equal(candidate.ageHours, 0);
});

test("Museは公式提供元を記録し、国と総合順位を区別できる", () => {
  const muse = { ...row("6760173601", "Muse from Meta"), artistName: "Meta Platforms, Inc." };
  const item = parseAppChart(feed([muse]), jp, config, now).items[0];
  assert.equal(item.appChart.artistName, "Meta Platforms, Inc.");
  assert.ok(item.title.includes("日本"));
  assert.equal(/連続|ずっと/.test(item.title), false);
});

test("通常アプリをAI扱いせず、未知のAI名もAI表記から拾う", () => {
  const result = parseAppChart(feed([row("123", "普通の買い物"), row("124", "新しいAI助手")]), jp, config, now);
  assert.deepEqual(result.items.map(x => x.appChart.appId), ["124"]);
  assert.equal(result.items[0].appChart.rank, 2);
});

test("過去観測があるときだけ順位上昇を判定する", () => {
  const rows = Array.from({length: 15}, (_,i) => row(String(i+1), i===14 ? "Example AI" : "普通のアプリ"));
  assert.equal(parseAppChart(feed(rows), jp, config, now).items.length, 0);
  const result = parseAppChart(feed(rows), jp, config, now, {observedAt:new Date(now-86400000).toISOString(),rows:[{id:"15",rank:29}]});
  assert.equal(result.items[0].appChart.rise, 14);
  assert.equal(parseAppChart(feed(rows), jp, config, now, {observedAt:"2026-10-01",rows:[{id:"15",rank:29}]}).items.length,0);
});

test("国違い・古いフィード・未来日時・非Appleフィードを採用しない", () => {
  assert.throws(() => parseAppChart({feed:{...feed([]).feed,country:"us"}}, jp, config, now));
  assert.throws(() => parseAppChart({feed:{...feed([row("1","Example AI")]).feed,updated:"2026-10-01"}}, jp, config, now));
  assert.throws(() => parseAppChart({feed:{...feed([row("1","Example AI")]).feed,updated:"2026-12-01"}}, jp, config, now));
  assert.throws(() => parseAppChart(feed([row("1","Example AI")]), {...jp,url:"https://example.com/jp/apps/top-free/100/apps.json"}, config, now));
});

test("見出しの1位という自己申告だけで公式順位の加点をしない", () => {
  assert.equal(score("最新AIがApp Store総合1位と話題").readerValue.signals.aiChartMomentum, false);
});

test("AIベンチマークは行動変化がなくても主軸として採用できる", () => {
  const candidate = score("新しいAIベンチマークの評価スコアを比較、LMArenaの順位を確認", "性能レポートの測定条件を整理");
  assert.ok(candidate.criticality.net < 0, "旧基準ではレポートが減点される");
  assert.equal(eligible(candidate), true);
  assert.equal(candidate.readerValue.aiPriority, 2);
  assert.equal(candidate.readerValue.signals.nicheAiUpdate, false);
});

test("海外の重要AI指標も拾い、日本での利用可否は記事で説明する", () => {
  const candidate = score("米国限定のAIモデル、GPQAベンチマークで新しい評価スコアを発表");
  assert.equal(candidate.japanAxes.usOnlyBlocked, true);
  assert.equal(eligible(candidate), true);
});

test("AIと書いただけの親子教室や純粋な調査を主軸へ昇格させない", () => {
  for (const title of ["親子教室でAIアートの無料イベントを開始", "AI利用調査、305人に人気を聞いた"]) {
    assert.equal(score(title).readerValue.aiCoreEligible, false);
  }
  assert.ok(score("親子教室でAIアートの無料イベントを開始").readerValue.signals.peripheralEvent);
});

test("未確認のモデル噂やMetaのVRハードをAI重要発表と誤認しない", () => {
  assert.equal(score("OpenAIの新モデルを明日発表かというリーク").readerValue.aiCoreEligible, false);
  assert.equal(score("MetaがVRヘッドセットの新モデルを発表").readerValue.aiCoreEligible, false);
});

test("RSSと公式ランキングを同時に収集し、AIを非AI催事より先に並べる", async (t) => {
  const normal = { id:"fixture-rss",type:"rss",url:"https://example.com/feed",weight:10 };
  const chart = feed([row("9911223344", "未掲載の新しいAIアプリ")]);
  const date = new Date(now-3600_000).toUTCString();
  const xml = `<rss><channel><item><title>親子教室でAIアートを無料体験、国内イベントの申込開始</title><link>https://example.com/event</link><pubDate>${date}</pubDate></item><item><title>最新AIのGPQAベンチマークと評価スコアを比較</title><link>https://example.com/benchmark</link><pubDate>${date}</pubDate></item></channel></rss>`;
  t.mock.method(globalThis,"fetch",async url=>String(url)===jp.url ? new Response(JSON.stringify(chart)) : new Response(xml));
  const result = await runScout({config:{...config,sources:[jp,normal]},now,chartState:{}});
  assert.ok(result.candidates[0].readerValue.aiCoreEligible);
  assert.ok(result.candidates.some(c=>c.appChart?.rank===1));
  assert.ok(result.chartSnapshots[jp.id]);
  assert.ok(result.sourceStatus.every(s=>s.ok));
});

test("ランキング取得失敗を記録し、他のニュース取得は継続する", async (t) => {
  t.mock.method(globalThis,"fetch",async()=>new Response("unavailable",{status:503}));
  const result = await runScout({config:{...config,sources:[jp]},now,chartState:{}});
  assert.equal(result.sourceStatus[0].ok,false);
  assert.equal(Object.keys(result.chartSnapshots).length,0);
});

test("同じAIアプリの日米順位を別記事候補として二重採用しない", async (t) => {
  const us = config.sources.find(s => s.id === "apple-ai-charts-us");
  const jpFeed = feed([row("9911223355", "Acrossmarket AI")]);
  const usFeed = {feed:{...jpFeed.feed,country:"us",results:[{...jpFeed.feed.results[0],url:"https://apps.apple.com/us/app/example/id9911223355"}]}};
  t.mock.method(globalThis,"fetch",async url=>new Response(JSON.stringify(String(url)===jp.url ? jpFeed : usFeed)));
  const result = await runScout({config:{...config,sources:[jp,us]},now,chartState:{}});
  assert.equal(result.candidates.length,1);
  assert.equal(result.candidates[0].appChart.country,"jp");
  assert.equal(Object.keys(result.chartSnapshots).length,2);
});
