#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {digest,validateRankingUrl} from './product-comparison-watch.mjs';
import {validateIdentity,renderIdentityGroups,renderDialogue} from './product-comparison-identity.mjs';
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
export function validateProductPhoto(photo,model,now=Date.now()){
  if(!photo)return;
  const image=new URL(photo.imageUrl),product=new URL(photo.productUrl);
  const hosts=['tshop.r10s.jp','thumbnail.image.rakuten.co.jp','image.rakuten.co.jp'];
  if(photo.model!==model||!hosts.includes(image.hostname)||image.protocol!=='https:'||image.username||image.password||product.hostname!=='item.rakuten.co.jp'||product.protocol!=='https:'||product.username||product.password||!/^\/[^/]+\/[^/]+\/$/.test(product.pathname)||!recent(photo.verifiedAt,72,now))throw Error('verified_product_photo_required');
}
export function renderComparison(review,snapshot,category,config,now=Date.now()){
  validateReview(review,snapshot,category,config,now);
  const identity=validateIdentity(review,category,now);
  const editorial=review.editorial,presentation=review.presentation;
  if(!editorial||!['definition','audience','unaffected','conclusion'].every(k=>nonempty(editorial[k])))throw Error('reader_introduction_required');
  if(!presentation||!Array.isArray(presentation.columns)||presentation.columns.length!==3||presentation.columns.some(c=>!nonempty(c.label)||!category.criteria.includes(c.axis))||!nonempty(presentation.audience)||!nonempty(presentation.conclusion))throw Error('compact_comparison_required');
  const product=id=>({...snapshot.products.find(p=>p.id===id),...review.products.find(p=>p.id===id)});
  for(const p of review.products){
    if(!nonempty(p.display?.name)||p.display.name.length>45||!Array.isArray(p.display?.cells)||p.display.cells.length!==3||p.display.cells.some(s=>!nonempty(s)||s.length>70))throw Error('short_comparison_cells_required');
    validateProductPhoto(p.image,p.model,now);
  }
  const money=row=>row.priceYen===null?'価格情報なし':row.priceYen.toLocaleString('ja-JP')+'円';
  const photo=p=>`<figure class="pc-photo"><RakutenAffiliateImage imageUrl="${esc(p.image.imageUrl)}" rakutenUrl="${esc(p.image.productUrl)}" alt="${esc(p.image.variantNote||p.maker+' '+p.model+'の商品写真')}" productName="${esc(p.maker+' '+p.model)}" /><figcaption class="${p.image.variantNote?'pc-photo-variant':''}">${esc(p.image.variantNote||'写真：楽天市場')}</figcaption></figure>`;
  const status=p=>p.status==='eligible'?'':`<span class="pc-status">${p.status==='excluded'?'今回の用途外':'おすすめ保留'}</span>`;
  const pick=p=>{
    const row=product(p.productId);
    return `<article class="pc-pick"><div class="pc-pick-top"><div><span class="pc-use">${esc(p.persona)}</span><h3>${esc(row.display.name)}<span class="pc-model">${esc(row.model)}</span></h3><p class="pc-price">${esc(money(row))}<small>価格.com取得時の参考最安値</small></p></div>${photo(row)}</div><ul class="pc-reasons">${p.because.map(b=>`<li>${esc(b.text)}</li>`).join('')}</ul><p class="pc-caution"><strong>妥協する点・注意点</strong>${esc(p.tradeoff)}</p><details class="pc-avoid"><summary>この製品が向かない人</summary><p>${esc(p.avoidIf)}</p></details><a class="pc-action" data-pc-open href="#product-${row.id}">仕様と注意点を見る ↓</a></article>`;
  };
  const featuredIds=presentation.featuredProductIds||review.profiles.slice(0,3).map(p=>p.productId);
  if(featuredIds.length!==3||new Set(featuredIds).size!==3||featuredIds.some(id=>!review.profiles.some(p=>p.productId===id)))throw Error('three_featured_profiles_required');
  const featured=featuredIds.map(id=>review.profiles.find(p=>p.productId===id));
  const more=review.profiles.filter(p=>!featuredIds.includes(p.productId));
  const rows=snapshot.products.map(raw=>{
    const p=product(raw.id);
    return `<tr data-status="${p.status}" data-product-id="${p.id}"><th scope="row"><div class="pc-table-product">${photo(p)}<div class="pc-table-name"><span class="pc-rank">人気 ${raw.rank}位</span><a data-pc-open href="#product-${p.id}">${esc(p.display.name)}</a><span class="pc-model">${esc(p.model)}</span><span class="pc-table-price">${esc(money(raw))}</span>${status(p)}<label class="pc-choose"><input type="checkbox" data-pc-select="${p.id}" aria-label="${esc(p.display.name)}を比較に追加" /> 比べる</label></div></div></th>${p.display.cells.map((value,i)=>`<td data-label="${esc(presentation.columns[i].label)}">${esc(value).replaceAll('\n','<br />')}</td>`).join('')}</tr>`;
  }).join('\n');
  const details=review.products.map(raw=>{
    const p=product(raw.id),sources=[...new Set([...(p.officialEvidence||[]).map(e=>e.url),...p.facts.filter(f=>f.value!=='未確認').map(f=>f.sourceUrl),...(p.safetyReview?.url?[p.safetyReview.url]:[])])];
    return `<details class="pc-detail" id="product-${p.id}"><summary>${photo(p)}<span class="pc-detail-title"><strong>${esc(p.display.name)}</strong><span class="pc-model">${esc(p.model)} ／ ${esc(money(p))}</span>${status(p)}</span></summary><div class="pc-detail-body"><h3>${esc(p.maker+' '+p.name)}</h3><p><strong>${p.status==='eligible'?'向いている人':'今回の扱い'}：</strong>${esc(p.suitableFor)}</p><p>${esc(p.why)}</p><p class="pc-caution"><strong>注意点</strong>${esc(p.caution)}</p>${p.exclusionReason?`<p>見送る理由：${esc(p.exclusionReason)}</p>`:''}<dl class="pc-specs">${p.facts.map(f=>`<dt>${esc(f.axis)}</dt><dd>${esc(f.value)}</dd>`).join('')}</dl><p class="pc-sources">根拠：${sources.map((url,i)=>`<a href="${esc(url)}">${(p.officialEvidence?.some(e=>e.url===url)||p.facts.some(f=>f.sourceType==='manufacturer'&&f.sourceUrl===url)||p.safetyReview?.url===url)?'メーカー':'価格.com'}情報${i+1}</a>`).join(' ／ ')}</p></div></details>`;
  }).join('\n');
  const date=snapshot.updatedOn.split('/');
  return `${START}\n<section class="pc-comparison" data-comparison-layout="sumalabo-comparison-v2" data-editorial-policy="${esc(identity.policyVersion)}" data-comparison-version="${version(review)}">\n<ProductComparisonPresentation />\n<Summary30><ol><li><strong>これは何？</strong> ${esc(editorial.definition)}</li><li><strong>何があった？</strong> ${esc(date[0]+'年'+date[1]+'月')}の上位10候補を比較。</li><li><strong>誰に関係ある？</strong> ${esc(presentation.audience)}</li><li><strong>結局どうなの？</strong> ${esc(presentation.conclusion)}</li></ol></Summary30>\n<nav class="pc-nav" aria-label="比較記事の目次"><a href="#pc-picks">用途別おすすめ</a><a href="#pc-table">10製品の早見表</a><a href="#pc-compare">気になる違いを比較</a><a href="#pc-details">詳しい仕様</a></nav>\n${renderDialogue(identity.opening.question,identity.opening.answer)}\n<details class="pc-reader-note"><summary>買い替えが必要な人・用語の補足</summary><p><strong>関係がある人：</strong>${esc(editorial.audience)}</p><p><strong>あまり関係がない人：</strong>${esc(editorial.unaffected)}</p><p>${esc(editorial.definition)}</p><p>${esc(editorial.conclusion)}</p></details>\n<h2 id="pc-picks">まずは使う場面で選ぶ</h2>\n<p>迷いやすい3つの用途から、おすすめ候補を先に紹介します。</p>\n<div class="pc-picks">${featured.map(pick).join('\n')}</div>\n${more.length?`<details class="pc-more-picks"><summary>ほかの使い方から選ぶ（${more.length}件）</summary><div class="pc-picks">${more.map(pick).join('\n')}</div></details>`:''}\n<p class="pc-photo-credit">商品写真は楽天市場の掲載画像です（広告リンク）。色が異なる参考写真には、写真の直下に対象色との違いを明示しています。価格は価格.comの取得時の参考最安値で、写真リンク先の販売価格・送料・ポイントとは異なります。</p>\n<h2 id="pc-table">10製品の写真付き早見表</h2>\n<p>まずは価格と主要仕様を確認。メーカー・電池・対応条件などの違いは、この下のテーマ別比較へ進んでください。</p>\n<div class="pc-filters" role="group" aria-label="比較対象の絞り込み"><button type="button" data-pc-filter="all" aria-pressed="true">すべて（10）</button><button type="button" data-pc-filter="eligible" aria-pressed="false">仕様確認済み</button><button type="button" data-pc-filter="held" aria-pressed="false">保留・用途外</button><span data-pc-count aria-live="polite">10製品を表示中</span></div>\n<table class="pc-table pc-overview" role="table"><caption>価格.comの人気順位。おすすめの優劣を表す順位ではありません。</caption><thead><tr><th scope="col">製品・参考価格</th>${presentation.columns.map(c=>`<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>\n${renderIdentityGroups(review,snapshot,category)}\n<h2 id="pc-details">気になる製品だけ詳しく見る</h2>\n<p>製品名を押すと、全6項目の仕様・選ぶ理由・注意点が開きます。</p>\n${details}\n<details class="pc-method"><summary>比較の条件・出典・確認日</summary><p>候補は${esc(snapshot.scope)}の表示上位10製品です。色違い・容量違いも元のランキングのまま残しています。候補外から製品を補充していません。</p><p>価格.com更新日：${esc(snapshot.updatedOn)}／集計期間：${esc(snapshot.period.from)}〜${esc(snapshot.period.to)}。取得：${esc(jst(snapshot.observedAt))}（日本時間）。</p><p>メーカー公表仕様などをもとにした比較で、当サイト独自の実機テストではありません。未確認は推測で埋めていません。参考最安値は送料・ポイント・在庫・販売店の条件で支払額が変わります。</p><p><a href="${esc(snapshot.sourceUrl)}">候補を選んだ価格.comのランキング</a>／確認：${esc(jst(review.reviewedAt))}（日本時間）</p></details>\n\n</section>\n${END}`;
}

export function updateComparisonArticle(text,section,title,description,updated){
  const match=text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);if(!match)throw Error('existing_article_required');
  let front=match[0];
  for(const [key,value] of Object.entries({title,description,updated})){if(!new RegExp('^'+key+':','m').test(front))throw Error('frontmatter_field_missing');front=front.replace(new RegExp('^'+key+':.*$','m'),key+': '+JSON.stringify(value));}
  const preservedImports=[...text.slice(match[0].length).matchAll(/^import[^\n]+;\r?$/gm)].map(m=>m[0]);
  for(const [name,source] of [['Summary30','article/Summary30.astro'],['CharacterCallout','characters/CharacterCallout.astro'],['RakutenAffiliateImage','article/RakutenAffiliateImage.astro'],['ProductComparisonPresentation','article/ProductComparisonPresentation.astro']])if(!preservedImports.some(s=>new RegExp('^import\\s+'+name+'\\s').test(s)))preservedImports.push('import '+name+' from "../../src/components/'+source+'";');
  const imports=preservedImports.join('\n');
  front=front.replace(/^hasAffiliate:.*$/m,'hasAffiliate: '+section.includes('<RakutenAffiliateImage')); 
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
  const output=updateComparisonArticle(fs.readFileSync(article,'utf8'),section,`${category.name}おすすめ比較｜用途で選ぶ10候補`,`${category.name}の上位10候補を写真付きで比較。用途別のおすすめと、価格・主要仕様・注意点が分かります。`,date);
  fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,categoryId+'-preview.mdx'),output);
  if(process.argv.includes('--apply')){if(config.publicationMode!=='auto_publish')throw Error('publication_not_enabled');fs.writeFileSync(article,output);}
  console.log(JSON.stringify({categoryId,version:version(review),preview:path.join(dir,categoryId+'-preview.mdx'),applied:process.argv.includes('--apply')}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{main();}catch(e){console.error(e.message);process.exitCode=1;}}
