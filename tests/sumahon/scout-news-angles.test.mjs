import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { annotateNewsAngles } from "../../scripts/automation/scout-news-angles.mjs";
import { parseFeed, tokenize, scoreItem, isEligible, runScout } from "../../scripts/automation/scout.mjs";
const config=JSON.parse(readFileSync(new URL("../../data/automation/watch-sources.json",import.meta.url),"utf8"));
const now=Date.parse("2026-11-03T08:00:00Z");
const top=config.sources.find(s=>s.id==='gnews-top-jp');
const article=(title,extra={})=>({title,description:'',pubDate:new Date(now-3600000).toISOString(),link:'https://example.com/article',...extra});
function annotate(sources,items){
  const results=sources.map((s,i)=>({source:s.id,ok:true,items:items[i]}));
  annotateNewsAngles(results,{...config,sources},now,tokenize);
  return results;
}
test('RSSの媒体URLを取得し、Googleの代理URLを媒体と混同しない',()=>{
  const [item]=parseFeed('<rss><item><title>ニュース</title><link>https://news.google.com/rss/articles/123</link><source url="https://publisher.example/">媒体名</source></item></rss>');
  assert.deepEqual(item.publisher,{url:'https://publisher.example/',name:'媒体名'});
});
test('企業名リストにない企業の事件も主要ニュース掲載から同じ条件で拾う',()=>{
  for(const name of ['GMO','未知の会社','地域の学校']){
    const item=article(`${name}で不正アクセス被害、対応と対策を発表`);
    annotate([top],[[item]]);
    const c=scoreItem(item,top,config,now);
    assert.equal(c.readerValue.signals.aiNewsOpportunity,true,name);
    assert.equal(c.readerValue.aiPriority,1);
    assert.equal(isEligible(c,50,12),true);
    assert.equal(item.newsTrend.basis,'major_news_listing');
    assert.match(c.readerValue.suggestedAngle,/根拠なしにAIが原因と断定しない/);
  }
  assert.equal(config.readerValuePolicy.keywords.securityServices,undefined);
  assert.equal(config.sources.some(s=>/gmo/i.test(s.id)),false);
});
test('AI語やセキュリティに限定せず、科学・仕事・真偽・作品の疑問を提案する',()=>{
  for(const [title,angle] of [
    ['台風の進路予測に新たな観測データ、研究チームが解析','science'],
    ['人手不足で配送の自動化が進む、現場の仕事はどう変わる','work'],
    ['有名人の偽音声が拡散、本人確認と真偽の検証が課題','authenticity'],
    ['人気ドラマに登場した対話ロボットが注目を集める','culture'],
  ]){
    const item=article(title);annotate([top],[[item]]);
    assert.ok(item.newsTrend.aiAngles.some(a=>a.id===angle),title);
    assert.equal(scoreItem(item,top,config,now).readerValue.signals.aiNewsOpportunity,true);
  }
});
test('話題性だけ・AIと書くだけ・バズったという自己申告では優先枠を開かない',()=>{
  const unrelated=article('有名人の結婚発表が話題');annotate([top],[[unrelated]]);
  assert.equal(unrelated.newsTrend.verified,true);
  assert.equal(scoreItem(unrelated,top,config,now).readerValue.signals.aiNewsOpportunity,false);
  const lone=article('AI時代の不正アクセス対策が大バズり');
  const source={id:'single',url:'https://single.example/rss',weight:10};
  annotate([source],[[lone]]);
  assert.equal(lone.newsTrend.verified,false);
  assert.equal(scoreItem(lone,source,config,now).readerValue.signals.aiNewsOpportunity,false);
});
test('同媒体の別フィード・Google代理URL・古い記事・未来記事で媒体数を水増ししない',()=>{
  const title='未知の企業で不正アクセス被害、現在の対応を発表';
  const sources=[{id:'a',url:'https://same.example/rss'},{id:'b',url:'https://same.example/feed'},
    {id:'proxy',url:'https://news.google.com/rss/search?q=test'}];
  const results=annotate(sources,[[article(title)],[article(title)],[article(title)]]);
  assert.equal(results[0].items[0].newsTrend.publisherCount,1);
  assert.equal(results[0].items[0].newsTrend.verified,false);
  const old=article(title,{pubDate:new Date(now-72*3600000).toISOString()});
  const future=article(title,{pubDate:new Date(now+3600000).toISOString()});
  annotate([top],[[old,future]]);
  assert.equal(old.newsTrend,undefined);assert.equal(future.newsTrend,undefined);
});
test('2媒体の類似見出しを集約し、記事URL・媒体・確認時刻・疑問を残す',()=>{
  const title='地方の病院で不正アクセス被害、現在の対応を発表';
  const sources=[{id:'a',url:'https://one.example/rss'},{id:'b',url:'https://two.example/rss'}];
  const item=article(title);
  annotate(sources,[[item],[article(title+' - 別媒体',{link:'https://two.example/news'})]]);
  assert.equal(item.newsTrend.verified,true);
  assert.equal(item.newsTrend.basis,'multiple_publishers');
  assert.equal(item.newsTrend.publisherCount,2);
  assert.equal(item.newsTrend.coverage.length,2);
  assert.equal(item.newsTrend.observedAt,new Date(now).toISOString());
  assert.equal(item.newsTrend.aiAngles[0].id,'security');
});
test('失敗・類似しないニュース・検索RSSの偽のgeneral-news指定を根拠にしない',()=>{
  const source={id:'fake',role:'general-news',url:'https://news.google.com/rss/search?q=AI'};
  const item=article('未知企業で不正アクセス被害を発表');
  annotate([source],[[item]]);assert.equal(item.newsTrend.verified,false);
  const results=[{source:top.id,ok:false,items:[article(item.title)]}];
  annotateNewsAngles(results,{...config,sources:[top]},now,tokenize);
  assert.equal(results[0].items[0].newsTrend,undefined);
});
test('広域RSS取得から採点へ接続し、催事・噂・既存除外・鮮度を維持する',async t=>{
  const titles=['未知企業で不正アクセス被害、対応を発表','AIでハッキングされたかもしれないという噂',
    '親子教室で偽画像の検証を体験','株価暴落でAIの業務自動化を発表','人気俳優の結婚発表'];
  const xml='<rss><channel>'+titles.map((title,i)=>`<item><title>${title}</title><link>https://new.example/${i}</link><pubDate>${new Date(now-3600000).toUTCString()}</pubDate></item>`).join('')+'</channel></rss>';
  t.mock.method(globalThis,'fetch',async()=>new Response(xml));
  const result=await runScout({config:{...config,sources:[top]},now,chartState:{}});
  const accepted=result.candidates.filter(c=>isEligible(c,50,12));
  assert.deepEqual(accepted.map(c=>c.title),[titles[0]]);
  assert.ok(accepted[0].newsTrend.aiAngles.length);
  assert.ok(result.excluded.some(c=>c.category==='finance_market'));
});
