import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseRanking,fetchRanking,observeRankings,digest,verifyPublishedComparison} from '../../scripts/automation/product-comparison-watch.mjs';
import {validateReview,validateProductPhoto,renderComparison,updateComparisonArticle} from '../../scripts/automation/product-comparison-article.mjs';
import {validateIdentity} from '../../scripts/automation/product-comparison-identity.mjs';
const identityPolicy=JSON.parse(readFileSync(new URL('../../data/automation/sumalabo-editorial-identity.json',import.meta.url),'utf8'));
const config=JSON.parse(readFileSync(new URL('../../data/automation/product-comparison-watch.json',import.meta.url),'utf8'));
const category=config.categories[0],now=Date.parse('2026-11-03T12:00:00Z'),stamp=new Date(now).toISOString();
function html(count=10){return '<title>価格.com 人気売れ筋ランキング</title><p>更新日：2026/11/03 ( 2026/10/27 ～ 2026/11/02 の集計結果です)</p>'+Array.from({length:count},(_,i)=>`<div class="rkgBoxHead rkgBoxHead-2${i<3?' rank'+(i+1):''}"><a href="https://kakaku.com/item/K00000000${String(i+1).padStart(2,'0')}/"><span class="rkgBoxNum"><span class="num">${i+1}</span>位</span><span class="rkgBoxNameMaker">メーカーA</span><span class="rkgBoxNameItem">モデル${i+1}</span></a></div><div class="rkgPrice"><span class="price">&#165;${i+1},000</span></div><dl><dt class="p-specLabel_itemTtl">重量</dt><dd>200g</dd></dl>`).join('');}
function fixtures(){
  const snapshot=parseRanking(html(),category,stamp);
  const products=snapshot.products.map(p=>({id:p.id,model:p.name,status:'eligible',suitableFor:'スマホを毎日持ち歩く人',why:'容量と出力が用途に合う',caution:'同時使用時の出力が下がる',facts:category.criteria.map(axis=>({axis,value:'確認済みの仕様値',sourceType:'manufacturer',sourceUrl:'https://maker.example/product/'+p.id,verifiedAt:stamp})),officialEvidence:[{model:p.name,url:'https://maker.example/product/'+p.id,verifiedAt:stamp}],safetyReview:{status:'checked',recalled:false,url:'https://maker.example/support',verifiedAt:stamp,note:'当該型番のメーカー案内を照合'}}));
  products.forEach(p=>p.display={name:p.model,cells:['10000mAh','190g','30W']});
  const profiles=products.slice(0,3).map((p,i)=>({persona:['普段使い','旅行','PC兼用'][i],productId:p.id,because:category.criteria.slice(0,2).map(axis=>({axis,text:'この使用条件を満たす'})),tradeoff:'荷物が重くなる',avoidIf:'軽さだけを重視する場合'}));
  const identity={policyVersion:identityPolicy.version,opening:{question:'日本メーカーなら日本製？',answer:'拠点と製造国の列を別に見よう。'},groups:identityPolicy.categoryComparisonGroups[category.id].map(g=>({...g,title:g.id,intro:'選ぶための比較',question:'どの違いを見ればよい？',answer:'用途に合う条件を比べよう。',columns:g.fields.map(field=>({field,label:field}))}))};
  const evidence={url:'https://maker.example/spec',type:'manufacturer',label:'メーカー公式'};
  for(const p of products){
    p.image={model:p.model,imageModel:p.model,imageUrl:'https://tshop.r10s.jp/shop/cabinet/product.jpg',productUrl:'https://item.rakuten.co.jp/shop/product/',caption:'同一モデルの商品写真',verifiedAt:stamp};
    p.comparisonFacts=Object.fromEntries([...new Set([...identityPolicy.commonComparisonFields,...identityPolicy.categoryComparisonGroups[category.id].flatMap(g=>g.fields)])].map(field=>[field,{value:'未確認',status:'unknown',reason:'公式記載で確定できず',sources:[evidence],verifiedAt:stamp}]));
  }
  return {snapshot,review:{identity,schemaVersion:1,categoryId:category.id,rankingDigest:snapshot.digest,testBasis:'public_sources',reviewedAt:stamp,products,profiles,editorial:{definition:'持ち運んで機器へ給電する製品です。',audience:'外出先で充電したい人',unaffected:'今の製品で足りる人',conclusion:'用途で選ぶ'},presentation:{columns:category.displayColumns,audience:'スマホ・PC用で迷う人',conclusion:'用途と必要な出力で選ぶ'}}};
}
test('トップ3の装飾・翌日の矢印に依存せず、実際の表示10製品と集計期間を保存する',()=>{
  const s=parseRanking(html(12),category,stamp);assert.equal(s.products.length,10);assert.equal(s.products[9].rank,10);assert.equal(s.products[0].priceYen,1000);assert.equal(s.products[0].specs[0].value,'200g');assert.equal(s.period.to,'2026/11/02');
});
test('10製品未満・別ランキング・日付不明を成功扱いしない',()=>{
  assert.throws(()=>parseRanking(html(9),category,stamp));
  assert.throws(()=>parseRanking(html().replace('人気売れ筋','満足度'),category,stamp));
  assert.throws(()=>parseRanking(html().replace('更新日：','作成：'),category,stamp));
});
test('価格なしは0円にせず、同順位でも掲載順の10製品を維持する',()=>{
  const s=parseRanking(html().replace('&#165;1,000','価格なし').replace('<span class="num">2</span>','<span class="num">1</span>'),category,stamp);
  assert.equal(s.products[0].priceYen,null);assert.equal(s.products[1].rank,1);assert.equal(s.products[1].position,2);
});
test('取得失敗・別URLへの移動を保存済みランキングで上書きしない',async()=>{
  const failed=await fetchRanking(category,async()=>new Response('denied',{status:403}),stamp);
  assert.equal(failed.ok,false);const state={snapshots:{[category.id]:{lastGood:true}},pending:[],completed:[]};
  const next=observeRankings(state,[failed],stamp);assert.deepEqual(next.snapshots,state.snapshots);
});
test('同じ月の再実行で仕事を重複させず、公開完了前は未処理を残す',()=>{
  const {snapshot}=fixtures();let state=observeRankings(undefined,[{ok:true,categoryId:category.id,snapshot}],stamp);
  state=observeRankings(state,[{ok:true,categoryId:category.id,snapshot}],stamp);assert.equal(state.pending.length,1);
  state.completed.push({...state.pending[0]});state.pending=[];
  assert.equal(observeRankings(state,[{ok:true,categoryId:category.id,snapshot}],stamp).pending.length,0);
  assert.equal(observeRankings(state,[{ok:true,categoryId:category.id,snapshot}],'2026-12-01T00:00:00Z').pending.length,1);
});
test('候補外製品の混入・10製品の欠落・保存ランキングの改ざんを拒否する',()=>{
  const a=fixtures();a.review.products[0].id='K9999999999';assert.throws(()=>validateReview(a.review,a.snapshot,category,config,now));
  const b=fixtures();b.review.products.pop();assert.throws(()=>validateReview(b.review,b.snapshot,category,config,now));
  const c=fixtures();c.snapshot.products[0].priceYen=1;assert.throws(()=>validateReview(c.review,c.snapshot,category,config,now));
});
test('古い価格・未来の取得日・集計期間の逆転を新しい比較に使わない',()=>{
  const a=fixtures();assert.throws(()=>validateReview(a.review,a.snapshot,category,config,now+73*3600000));
  const b=fixtures();b.snapshot.observedAt='2026-11-04T00:00:00Z';assert.throws(()=>validateReview(b.review,b.snapshot,category,config,now));
  const c=fixtures();c.snapshot.period.from='2026/11/10';const {digest:_,...rest}=c.snapshot;c.snapshot.digest=digest({...rest,observedAt:undefined});c.review.rankingDigest=c.snapshot.digest;assert.throws(()=>validateReview(c.review,c.snapshot,category,config,now));
});
test('どんな人にどれを選ぶか、理由2軸・弱点・向かない条件を必須にする',()=>{
  const a=fixtures();assert.doesNotThrow(()=>validateReview(a.review,a.snapshot,category,config,now));
  for(const key of ['tradeoff','avoidIf']){const b=fixtures();b.review.profiles[0][key]='';assert.throws(()=>validateReview(b.review,b.snapshot,category,config,now));}
  const c=fixtures();c.review.profiles[0].because=[{axis:category.criteria[0],text:'人気1位だから'}];assert.throws(()=>validateReview(c.review,c.snapshot,category,config,now));
});
test('別型番のメーカー情報・回収対象・確認不足の製品をおすすめにしない',()=>{
  const a=fixtures();a.review.products[0].officialEvidence[0].model='別型番';assert.throws(()=>validateReview(a.review,a.snapshot,category,config,now));
  const b=fixtures();b.review.products[0].safetyReview.recalled=true;assert.throws(()=>validateReview(b.review,b.snapshot,category,config,now));
  const c=fixtures();c.review.products[0].status='unverified';c.review.products[0].exclusionReason='照合未了';assert.throws(()=>validateReview(c.review,c.snapshot,category,config,now));
  const d=fixtures();d.review.products[0].model='違う製品';d.review.products[0].officialEvidence[0].model='違う製品';assert.throws(()=>validateReview(d.review,d.snapshot,category,config,now));
});
test('店舗ページをメーカー一次情報としたり、未確認軸を推薦理由にしない',()=>{
  const a=fixtures();a.review.products[0].officialEvidence[0].url='https://www.amazon.co.jp/test';assert.throws(()=>validateReview(a.review,a.snapshot,category,config,now));
  const b=fixtures();b.review.products[0].facts[0].value='未確認';assert.throws(()=>validateReview(b.review,b.snapshot,category,config,now));
});
test('比較表・用途別の理由・注意点・出典を出し、実機検証を装わない',()=>{
  const {review,snapshot}=fixtures();review.editorial={definition:'持ち運んで機器に給電する製品です。',audience:'外で充電したい人',unaffected:'今の製品で足りる人',conclusion:'用途で選ぶ'};const section=renderComparison(review,snapshot,category,config,now);
  assert.match(section,/使う場面/);assert.match(section,/妥協する点/);assert.match(section,/実機テストではありません/);assert.match(section,/data-comparison-version=/);assert.match(section,/集計期間/);assert.match(section,/pc-table/);const overview=section.match(/class="pc-table pc-overview"[\s\S]*?<\/table>/)[0];assert.equal((overview.match(/<tr data-status=/g)||[]).length,10);assert.equal((overview.match(/scope="col"/g)||[]).length,4);assert.equal((section.match(/role="tabpanel"/g)||[]).length,3);assert.match(section,/ひまり/);assert.match(section,/らぼまる/);assert.match(section,/pc-detail/);
  const article='---\ntitle: "旧比較"\ndescription: "旧説明"\nupdated: "2026-07-20"\npublishAt: "2026-05-05T09:00:00+09:00"\n---\nimport X from "x";\n\n古いおすすめ';
  const output=updateComparisonArticle(article,section,'新比較','新説明','2026-11-03');assert.doesNotMatch(output,/古いおすすめ/);assert.match(output,/publishAt: "2026-05-05T09:00:00\+09:00"/);assert.match(output,/import X/);
});
test('本番確認はPRマージ・記事の同一比較バージョン・strict verifyを必須にする',async()=>{
  const receipt={articleUrl:`https://sumalabo.com/articles/${category.articleSlug}/`,prUrl:'https://github.com/hnishimura40/sumalabo/pull/1',version:'a'.repeat(24)};
  const response=async url=>url.includes('api.github')?Response.json({merged:true}):url.includes('verify-publication')?Response.json({status:'published'}):new Response('<section data-comparison-version="'+receipt.version+'">');
  await verifyPublishedComparison(receipt,category,response);
  await assert.rejects(()=>verifyPublishedComparison(receipt,category,async url=>url.includes('/articles/')?new Response('old'):response(url)));
});

test('商品写真は同じ型番・楽天の出店と画像ホスト・今回の確認を必須にする',()=>{
 const photo={model:'モデル1',imageUrl:'https://thumbnail.image.rakuten.co.jp/@0_mall/shop/cabinet/product.jpg',productUrl:'https://item.rakuten.co.jp/shop/product/',verifiedAt:stamp};
 assert.doesNotThrow(()=>validateProductPhoto(photo,'モデル1',now));
 for(const change of [{model:'別型番'},{imageUrl:'https://unrelated.example/image.jpg'},{productUrl:'https://example.com/shop/product/'},{productUrl:'http://item.rakuten.co.jp/shop/product/'},{verifiedAt:'2026-10-01T00:00:00Z'}])assert.throws(()=>validateProductPhoto({...photo,...change},'モデル1',now));
});
test('短い表示欄でも全10候補と全比較軸を保持し、写真を理由に候補を選び直さない',()=>{
 const {review,snapshot}=fixtures();
 const html=renderComparison(review,snapshot,category,config,now);assert.match(html,/<RakutenAffiliateImage/);assert.equal((html.match(/class="pc-detail"/g)||[]).length,10);for(const axis of category.criteria)assert.ok(html.includes(axis));
 review.products[0].display.cells=['長い説明'.repeat(30),'190g','30W'];assert.throws(()=>renderComparison(review,snapshot,category,config,now),/short_comparison_cells_required/);
});

test('写真欠落・重要比較群の欠落・未確認の根拠なしを完成扱いしない',()=>{
 const a=fixtures();delete a.review.products[8].image;assert.throws(()=>renderComparison(a.review,a.snapshot,category,config,now),/all_ten_product_photos_required/);
 const b=fixtures();b.review.identity.groups.pop();assert.throws(()=>validateIdentity(b.review,category,now),/identity_policy_required/);
 const c=fixtures();delete c.review.products[0].comparisonFacts.manufacturingCountry.reason;assert.throws(()=>validateIdentity(c.review,category,now),/unknown_or_inapplicable_reason_required/);
 const d=fixtures();delete d.review.products[0].comparisonFacts.batteryTechnology;assert.throws(()=>validateIdentity(d.review,category,now),/identity_fact_evidence_required/);
});
test('製造国に販売店をメーカー根拠と偽ったり、色違い写真の注記を省略できない',()=>{
 const a=fixtures();a.review.products[0].comparisonFacts.manufacturingCountry.sources[0]={url:'https://item.rakuten.co.jp/shop/product/',type:'manufacturer',label:'メーカー'};assert.throws(()=>validateIdentity(a.review,category,now),/identity_manufacturer_source_required/);
 const b=fixtures();b.review.products[0].image.imageModel='同じ基本モデルの別色';assert.throws(()=>validateIdentity(b.review,category,now),/reference_photo_caption_required/);
 b.review.products[0].image.variantNote='参考写真は黒。比較対象は白。';assert.doesNotThrow(()=>validateIdentity(b.review,category,now));
});
test('飛行機の可否はWhと現行の国交省・航空会社根拠がなければ判定を拒否する',()=>{
 const {review}=fixtures();review.identity.travelScope='ANA国内線・確認日付き';
 const f=review.products[0].comparisonFacts;
 f.carryOn={value:'条件付き可',status:'verified',sources:[{url:'https://www.mlit.go.jp/current',type:'authority',label:'国交省'},{url:'https://www.ana.co.jp/current',type:'airline',label:'ANA'}],verifiedAt:stamp};
 assert.throws(()=>validateIdentity(review,category,now),/flight_wh_and_current_rules_required/);
 f.capacityWh={value:'90Wh',numericValue:90,status:'verified',sources:[{url:'https://maker.example/model',type:'manufacturer',label:'型番のWh表示'}],verifiedAt:stamp};
 assert.doesNotThrow(()=>validateIdentity(review,category,now));
 f.carryOn.sources.pop();assert.throws(()=>validateIdentity(review,category,now),/flight_wh_and_current_rules_required/);
});
test('半固体を不燃保証へ言い換えず、写真の仮表示を出さない',()=>{
 const {review,snapshot}=fixtures();const f=review.products[0].comparisonFacts.batteryTechnology;f.status='verified';f.value='半固体なので発火しない';
 assert.throws(()=>validateIdentity(review,category,now),/battery_safety_guarantee_forbidden/);
 f.value='半固体（メーカー公称）';const html=renderComparison(review,snapshot,category,config,now);assert.doesNotMatch(html,/写真未掲載|画像準備中/);assert.match(html,/data-editorial-policy=/);assert.match(html,/data-pc-shortlist=/);assert.match(html,/role="tablist"/);
});
