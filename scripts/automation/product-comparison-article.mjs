#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {digest,validateRankingUrl} from './product-comparison-watch.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const START='{/* product-comparison:start */}',END='{/* product-comparison:end */}';
export const version=review=>digest(review).slice(0,24);
const esc=value=>String(value??'').replace(/[&<>"'{}]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','{':'&#123;','}':'&#125;'}[c]));
const nonempty=value=>typeof value==='string'&&value.trim().length>0;
const ymd=value=>{const [y,m,d]=value.split('/');return Date.parse(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00+09:00`);};
const ageHours=(value,now)=>(now-Date.parse(value))/3600000;
const recent=(value,hours,now)=>Number.isFinite(ageHours(value,now))&&ageHours(value,now)>=0&&ageHours(value,now)<=hours;
function officialUrl(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||/(?:^|\.)(?:kakaku\.com|amazon\.co\.jp|rakuten\.co\.jp|yahoo\.co\.jp)$/.test(u.hostname))throw Error('manufacturer_source_required');return value;}
export function validateReview(review,snapshot,category,config,now=Date.now()){
  validateRankingUrl(snapshot.sourceUrl,category);
  const {digest:stored,...rest}=snapshot;
  if(stored!==digest({...rest,observedAt:undefined})||review.rankingDigest!==stored)throw Error('ranking_snapshot_mismatch');
  if(snapshot.categoryId!==category.id||snapshot.rankingType!=='popular_sales'||snapshot.products.length!==10)throw Error('invalid_candidate_pool');
  if(!recent(snapshot.observedAt,config.maximumSnapshotAgeHours,now))throw Error('fresh_snapshot_required');
  const updated=ymd(snapshot.updatedOn),from=ymd(snapshot.period.from),to=ymd(snapshot.period.to),days=(now-updated)/86400000;
  if(![updated,from,to].every(Number.isFinite)||days<0||days>config.maximumRankingAgeDays||from>to||to>updated)throw Error('ranking_period_invalid_or_stale');
  if(review.schemaVersion!==1||review.categoryId!==category.id||review.testBasis!=='public_sources'||!recent(review.reviewedAt,72,now))throw Error('verified_public_source_review_required');
  if(!Array.isArray(review.products)||review.products.length!==10||new Set(review.products.map(p=>p.id)).size!==10)throw Error('review_all_ten_candidates');
  const ids=new Set(snapshot.products.map(p=>p.id));
  const modelKey=value=>String(value).normalize('NFKC').toUpperCase().replace(/[^\p{L}\p{N}]/gu,'');
  for(const product of review.products){
    if(!ids.has(product.id)||!['eligible','excluded','unverified'].includes(product.status)||!nonempty(product.model)||!nonempty(product.suitableFor)||!nonempty(product.why)||!nonempty(product.caution))throw Error('candidate_review_incomplete');
    if(!modelKey(snapshot.products.find(p=>p.id===product.id).name).includes(modelKey(product.model)))throw Error('model_does_not_match_ranked_product');
    if(product.status!=='eligible'&&!nonempty(product.exclusionReason))throw Error('exclusion_reason_required');
    if(!Array.isArray(product.facts)||product.facts.length!==category.criteria.length||new Set(product.facts.map(f=>f.axis)).size!==category.criteria.length||category.criteria.some(axis=>!product.facts.some(f=>f.axis===axis&&nonempty(f.value))))throw Error('comparison_axes_required');
    for(const fact of product.facts){
      if(fact.value==='未確認')continue;
      if(!['manufacturer','kakaku'].includes(fact.sourceType)||!nonempty(fact.sourceUrl)||!recent(fact.verifiedAt,72,now))throw Error('fact_evidence_required');
      if(fact.sourceType==='manufacturer')officialUrl(fact.sourceUrl);
      else if(![snapshot.sourceUrl,...snapshot.products.map(p=>p.url)].includes(fact.sourceUrl))throw Error('candidate_source_mismatch');
    }
    if(product.status==='eligible'){
      if(!Array.isArray(product.officialEvidence)||!product.officialEvidence.length||product.officialEvidence.some(e=>e.model!==product.model||!recent(e.verifiedAt,72,now)))throw Error('exact_model_verification_required');
      product.officialEvidence.forEach(e=>officialUrl(e.url));
      if(product.safetyReview?.status!=='checked'||!recent(product.safetyReview.verifiedAt,72,now)||product.safetyReview.recalled!==false||!nonempty(product.safetyReview.note))throw Error('safety_review_required');
      officialUrl(product.safetyReview.url);
    }
  }
  if(!Array.isArray(review.profiles)||review.profiles.length<3||new Set(review.profiles.map(p=>p.persona)).size<3)throw Error('three_distinct_reader_profiles_required');
  for(const profile of review.profiles){
    const selected=review.products.find(p=>p.id===profile.productId);
    if(selected?.status!=='eligible'||!nonempty(profile.persona)||!nonempty(profile.tradeoff)||!nonempty(profile.avoidIf)||!Array.isArray(profile.because)||profile.because.length<2||new Set(profile.because.map(b=>b.axis)).size<2)throw Error('explained_profile_required');
    for(const reason of profile.because)if(!nonempty(reason.text)||!selected.facts.some(f=>f.axis===reason.axis&&f.value!=='未確認'))throw Error('recommendation_reason_requires_evidence');
  }
  return review;
}
const jst=value=>new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false});
const price=row=>row.priceYen===null?'価格情報なし':`参考最安値 ${row.priceYen.toLocaleString('ja-JP')}円`;
export function renderComparison(review,snapshot,category,config,now=Date.now()){
  validateReview(review,snapshot,category,config,now);
  const product=id=>({...snapshot.products.find(p=>p.id===id),...review.products.find(p=>p.id===id)});
  const profiles=review.profiles.map(p=>{
    const row=product(p.productId);
    const reasons=p.because.map(b=>`${b.text}（${b.axis}：${row.facts.find(f=>f.axis===b.axis).value}）`).join(' ');
    return `<tr><th>${esc(p.persona)}</th><td><a href="#product-${row.id}">${esc(row.maker+' '+row.name)}</a></td><td>${esc(reasons)}</td><td>${esc(p.tradeoff)}</td><td>${esc(p.avoidIf)}</td></tr>`;
  }).join('\n');
  const rows=snapshot.products.map(raw=>{
    const row=product(raw.id);return `<tr><td>${raw.rank}位</td><th><a href="${esc(raw.url)}">${esc(raw.maker+' '+raw.name)}</a></th><td>${esc(price(raw))}</td>${category.criteria.map(axis=>`<td>${esc(row.facts.find(f=>f.axis===axis).value)}</td>`).join('')}<td>${esc(row.status==='eligible'?row.suitableFor:row.exclusionReason)}</td></tr>`;
  }).join('\n');
  const details=review.products.map(p=>{
    const row=product(p.id);const sources=[...new Set([...(p.officialEvidence||[]).map(e=>e.url),...p.facts.filter(f=>f.value!=='未確認').map(f=>f.sourceUrl),...(p.safetyReview?.url?[p.safetyReview.url]:[])])];
    return `<section id="product-${p.id}"><h3>${esc(row.maker+' '+row.name)}</h3><p>${esc(p.status==='eligible'?'用途が合う人の候補':p.status==='excluded'?'今回の用途から除外':'確認不足のためおすすめを保留')}：${esc(p.suitableFor)}</p><p>${esc(p.why)}</p><p>注意点：${esc(p.caution)}</p>${p.exclusionReason?`<p>見送る理由：${esc(p.exclusionReason)}</p>`:''}<p>根拠：${sources.map((url,i)=>`<a href="${esc(url)}">${(p.officialEvidence?.some(e=>e.url===url)||p.facts.some(f=>f.sourceType==='manufacturer'&&f.sourceUrl===url)||p.safetyReview?.url===url)?'メーカー':'価格.com'}情報${i+1}</a>`).join(' ／ ')}</p></section>`;
  }).join('\n');
  return `${START}\n<section data-comparison-version="${version(review)}">\n<h2>まずは「使う場面」から選ぶ</h2>\n<p>候補は${esc(snapshot.scope)}の掲載上位10製品です。人気順位と、このページで用途別に選ぶおすすめは別です。</p>\n<p>価格.comの更新日：${esc(snapshot.updatedOn)}／集計期間：${esc(snapshot.period.from)}〜${esc(snapshot.period.to)}。取得：${esc(jst(snapshot.observedAt))}（日本時間）。</p>\n<p>価格は取得時点の参考最安値で、送料・ポイント・在庫・販売店の条件により支払額は変わります。購入前に確認してください。</p>\n<div class="tbl-scroll is-scrollable"><table><thead><tr><th>こんな人</th><th>候補</th><th>選ぶ理由</th><th>妥協する点</th><th>この場合は別候補へ</th></tr></thead><tbody>${profiles}</tbody></table></div>\n<h2>候補10製品を同じ項目で比較</h2>\n<p>色違い・容量違いも元のランキングどおりに残しています。同じ基本モデルを別の性能の製品として数えたり、候補外の製品で穴埋めしたりしていません。</p>\n<div class="tbl-scroll is-scrollable"><table><thead><tr><th>人気順位</th><th>製品・型番</th><th>取得時の価格</th>${category.criteria.map(c=>`<th>${esc(c)}</th>`).join('')}<th>向いている人・見送る理由</th></tr></thead><tbody>${rows}</tbody></table></div>\n<h2>選ぶ理由と注意点</h2>\n${details}\n<h2>比較の前提</h2><p>メーカーの公表仕様などをもとにした比較で、当サイト独自の実機テストではありません。未確認の項目は推測で埋めていません。</p><p><a href="${esc(snapshot.sourceUrl)}">候補を選んだ価格.comのランキング</a>／確認：${esc(jst(review.reviewedAt))}（日本時間）</p>\n</section>\n${END}`;
}
export function updateComparisonArticle(text,section,title,description,updated){
  const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);if(!match)throw Error('existing_article_required');
  let front=match[0];
  for(const [key,value] of Object.entries({title,description,updated})){if(!new RegExp('^'+key+':','m').test(front))throw Error('frontmatter_field_missing');front=front.replace(new RegExp('^'+key+':.*$','m'),key+': '+JSON.stringify(value));}
  const imports=[...text.slice(match[0].length).matchAll(/^import[^\n]+;\r?$/gm)].map(m=>m[0]).join('\n');
  // Replace the old comparison, not append a contradictory second set of picks.
  return front+'\n'+imports+'\n\n'+section+'\n';
}
function main(){
  const categoryId=process.argv[2],reviewPath=process.argv[3];
  const config=JSON.parse(fs.readFileSync(path.join(ROOT,'data/automation/product-comparison-watch.json'),'utf8'));
  const category=config.categories.find(c=>c.id===categoryId);if(!category||!reviewPath)throw Error('usage: <category-id> <review.json> [--apply]');
  const dir=path.join(ROOT,config.stateDirectory),snapshot=JSON.parse(fs.readFileSync(path.join(dir,categoryId+'-ranking.json'),'utf8'));
  const review=JSON.parse(fs.readFileSync(path.resolve(reviewPath),'utf8'));
  const section=renderComparison(review,snapshot,category,config);
  const rootFlag=process.argv.indexOf('--article-root');
  if(rootFlag!==-1&&!process.argv[rootFlag+1])throw Error('article_root_required');
  if(process.argv.includes('--apply')&&rootFlag===-1)throw Error('clean_article_root_required');
  const articleRoot=rootFlag===-1?ROOT:path.resolve(process.argv[rootFlag+1]);
  const article=path.join(articleRoot,'content/articles',category.articleSlug+'.mdx');
  if(!fs.existsSync(article))throw Error('initial_article_workflow_required');
  const date=new Date(Date.now()+9*3600000).toISOString().slice(0,10),month=date.slice(0,7).replace('-','年')+'月';
  const output=updateComparisonArticle(fs.readFileSync(article,'utf8'),section,`${category.name}おすすめ比較【${month}】候補10製品から用途で選ぶ`,`${category.name}の価格.com上位10製品を、用途・予算・必要な機能で比較。どんな人に向くか、理由と注意点を整理します。`,date);
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,categoryId+'-preview.mdx'),output);
  if(process.argv.includes('--apply')){if(config.publicationMode!=='auto_publish')throw Error('publication_not_enabled');fs.writeFileSync(article,output);}
  console.log(JSON.stringify({categoryId,version:version(review),preview:path.join(dir,categoryId+'-preview.mdx'),applied:process.argv.includes('--apply')}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
