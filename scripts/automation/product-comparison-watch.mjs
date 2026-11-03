#!/usr/bin/env node
// Preserve the actual top ten as the candidate pool. Editorial recommendation
// order is separate from the provider's popularity order.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const read=(file,fallback)=>{try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
const clean=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&#165;|&yen;/g,'¥').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&#(?:x([\da-f]+)|(\d+));/gi,(_,h,n)=>String.fromCodePoint(parseInt(h||n,h?16:10))).replace(/\s+/g,' ').trim();
export function validateRankingUrl(value,category){
  const u=new URL(value),expected=new URL(category.rankingUrl);
  if(u.protocol!=='https:'||u.hostname!=='kakaku.com'||u.username||u.password||u.pathname!==expected.pathname||u.search!==expected.search)throw Error('unexpected_ranking_scope');
}
export function parseRanking(html,category,now=new Date().toISOString()){
  const title=clean(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  if(!title.includes('人気売れ筋ランキング')||/captcha|access denied/i.test(title))throw Error('not_popularity_ranking');
  const plain=clean(html);
  const dates=plain.match(/更新日[：:]\s*(\d{4}\/\d{1,2}\/\d{1,2})\s*\(\s*(\d{4}\/\d{1,2}\/\d{1,2})\s*[～〜~]\s*(\d{4}\/\d{1,2}\/\d{1,2})/);
  if(!dates)throw Error('ranking_dates_required');
  const blocks=html.split(/<div\b[^>]*class="rkgBoxHead\s+rkgBoxHead-2(?:\s+[^"]*)?"[^>]*>/).slice(1);
  const rows=blocks.slice(0,10).map((block,i)=>{
    const id=block.match(/https:\/\/kakaku\.com\/item\/([A-Z]?\d{9,14})\//)?.[1];
    const rank=Number(block.match(/class="rkgBoxNum">\s*<span class="num">(\d+)<\/span>/)?.[1]);
    const name=clean(block.match(/class="rkgBoxNameItem">([\s\S]*?)<\/span>/)?.[1]);
    const maker=clean(block.match(/class="rkgBoxNameMaker">([\s\S]*?)<\/span>/)?.[1]);
    const priceText=block.match(/class="rkgPrice">([\s\S]*?)<\/div>/)?.[1]||'';
    const price=clean(priceText).match(/[¥￥]\s*([\d,]+)/);
    const specs=[...block.matchAll(/<dt\b[^>]*class="p-specLabel_itemTtl"[^>]*>([\s\S]*?)<\/dt>\s*<dd\b[^>]*>([\s\S]*?)<\/dd>/g)].map(m=>({key:clean(m[1]),value:clean(m[2])}));
    return {position:i+1,rank,id,maker,name,url:`https://kakaku.com/item/${id}/`,priceYen:price?Number(price[1].replaceAll(',','')):null,specs};
  });
  if(rows.length!==10||rows.some(r=>!r.id||!r.name||!Number.isInteger(r.rank)||r.rank<1)||new Set(rows.map(r=>r.id)).size!==10)throw Error('exactly_ten_distinct_products_required');
  if(rows.some((r,i)=>i>0&&r.rank<rows[i-1].rank))throw Error('ranking_order_invalid');
  const snapshot={categoryId:category.id,provider:'価格.com',rankingType:'popular_sales',scope:category.rankingScope,sourceUrl:category.rankingUrl,observedAt:now,updatedOn:dates[1],period:{from:dates[2],to:dates[3]},products:rows};
  snapshot.digest=digest({...snapshot,observedAt:undefined});return snapshot;
}
export async function fetchRanking(category,fetchImpl=fetch,now=new Date().toISOString()){
  try{
    validateRankingUrl(category.rankingUrl,category);
    const response=await fetchImpl(category.rankingUrl,{redirect:'error',signal:AbortSignal.timeout(20000),headers:{'User-Agent':'Mozilla/5.0 (compatible; SumaLaboComparisonWatch/1.0)'}});
    if(!response.ok)throw Error('http_'+response.status);
    const charset=response.headers.get('content-type')?.match(/charset=([\w-]+)/i)?.[1]||'shift_jis';
    return {ok:true,categoryId:category.id,snapshot:parseRanking(new TextDecoder(charset).decode(await response.arrayBuffer()),category,now)};
  }catch(e){return {ok:false,categoryId:category.id,error:e.cause?.code||e.message};}
}
export function observeRankings(state,results,now){
  const next=structuredClone(state||{snapshots:{},pending:[],completed:[]});
  const month=new Date(Date.parse(now)+9*3600000).toISOString().slice(0,7);
  for(const result of results){
    if(!result.ok)continue;
    const {snapshot,categoryId}=result;
    next.snapshots[categoryId]=snapshot;
    const key=categoryId+':'+month;
    if(!next.completed.some(c=>c.key===key)&&!next.pending.some(c=>c.key===key))next.pending.push({key,categoryId,month,createdAt:now});
  }
  next.checkedAt=now;return next;
}
export async function verifyPublishedComparison(receipt,category,fetchImpl=fetch){
  const url=`https://sumalabo.com/articles/${category.articleSlug}/`;
  if(receipt.articleUrl!==url||!/^https:\/\/github\.com\/hnishimura40\/sumalabo\/pull\/\d+$/.test(receipt.prUrl||'')||!/^[a-f0-9]{24}$/.test(receipt.version||''))throw Error('publication_receipt_invalid');
  const pr=await fetchImpl(receipt.prUrl.replace('https://github.com/','https://api.github.com/repos/').replace('/pull/','/pulls/'),{signal:AbortSignal.timeout(20000)});
  if(!pr.ok||(await pr.json()).merged!==true)throw Error('pr_not_merged');
  const article=await fetchImpl(url,{signal:AbortSignal.timeout(20000)});
  if(article.status!==200||!(await article.text()).includes(`data-comparison-version="${receipt.version}"`))throw Error('published_version_not_visible');
  const verify=await fetchImpl(`https://sumalabo.com/api/verify-publication?slug=${category.articleSlug}`,{signal:AbortSignal.timeout(20000)});
  if(!verify.ok||(await verify.json()).status!=='published')throw Error('strict_verification_failed');
}
async function main(){
  const config=read(path.join(ROOT,'data/automation/product-comparison-watch.json'));
  const dir=path.join(ROOT,config.stateDirectory);fs.mkdirSync(dir,{recursive:true});
  const lock=path.join(dir,'watch.lock'),fd=fs.openSync(lock,'wx');
  try{
    const file=path.join(dir,'state.json'),state=read(file,{snapshots:{},pending:[],completed:[]});
    const command=process.argv[2]||'check';
    if(command==='ack'){
      const receipt=read(path.resolve(process.argv[3]||''));const pending=state.pending.find(p=>p.key===receipt.key);
      if(!pending)throw Error('unknown_pending_key');
      const category=config.categories.find(c=>c.id===pending.categoryId);
      await verifyPublishedComparison(receipt,category);
      state.completed.push({...pending,...receipt,completedAt:new Date().toISOString()});state.pending=state.pending.filter(p=>p.key!==receipt.key);
    }else if(command==='status'){console.log(JSON.stringify({pending:state.pending,categories:Object.keys(state.snapshots)}));return;}
    else if(command==='check'){
      const now=new Date().toISOString();const results=await Promise.all(config.categories.map(c=>fetchRanking(c,fetch,now)));
      const next=observeRankings(state,results,now);Object.assign(state,next);
      fs.writeFileSync(path.join(dir,'latest-check.json'),JSON.stringify({at:now,results:results.map(r=>({ok:r.ok,categoryId:r.categoryId,error:r.error,products:r.snapshot?.products.length})),pending:state.pending},null,2));
      for(const r of results)if(r.ok)fs.writeFileSync(path.join(dir,r.categoryId+'-ranking.json'),JSON.stringify(r.snapshot,null,2));
      console.log(JSON.stringify({results:results.map(r=>({ok:r.ok,categoryId:r.categoryId,error:r.error,products:r.snapshot?.products.length})),pending:state.pending}));
      if(results.some(r=>!r.ok))process.exitCode=2;
    }else throw Error('usage: check | status | ack <receipt.json>');
    const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(state,null,2));fs.renameSync(temp,file);
  }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
