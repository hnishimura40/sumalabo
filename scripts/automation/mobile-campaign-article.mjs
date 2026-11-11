#!/usr/bin/env node
// Render only a verified campaign section. Publishing remains the existing
// PR -> merge -> production deploy -> strict verify workflow.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const START='{/* mobile-campaigns:start */}';
export const END='{/* mobile-campaigns:end */}';
export function assertApplyAuthorized(config,apply){
  if(apply && (config.publicationMode!=='auto_publish' || config.publicationAuthorization?.mergeAndProductionDeploy!==true ||
    config.publicationAuthorization?.scope!=='officially_verified_campaign_changes_after_passing_checks'))throw Error('publication_authorization_required: preview_only');
}
export const sectionVersion=catalog=>createHash('sha256').update(JSON.stringify(catalog)).digest('hex').slice(0,24);
const required=['title','benefit','eligible','requirements','exclusions','entry','receiveTiming','deadlineLabel','monthlyCost','fees','caveats','suitedFor'];
export function validateCatalog(catalog,config,now=Date.now()){
  if(!catalog||catalog.schemaVersion!==1||!Array.isArray(catalog.campaigns)||!catalog.campaigns.length)throw Error('nonempty_catalog_required');
  const ids=new Set();
  for(const c of catalog.campaigns){
    const carrier=config.carriers.find(v=>v.id===c.carrier);
    if(!carrier||!c.id||ids.has(c.id)||!['active','ended','unverified'].includes(c.status))throw Error('invalid_campaign');
    ids.add(c.id);
    for(const field of required)if(typeof c[field]!=='string'||!c[field].trim())throw Error(`missing_${field}`);
    if(c.audiences && (!Array.isArray(c.audiences)||!c.audiences.length||c.audiences.some(value=>!['mnp','new','return'].includes(value))))throw Error('invalid_audiences');
    if(c.comparison)for(const field of ['label','benefit','condition','deadline'])if(typeof c.comparison[field]!=='string'||!c.comparison[field].trim())throw Error(`missing_comparison_${field}`);
    if(!Array.isArray(c.sources)||!c.sources.length)throw Error('official_sources_required');
    for(const value of c.sources){
      const u=new URL(value);
      if(u.protocol!=='https:'||u.username||u.password||!carrier.hosts.includes(u.hostname))throw Error('unofficial_source');
    }
    const age=(now-Date.parse(c.verifiedAt))/3600000;
    if(!Number.isFinite(age)||age<0||(c.status==='active'&&age>36))throw Error('fresh_verification_required');
    if(c.endsAt && (!/(?:Z|[+-]\d{2}:\d{2})$/.test(c.endsAt)||!Number.isFinite(Date.parse(c.endsAt))))throw Error('explicit_deadline_timezone_required');
    if(c.status==='active'&&c.endsAt&&Date.parse(c.endsAt)<=now)throw Error('expired_campaign_cannot_be_active');
  }
  return catalog;
}
const escape=text=>String(text).replace(/[&<>"'{}]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','{':'&#123;','}':'&#125;'}[c]));
const date=value=>new Date(value).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false});
export function renderCampaignSection(catalog,config,now=Date.now()){
  validateCatalog(catalog,config,now);
  const active=catalog.campaigns.filter(c=>c.status==='active');
  const history=catalog.campaigns.filter(c=>c.status!=='active');
  const audienceNames={mnp:'他社から乗り換え',new:'新しい番号',return:'以前使った会社に戻る'};
  const view=c=>({label:c.comparison?.label||c.title,benefit:c.comparison?.benefit||c.benefit,condition:c.comparison?.condition||c.requirements,deadline:c.comparison?.deadline||c.deadlineLabel});
  const attributes=c=>`data-carrier="${escape(c.carrier)}" data-audiences="${escape((c.audiences||[]).join(' '))}"`;
  const audience=c=>(c.audiences||[]).map(key=>audienceNames[key]).join('・')||'詳細の対象条件を確認';
  const details=c=>{
    const name=config.carriers.find(v=>v.id===c.carrier).name;
    const status={active:'開催中（条件付き）',ended:'終了',unverified:'開催状況を確認中'}[c.status];
    const pairs=[['向いている人',c.suitedFor],['特典',c.status==='active'?c.benefit:'現在のおすすめ対象から外しています。過去の特典：'+c.benefit],
      ['対象者',c.eligible],['必須条件',c.requirements],['対象外・併用条件',c.exclusions],['申込経路・エントリー',c.entry],
      ['受取時期・方法',c.receiveTiming],['申込期限',c.deadlineLabel],['月額料金',c.monthlyCost],['手数料',c.fees],['注意点',c.caveats]];
    return `<details class="campaign-offer" id="offer-${escape(c.id)}" data-campaign-id="${escape(c.id)}" ${attributes(c)}>\n<summary><span class="campaign-company">${escape(name)}</span><span class="campaign-offer-title">${escape(c.title)}</span><span class="campaign-status">${status}</span><span class="campaign-expand">条件・受取方法</span></summary>\n<div class="campaign-offer-body">\n\n<p class="campaign-verified">公式情報の確認 ${escape(date(c.verifiedAt))}（日本時間）</p>\n<dl>\n${pairs.map(([label,value])=>`<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('\n')}\n</dl>\n<p class="campaign-sources">出典 ${c.sources.map((url,i)=>`<a href="${escape(url)}" rel="noopener noreferrer">公式の条件${i+1}</a>`).join(' ／ ')}</p>\n</div>\n</details>`;
  };
  const rows=active.map(c=>{
    const v=view(c),name=config.carriers.find(carrier=>carrier.id===c.carrier).name;
    return `<tr ${attributes(c)}><th scope="row"><span class="campaign-company">${escape(name)}</span><span class="campaign-row-label">${escape(v.label)}</span><a href="#offer-${escape(c.id)}">条件・受取方法へ</a></th><td data-label="特典"><strong>${escape(v.benefit)}</strong></td><td data-label="対象"><span>${escape(audience(c))}</span></td><td data-label="申込期限">${escape(v.deadline)}</td><td data-label="先に確認する条件">${escape(v.condition)}</td></tr>`;
  }).join('\n');
  const companies=config.carriers.filter(carrier=>active.some(c=>c.carrier===carrier.id));
  return `${START}
<section class="mobile-campaigns" aria-labelledby="mobile-campaigns" data-campaign-version="${sectionVersion(catalog)}">
<h2 id="mobile-campaigns">携帯キャンペーンの早見表</h2>
<p>自分の契約方法を選び、特典と必要な条件を比べてください。MNPは、電話番号を変えずに携帯会社を乗り換える手続きです。ポイントの有効期限や受取操作は「条件・受取方法」で確認できます。</p>
<div class="campaign-filters" hidden>
<fieldset><legend>契約方法で絞る</legend><div class="campaign-options"><button type="button" data-audience-filter="all" aria-pressed="true">すべて</button>${Object.entries(audienceNames).map(([key,label])=>`<button type="button" data-audience-filter="${key}" aria-pressed="false">${label}</button>`).join('')}</div></fieldset>
<div class="campaign-carrier-label"><label for="campaign-carrier">携帯会社</label><select id="campaign-carrier" data-carrier-filter><option value="all">すべての会社</option>${companies.map(c=>`<option value="${escape(c.id)}">${escape(c.name)}</option>`).join('')}</select></div>
<p class="campaign-count" role="status" aria-live="polite">${active.length}件を表示</p>
</div>
<p class="campaign-filter-note">移行元・年齢・過去の特典利用などで対象外になる場合があります。最大額だけで決めず、月額料金と手数料も確認してください。</p>
<table class="campaign-table"><caption>開催中の携帯キャンペーン比較</caption><thead><tr><th scope="col">携帯会社・特典名</th><th scope="col">特典</th><th scope="col">対象</th><th scope="col">申込期限</th><th scope="col">先に確認する条件</th></tr></thead><tbody>${rows}</tbody></table>
<p class="campaign-empty" hidden>この組み合わせの掲載特典はありません。契約方法か携帯会社を変えてください。</p>
<h3 id="campaign-details">キャンペーンごとの詳しい条件</h3>
<p>気になる特典を開くと、対象外の条件、月額料金、受取時期と公式の出典を確認できます。</p>
<div class="campaign-detail-list">

${active.map(details).join('\n')}

</div>
<details class="campaign-history">

<summary>終了済み・確認中の特典（${history.length}件）</summary><p>受付終了後も、申し込み済みの人が条件を確認できるよう履歴を残しています。確認中の特典は、現在のおすすめに含めていません。</p>

${history.map(details).join('\n')}</details>
</section>
${END}`;
}
export function updateArticle(text,section,updated,replacements=[]){
  const starts=text.split(START).length-1,ends=text.split(END).length-1;
  if(starts!==ends||starts>1)throw Error('ambiguous_managed_section');
  let next;
  if(starts){const a=text.indexOf(START),end=text.indexOf(END);if(end<a)throw Error('invalid_marker_order');const b=end+END.length;next=text.slice(0,a)+section+text.slice(b);}
  else {next=text;for(const {from,to} of replacements)if(next.includes(from))next=next.replace(from,to);next=next.trimEnd()+'\n\n'+section+'\n';}
  const fm=next.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if(!fm||!/^updated:/m.test(fm[0]))throw Error('article_frontmatter_required');
  // Preserve pubDate/publishAt: refreshing an article is not a new publication.
  return next.replace(fm[0],fm[0].replace(/^updated:.*$/m,`updated: "${updated}"`));
}
function main(){
  const catalogFile=process.argv[2];if(!catalogFile)throw Error('usage: <reviewed-catalog.json> [--apply]');
  const config=JSON.parse(fs.readFileSync(path.join(ROOT,'data/automation/mobile-campaign-watch.json'),'utf8'));
  assertApplyAuthorized(config,process.argv.includes('--apply'));
  const catalog=JSON.parse(fs.readFileSync(path.resolve(catalogFile),'utf8'));
  const article=path.resolve(ROOT,config.articlePath);
  if(!article.startsWith(path.join(ROOT,'content','articles')+path.sep))throw Error('article_path_not_allowed');
  const now=Date.now();const updated=new Date(now+9*3600000).toISOString().slice(0,10);
  const section=renderCampaignSection(catalog,config,now);
  const next=updateArticle(fs.readFileSync(article,'utf8'),section,updated,config.firstInsertionReplacements||[]);
  const output=path.join(ROOT,config.stateDirectory,'article-preview.mdx');fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,next);
  if(process.argv.includes('--apply'))fs.writeFileSync(article,next);
  console.log(JSON.stringify({targetSlug:config.targetSlug,sectionVersion:sectionVersion(catalog),campaigns:catalog.campaigns.length,applied:process.argv.includes('--apply'),preview:output}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{main();}catch(e){console.error(`[campaign-article] ${e.message}`);process.exitCode=1;}}
