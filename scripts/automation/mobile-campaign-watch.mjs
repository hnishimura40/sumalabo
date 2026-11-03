#!/usr/bin/env node
// Deterministic observation/diff queue. Semantic campaign changes and end status
// require official-source review; missing links and HTTP failures are not ends.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");
export const hash=text=>crypto.createHash("sha256").update(text).digest("hex");
const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,"utf8"));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
export function canonicalUrl(value,base){
  const url=new URL(value,base);
  if(url.protocol!=="https:" || url.username || url.password) throw Error("https_required");
  url.hash="";
  for(const key of [...url.searchParams.keys()]) if(/^(utm_|gclid$|fbclid$|msockid$|msclkid$|l-id$)/i.test(key))url.searchParams.delete(key);
  url.searchParams.sort();return url.href;
}
export function allowedUrl(value,carrier){
  try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&carrier.hosts.includes(u.hostname)&&
    carrier.paths.some(p=>u.pathname.startsWith(p))&&!/\/(?:archive|old|close|end_campaign)\//i.test(u.pathname)&&! /\.(?:png|jpg|jpeg|webp|gif|svg|css|js|zip|pdf)$/i.test(u.pathname);}catch{return false;}
}
function decode(text){return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp);|&#(?:x[\da-f]+|\d+);/gi,token=>{
  const map={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '};
  if(map[token.toLowerCase()])return map[token.toLowerCase()];
  const n=token.slice(2,-1);const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);
  return code>=0&&code<=0x10ffff?String.fromCodePoint(code):'';
});}
export function extractPage(html,url,carrier,config){
  const title=decode((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'').replace(/<[^>]*>/g,'').trim();
  let body=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
  body=(body.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[])[1]||body;
  body=body.replace(/<(header|footer|nav)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
  // Campaign amounts are often in banner alt text rather than text nodes.
  const text=decode(body.replace(/<img\b[^>]*>/gi,tag=>(tag.match(/\balt\s*=\s*["']([^"']*)["']/i)||[])[1]||' ')
    .replace(/<[^>]*>/g,' ')).normalize('NFKC').replace(/\s+/g,' ').trim();
  if(text.length<config.minimumTextLength || /^(?:access denied|forbidden|just a moment)/i.test(title)||/captcha|verify you are human|アクセスが集中しております/i.test(text.slice(0,800)))throw Error('unusable_or_challenge_page');
  if(text.length>config.maximumTextLength)throw Error('page_text_too_large');
  const links=[...body.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].flatMap(m=>{
    try{const link=canonicalUrl(decode(m[1]),url);return allowedUrl(link,carrier)&&new URL(link).pathname!==new URL(carrier.url).pathname?[{url:link,label:decode(m[2].replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim()}]:[];}catch{return [];}
  });
  return {title,text,hash:hash(title+'\n'+text),links:[...new Map(links.map(l=>[l.url,l])).values()].sort((a,b)=>a.url.localeCompare(b.url))};
}
export async function fetchPage(url,carrier,config,fetchImpl=fetch){
  try{
    if(!allowedUrl(url,carrier))throw Error('url_not_allowed');
    let current=url;
    for(let redirects=0;redirects<6;redirects++){
      const res=await fetchImpl(current,{redirect:'manual',signal:AbortSignal.timeout(config.timeoutMs),headers:{'User-Agent':'Mozilla/5.0 (compatible; SumaLaboCampaignWatch/1.0)'}});
      if([301,302,303,307,308].includes(res.status)){
        const next=canonicalUrl(res.headers.get('location'),current);
        if(!allowedUrl(next,carrier))throw Error('redirect_not_allowed');current=next;continue;
      }
      if(!res.ok)return {ok:false,url,status:res.status,error:`http_${res.status}`};
      const contentType=res.headers.get('content-type')||'';
      const bytes=await res.arrayBuffer();
      const charset=(contentType.match(/charset\s*=\s*([\w-]+)/i)||[])[1]||'utf-8';
      const html=new TextDecoder(charset).decode(bytes);
      if(carrier.resources?.some(r=>r.url===url&&r.format==='json')){
        const data=JSON.parse(html);const text=JSON.stringify(data);const values=[];
        const walk=v=>{if(typeof v==='string')values.push(v);else if(v&&typeof v==='object')Object.values(v).forEach(walk);};walk(data);
        if(text.length<config.minimumTextLength||text.length>config.maximumTextLength)throw Error('unusable_json');
        const links=values.flatMap(v=>{try{const link=canonicalUrl(v,current);return /^(?:https:\/\/|\/)/.test(v)&&allowedUrl(link,carrier)&&!link.endsWith('.json')?[{url:link,label:''}]:[];}catch{return [];}});
        return {ok:true,url,finalUrl:current,status:res.status,title:carrier.name+'公式キャンペーンデータ',text,hash:hash(text),links:[...new Map(links.map(l=>[l.url,l])).values()].sort((a,b)=>a.url.localeCompare(b.url))};
      }
      if(!/text\/html/i.test(contentType))throw Error('not_html');
      return {ok:true,url,finalUrl:current,status:res.status,...extractPage(html,current,carrier,config)};
    }
    throw Error('too_many_redirects');
  }catch(e){return {ok:false,url,error:e.cause?.code||e.message};}
}
async function pool(jobs,limit){let i=0;const results=[];await Promise.all(Array.from({length:Math.min(limit,jobs.length)},async()=>{while(i<jobs.length){const n=i++;results[n]=await jobs[n]();}}));return results;}
export function compareObservations(previous,observations,now){
  const next=structuredClone(previous||{schemaVersion:1,pages:{},pending:[],completed:[]});
  const changes=[];
  for(const observation of observations){
    const key=observation.carrier+':'+observation.url;
    const before=next.pages[key];
    if(!observation.ok){
      // Published offers require a retry even if nothing can be downloaded.
      for(const campaign of next.publishedCampaigns||[]){
        if(campaign.status!=='active'||campaign.carrier!==observation.carrier||campaign.url!==observation.url)continue;
        const id=hash('verification_failed:'+campaign.id+':'+observation.error).slice(0,24);
        if(next.pending.some(e=>e.id===id)||next.completed.some(e=>e.id===id))continue;
        const event={id,kind:'verification_failed',carrier:observation.carrier,url:observation.url,title:campaign.title,detectedAt:now,status:'pending_review',error:observation.error};
        next.pending.push(event);changes.push(event);
      }
      continue; // Never overwrite last good evidence on failure.
    }
    const after={...observation,observedAt:now};
    if(!before || before.hash!==after.hash || JSON.stringify(before.links?.map(x=>x.url))!==JSON.stringify(after.links?.map(x=>x.url))){
      const kind=!before?(after.kind==='listing'?'initial_listing':'new_campaign_page'):(after.kind==='listing'?'listing_changed':'campaign_page_changed');
      const id=hash(key+'\n'+(before?.hash||'initial')+'\n'+after.hash+'\n'+JSON.stringify(after.links)).slice(0,24);
      const event={id,kind,carrier:after.carrier,url:after.url,title:after.title,detectedAt:now,
        before:before?{hash:before.hash,text:before.text,observedAt:before.observedAt}:null,
        after:{hash:after.hash,text:after.text,observedAt:now},
        removedLinks:(before?.links||[]).filter(l=>!after.links.some(a=>a.url===l.url)),
        status:'pending_review'};
      if(!next.pending.some(e=>e.id===id)&&!next.completed.some(e=>e.id===id)){next.pending.push(event);changes.push(event);}
    }
    next.pages[key]=after;
  }
  for(const campaign of next.publishedCampaigns||[]){
    if(campaign.status!=='active'||!campaign.endsAt||Date.parse(campaign.endsAt)>Date.parse(now))continue;
    const id=hash('deadline:'+campaign.id+':'+campaign.endsAt).slice(0,24);
    if(next.pending.some(e=>e.id===id)||next.completed.some(e=>e.id===id))continue;
    const event={id,kind:'deadline_reached',carrier:campaign.carrier,url:campaign.url,title:campaign.title,detectedAt:now,status:'pending_review',endsAt:campaign.endsAt};
    next.pending.push(event);changes.push(event);
  }
  next.checkedAt=now;return {state:next,changes};
}
export async function collectCampaigns(config,state={},fetchImpl=fetch){
  const observations=[];const coverage=[];
  const targets=config.carriers.flatMap(carrier=>[carrier.url,...(carrier.resources||[]).map(r=>r.url)].map(url=>({carrier,url})));
  const listings=await pool(targets.map(({carrier,url})=>async()=>({carrier,result:await fetchPage(canonicalUrl(url),carrier,config,fetchImpl)})),config.concurrency);
  const jobs=[];
  for(const carrier of config.carriers){
    const group=listings.filter(v=>v.carrier.id===carrier.id).map(v=>v.result);
    observations.push(...group.map(result=>({...result,carrier:carrier.id,kind:'listing'})));
    const discovered=group.filter(r=>r.ok).flatMap(r=>r.links.map(l=>l.url));
    // Keep previously observed detail URLs even after removal from the index.
    const tracked=Object.values(state.pages||{}).filter(p=>p.carrier===carrier.id&&p.kind==='detail').map(p=>p.url);
    const urls=[...new Set([...discovered,...tracked])].filter(url=>allowedUrl(url,carrier));
    const selected=urls.slice(0,config.maxDetailsPerCarrier);
    coverage.push({carrier:carrier.id,listingOk:group.every(r=>r.ok),found:urls.length,selected:selected.length,truncated:urls.length>selected.length,needsBrowser:group.some(r=>!r.ok)||discovered.length<(carrier.minimumDetails||2)});
    for(const url of selected)jobs.push(async()=>({...await fetchPage(url,carrier,config,fetchImpl),carrier:carrier.id,kind:'detail'}));
  }
  observations.push(...await pool(jobs,config.concurrency));
  return {observations,coverage};
}
export function acknowledge(state,receipt,now){
  if(!receipt || !['published','no_material_change'].includes(receipt.outcome) || !Array.isArray(receipt.eventIds)||!receipt.eventIds.length||!receipt.reason)throw Error('invalid_receipt');
  if(receipt.outcome==='published' && (!/^https:\/\/github\.com\/hnishimura40\/sumalabo\/pull\/\d+$/.test(receipt.prUrl||'') ||
    receipt.merged!==true || receipt.httpStatus!==200 || receipt.strictVerifyPassed!==true || !/^https:\/\/sumalabo\.com\/articles\/[a-z0-9-]+\/$/.test(receipt.articleUrl||'')))throw Error('publication_evidence_required');
  if(receipt.eventIds.some(id=>!state.pending.some(e=>e.id===id)))throw Error('unknown_event_id');
  const next=structuredClone(state);const ids=new Set(receipt.eventIds);
  if(receipt.outcome==='published'){
    if(!Array.isArray(receipt.campaigns)||receipt.campaigns.some(c=>!c.id||!c.carrier||!c.url||!['active','ended','unverified'].includes(c.status)||(c.endsAt&&!Number.isFinite(Date.parse(c.endsAt)))))throw Error('campaign_deadline_records_required');
    next.publishedCampaigns=receipt.campaigns;
  }
  next.completed.push(...next.pending.filter(e=>ids.has(e.id)).map(e=>({id:e.id,carrier:e.carrier,url:e.url,at:now,receipt})));
  next.pending=next.pending.filter(e=>!ids.has(e.id));return next;
}
export async function verifyPublicationReceipt(receipt,config,fetchImpl=fetch){
  if(receipt.outcome!=='published')return;
  const articleUrl=`https://sumalabo.com/articles/${config.targetSlug}/`;
  if(receipt.articleUrl!==articleUrl || !/^[a-f0-9]{24}$/.test(receipt.sectionVersion||''))throw Error('article_version_required');
  const prNumber=(receipt.prUrl||'').match(/\/pull\/(\d+)$/)?.[1];
  if(!prNumber)throw Error('pr_required');
  const pr=await fetchImpl(`https://api.github.com/repos/hnishimura40/sumalabo/pulls/${prNumber}`,{signal:AbortSignal.timeout(config.timeoutMs),headers:{'Accept':'application/vnd.github+json','User-Agent':'SumaLaboCampaignWatch'}});
  if(!pr.ok || (await pr.json()).merged!==true)throw Error('pr_not_merged');
  const page=await fetchImpl(articleUrl,{signal:AbortSignal.timeout(config.timeoutMs)});
  if(page.status!==200 || !(await page.text()).includes(`data-campaign-version="${receipt.sectionVersion}"`))throw Error('published_version_not_visible');
  const verify=await fetchImpl(`https://sumalabo.com/api/verify-publication?slug=${config.targetSlug}`,{signal:AbortSignal.timeout(config.timeoutMs)});
  if(!verify.ok || (await verify.json()).status!=='published')throw Error('strict_verification_failed');
}
function atomicWrite(file,value){const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n');fs.renameSync(temp,file);}
function excerpt(before='',after=''){
  let start=0;while(start<Math.min(before.length,after.length)&&before[start]===after[start])start++;
  const from=Math.max(0,start-250);
  return {before:before.slice(from,from+3500),after:after.slice(from,from+3500),offset:from,fullTextInState:true};
}
export async function main(argv=process.argv.slice(2)){
  const config=read(path.join(ROOT,'data/automation/mobile-campaign-watch.json'));
  const dir=path.resolve(ROOT,config.stateDirectory);fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'state.json'),lock=path.join(dir,'watch.lock');
  const handle=fs.openSync(lock,'wx');
  try{
    const state=read(file,{schemaVersion:1,pages:{},pending:[],completed:[]});
    const now=new Date().toISOString();
    if(argv[0]==='status'){console.log(JSON.stringify({checkedAt:state.checkedAt,pages:Object.keys(state.pages).length,pending:state.pending.map(({id,kind,carrier,url,title})=>({id,kind,carrier,url,title}))}));return;}
    if(argv[0]==='packet'){
      if(!config.carriers.some(c=>c.id===argv[1]))throw Error('packet_requires_carrier_id');
      console.log(JSON.stringify({carrier:argv[1],events:state.pending.filter(e=>e.carrier===argv[1]).map(e=>({id:e.id,kind:e.kind,url:e.url,title:e.title,endsAt:e.endsAt,error:e.error,removedLinks:e.removedLinks,...excerpt(e.before?.text,e.after?.text)}))}));return;
    }
    if(argv[0]==='ack'){
      const receipt=read(path.resolve(argv[1]||''));const next=acknowledge(state,receipt,now);
      await verifyPublicationReceipt(receipt,config);atomicWrite(file,next);
      console.log(JSON.stringify({acknowledged:receipt.eventIds.length,pending:next.pending.length}));return;
    }
    if(argv[0] && argv[0]!=='check')throw Error('usage: check | status | ack <receipt.json>');
    const {observations,coverage}=await collectCampaigns(config,state);
    const compared=compareObservations(state,observations,now);
    const failures=observations.filter(o=>!o.ok).map(({carrier,url,status,error})=>({carrier,url,status,error}));
    const report={at:now,coverage,failures,newChanges:compared.changes.map(({id,kind,carrier,url,title})=>({id,kind,carrier,url,title})),pending:compared.state.pending.length};
    atomicWrite(file,compared.state);atomicWrite(path.join(dir,'latest-check.json'),report);
    console.log(JSON.stringify(report));
    if(failures.length||coverage.some(c=>c.truncated||c.needsBrowser))process.exitCode=2;
  }finally{fs.closeSync(handle);fs.unlinkSync(lock);}
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(`[campaign-watch] ${e.message}`);process.exitCode=1;});
