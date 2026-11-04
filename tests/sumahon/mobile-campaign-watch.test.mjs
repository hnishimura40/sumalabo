import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {canonicalUrl,allowedUrl,extractPage,fetchPage,collectCampaigns,compareObservations,acknowledge,verifyPublicationReceipt} from '../../scripts/automation/mobile-campaign-watch.mjs';
import {START,END,validateCatalog,renderCampaignSection,updateArticle,sectionVersion,assertApplyAuthorized} from '../../scripts/automation/mobile-campaign-article.mjs';
const config=JSON.parse(readFileSync(new URL('../../data/automation/mobile-campaign-watch.json',import.meta.url),'utf8'));
const carrier={id:'sample',name:'回線A',url:'https://carrier.example/campaign/',hosts:['carrier.example'],paths:['/campaign/']};
const cfg={...config,carriers:[carrier],minimumTextLength:15,maximumTextLength:5000};
const now='2026-11-03T08:00:00Z';
const page=(text='特典1000ポイント。乗り換えと翌月開通が条件です。',extra={})=>({ok:true,carrier:'sample',url:'https://carrier.example/campaign/a/',kind:'detail',title:'特典A',text,hash:text,links:[],...extra});
const initial={schemaVersion:1,pages:{},pending:[],completed:[]};
const campaign=()=>({id:'sample-a',carrier:'sample',title:'特典A',status:'active',benefit:'最大1000ポイント',eligible:'他社から乗り換える人',requirements:'翌月末までに開通',exclusions:'同系列からの移行は対象外',entry:'公式専用ページ',receiveTiming:'開通の翌々月',deadlineLabel:'2026年11月4日23:59まで',endsAt:'2026-11-04T23:59:00+09:00',monthlyCost:'月額1000円',fees:'事務手数料100円',caveats:'継続利用が必要',suitedFor:'条件を満たす乗り換え希望者',verifiedAt:now,sources:['https://carrier.example/campaign/a/']});
const catalog=()=>({schemaVersion:1,campaigns:[campaign()]});

test('公式一覧から確認したショップのキャンペーン詳細を巡回対象に含める',()=>{
  for(const [id,url] of [['ahamo','https://ahamo.com/special/lp/dpointcp/001.html'],['uq','https://shop.uqmobile.jp/shop/cashback/'],['ymobile','https://www.ymobile.jp/store/sp/sim/'],['docomo','https://onlineshop.docomo.ne.jp/special/sim-campaign'],['softbank','https://www.softbank.jp/mobile/special/sim-paypay-point/'],['iijmio','https://www.iijmio.jp/campaign/mio.html']]){
    const c=config.carriers.find(c=>c.id===id);
    assert.equal(allowedUrl(url,c),true,id);
    assert.ok(c.resources.some(r=>r.url===url),id);
    assert.equal(allowedUrl(url.replace(new URL(url).hostname,new URL(url).hostname+'.evil.example'),c),false);
  }
});

test('公式HTTPS範囲だけ巡回し、広告用パラメータだけを取り除く',()=>{
  assert.equal(canonicalUrl('/campaign/a/?utm_source=x&code=required#entry',carrier.url),'https://carrier.example/campaign/a/?code=required');
  assert.equal(allowedUrl('https://carrier.example.evil.test/campaign/',carrier),false);
  assert.equal(allowedUrl('http://carrier.example/campaign/',carrier),false);
  assert.equal(allowedUrl('https://carrier.example/campaign/archive/',carrier),false);
});
test('バナーaltの特典額と条件を残し、コメント・スクリプト・ナビの差を無視する',()=>{
  const html='<title>キャンペーン</title><main><nav>古い100円</nav><!-- 終了 --><script>価格999</script><img alt="最大2万ポイント"/><p>他社からの乗り換えが対象。翌月末までの開通が必要。</p><a href="/campaign/new/">詳細</a></main>';
  const p=extractPage(html,carrier.url,carrier,cfg);
  assert.match(p.text,/2万ポイント/);assert.doesNotMatch(p.text,/999|終了|100円/);
  assert.equal(p.links[0].url,'https://carrier.example/campaign/new/');
  assert.equal(p.hash,extractPage(html.replace('価格999','価格888'),carrier.url,carrier,cfg).hash);
});
test('403・チャレンジ・外部へのリダイレクトを終了や成功にしない',async()=>{
  for(const response of [new Response('forbidden',{status:403}),new Response('<title>Just a moment</title><main>verify you are human</main>',{headers:{'content-type':'text/html'}}),new Response('',{status:302,headers:{location:'https://evil.example/campaign/'}})]){
    const p=await fetchPage(carrier.url,carrier,cfg,async()=>response);assert.equal(p.ok,false);
  }
});
test('新規・条件差分を記録し、未処理の変更は翌日の無変更でも残す',()=>{
  const first=compareObservations(initial,[page()],now);
  assert.equal(first.changes[0].kind,'new_campaign_page');
  const same=compareObservations(first.state,[page()],now);
  assert.equal(same.changes.length,0);assert.equal(same.state.pending.length,1);
  const changed=compareObservations(same.state,[page('特典2000ポイント。対象プランが変更。')],now);
  assert.equal(changed.changes[0].kind,'campaign_page_changed');assert.equal(changed.state.pending.length,2);
  assert.match(changed.changes[0].before.text,/1000/);assert.match(changed.changes[0].after.text,/2000/);
});
test('特典額が同じでも開通・継続条件が変われば差分になる',()=>{
  const state=compareObservations(initial,[page('1000ポイント。翌月末までの開通が条件です。')],now).state;
  const result=compareObservations(state,[page('1000ポイント。今月末までの開通が条件です。')],now);
  assert.equal(result.changes.length,1);assert.match(result.changes[0].after.text,/今月末/);
});
test('取得失敗で前回の正常証拠を消さず、一覧のリンク消失は終了と認定しない',()=>{
  const listed=page('一覧のキャンペーン情報です',{kind:'listing',url:carrier.url,links:[{url:page().url,label:'A'}]});
  const state=compareObservations(initial,[listed,page()],now).state;
  const result=compareObservations(state,[{ok:false,carrier:'sample',url:page().url,status:404}, {...listed,links:[]}],now);
  assert.equal(result.state.pages['sample:'+page().url].text,page().text);
  assert.equal(result.changes[0].kind,'listing_changed');assert.equal(result.changes[0].removedLinks.length,1);
  assert.equal(result.state.publishedCampaigns,undefined);
});
test('HTMLが変わらなくても掲載済みの期限到来を1回だけ未処理に追加する',()=>{
  const state={...initial,publishedCampaigns:[{...campaign(),url:page().url,endsAt:'2026-11-02T23:59:00+09:00'}]};
  const result=compareObservations(state,[],now);
  assert.equal(result.changes[0].kind,'deadline_reached');
  assert.equal(compareObservations(result.state,[],now).changes.length,0);
});
test('掲載中の公式詳細が取得不能になった場合は再確認を未処理に残す',()=>{
  const state={...initial,publishedCampaigns:[{...campaign(),url:page().url}]};
  const result=compareObservations(state,[{ok:false,carrier:'sample',url:page().url,error:'http_503'}],now);
  assert.equal(result.changes[0].kind,'verification_failed');
  assert.equal(result.state.publishedCampaigns[0].status,'active');
});
test('一覧から消えた既知の詳細ページも継続取得し、上限超過を隠さない',async()=>{
  const requests=[];const state={...initial,pages:{known:page()}};
  const html='<title>公式</title><main>キャンペーン一覧の説明です。<a href="/campaign/b/">新規B</a><a href="/campaign/c/">新規C</a></main>';
  const result=await collectCampaigns({...cfg,maxDetailsPerCarrier:2},state,async url=>{requests.push(url);return new Response(html,{headers:{'content-type':'text/html; charset=utf-8'}});});
  assert.equal(result.coverage[0].truncated,true);
  const full=await collectCampaigns(cfg,state,async url=>{requests.push(url);return new Response(html,{headers:{'content-type':'text/html'}});});
  assert.ok(full.observations.some(p=>p.url===page().url));
});
test('公式の遅延読み込みJSONから新しい詳細URLと期限も観測する',async()=>{
  const resource='https://carrier.example/campaign/data.json';
  const c={...carrier,resources:[{url:resource,format:'json'}]};
  const result=await fetchPage(resource,c,cfg,async()=>new Response(JSON.stringify([{title:'新規特典',period:'11月3日まで',link:'/campaign/new/'}]),{headers:{'content-type':'application/json'}}));
  assert.equal(result.ok,true);assert.match(result.text,/11月3日/);assert.equal(result.links[0].url,'https://carrier.example/campaign/new/');
});
test('公開・検品証拠なしの完了扱いを拒否し、確認済みの装飾変更だけは理由付きで処理できる',()=>{
  const state=compareObservations(initial,[page()],now).state;const ids=state.pending.map(e=>e.id);
  assert.throws(()=>acknowledge(state,{eventIds:ids,outcome:'published',reason:'updated'},now));
  const next=acknowledge(state,{eventIds:ids,outcome:'no_material_change',reason:'公式条件は同一。装飾のみ変更'},now);
  assert.equal(next.pending.length,0);assert.equal(next.completed.length,1);
  assert.throws(()=>acknowledge(state,{eventIds:['wrong'],outcome:'no_material_change',reason:'x'},now));
});
test('完了前にPR実マージ・公開本文のバージョン・strict verifyを実取得で確認する',async()=>{
  const c={...cfg,targetSlug:'mobile-plan-cost-comparison'};
  const receipt={outcome:'published',articleUrl:'https://sumalabo.com/articles/mobile-plan-cost-comparison/',prUrl:'https://github.com/hnishimura40/sumalabo/pull/1',sectionVersion:'a'.repeat(24)};
  const fetcher=async url=>url.includes('api.github')?Response.json({merged:true}):url.includes('verify-publication')?Response.json({status:'published'}):new Response('<section data-campaign-version="'+receipt.sectionVersion+'">');
  await verifyPublicationReceipt(receipt,c,fetcher);
  await assert.rejects(()=>verifyPublicationReceipt(receipt,c,async url=>url.includes('api.github')?Response.json({merged:false}):fetcher(url)));
  await assert.rejects(()=>verifyPublicationReceipt(receipt,c,async url=>url.includes('/articles/')?new Response('old content'):fetcher(url)));
});
test('特典だけの不完全・非公式・古い・期限切れの開催中データを記事化しない',()=>{
  for(const change of [{requirements:''},{sources:['https://other.example/']},{verifiedAt:'2026-10-01T00:00:00Z'},{endsAt:'2026-11-01T23:59:00+09:00'},{endsAt:'2026-11-04'}]){
    const data=catalog();Object.assign(data.campaigns[0],change);assert.throws(()=>validateCatalog(data,cfg,Date.parse(now)));
  }
});
test('既存記事の本文・公開日時を保ち、終了と未確認はおすすめから外す',()=>{
  const data=catalog();const section=renderCampaignSection(data,cfg,Date.parse(now));
  const article='---\ntitle: "元の記事"\nupdated: "2026-08-04"\npublishAt: "2026-08-04T12:00:00+09:00"\n---\n本文は変更しない。\n';
  const next=updateArticle(article,section,'2026-11-03');
  assert.match(next,/本文は変更しない/);assert.match(next,/publishAt: "2026-08-04T12:00:00\+09:00"/);
  assert.equal(updateArticle(next,section,'2026-11-03'),next);
  assert.match(next,new RegExp(sectionVersion(data)));
  for(const status of ['ended','unverified']){data.campaigns[0].status=status;assert.match(renderCampaignSection(data,cfg,Date.parse(now)),/現在のおすすめ対象から外しています/);}
  assert.throws(()=>updateArticle(article+START,section,'2026-11-03'));
  assert.throws(()=>updateArticle(article+END+START,section,'2026-11-03'));
});
test('公式テキストに記号やHTMLがあってもMDXへ実行コードを差し込めない',()=>{
  const data=catalog();data.campaigns[0].title='<script>{danger}</script>';
  const section=renderCampaignSection(data,cfg,Date.parse(now));
  assert.doesNotMatch(section,/<script>/);assert.match(section,/&#123;danger&#125;/);
});
test('承認済みの範囲だけapplyを許可し、draft_onlyや承認情報なしは拒否する',()=>{
  assert.equal(config.publicationMode,'auto_publish');
  assert.doesNotThrow(()=>assertApplyAuthorized(config,true));
  assert.throws(()=>assertApplyAuthorized({...config,publicationMode:'draft_only'},true),/publication_authorization_required/);
  assert.throws(()=>assertApplyAuthorized({...config,publicationAuthorization:undefined},true),/publication_authorization_required/);
  assert.doesNotThrow(()=>assertApplyAuthorized({...config,publicationMode:'draft_only'},false));
});
test('applyが承認済みでも不完全な入力で既存記事を変更しない',()=>{
  const article=new URL('../../content/articles/mobile-plan-cost-comparison.mdx',import.meta.url);
  const before=readFileSync(article,'utf8');
  const command=fileURLToPath(new URL('../../scripts/automation/mobile-campaign-article.mjs',import.meta.url));
  const result=spawnSync(process.execPath,[command,'not-used.json','--apply'],{encoding:'utf8',windowsHide:true});
  assert.notEqual(result.status,0);assert.match(result.stderr,/ENOENT/);assert.doesNotMatch(result.stderr,/publication_authorization_required/);
  assert.equal(readFileSync(article,'utf8'),before);
});
