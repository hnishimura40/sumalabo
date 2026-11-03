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
  const cards=catalog.campaigns.map(c=>{
    const name=config.carriers.find(v=>v.id===c.carrier).name;
    const status={active:'開催中（条件付き）',ended:'終了',unverified:'開催状況を確認中'}[c.status];
    const pairs=[['向いている人',c.suitedFor],['特典',c.status==='active'?c.benefit:'現在のおすすめ対象から外しています。過去の特典：'+c.benefit],
      ['対象者',c.eligible],['必須条件',c.requirements],['対象外・併用条件',c.exclusions],['申込経路・エントリー',c.entry],
      ['受取時期・方法',c.receiveTiming],['申込期限',c.deadlineLabel],['月額料金',c.monthlyCost],['手数料',c.fees],['注意点',c.caveats]];
    return `<section data-campaign-id="${escape(c.id)}">\n<h3>${escape(name)}：${escape(c.title)}</h3>\n<p><strong>${status}</strong>／公式情報の確認：${escape(date(c.verifiedAt))}（日本時間）</p>\n<dl>\n${pairs.map(([label,value])=>`<dt>${label}</dt><dd>${escape(value)}</dd>`).join('\n')}\n</dl>\n<p>出典：${c.sources.map((url,i)=>`<a href="${escape(url)}" rel="noopener noreferrer">公式の条件${i+1}</a>`).join(' ／ ')}</p>\n</section>`;
  }).join('\n\n');
  return `${START}\n<section aria-labelledby="mobile-campaigns" data-campaign-version="${sectionVersion(catalog)}">\n<h2 id="mobile-campaigns">乗り換えキャンペーンは「受け取れる条件」で比べる</h2>\n<p>還元額だけでなく、対象者・申込方法・継続条件・受取時期まで確認しましょう。ポイントは現金と異なり、最大額が全員に適用されるわけではありません。</p>\n${cards}\n</section>\n${END}`;
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
