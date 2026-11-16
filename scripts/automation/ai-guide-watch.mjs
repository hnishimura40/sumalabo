// Public-source observation only. A changed hash is a review candidate, never a fact update.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const read=(p,fallback)=>{try{return JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}};
const save=(p,data)=>{fs.mkdirSync(path.dirname(p),{recursive:true});const temp=p+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n');fs.renameSync(temp,p);};
export const loadConfig=()=>read(path.join(ROOT,'config/ai-guide-maintenance.json'));
function canonical(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password)throw Error('public_https_required');u.hash='';return u.href;}
export function listSources(config=loadConfig(),root=ROOT){
 const sources=new Map();
 const add=(url,group)=>{url=canonical(url);if(config.excludedHosts?.includes(new URL(url).hostname)||new RegExp(config.excludedPathPattern,'i').test(new URL(url).pathname))return;const item=sources.get(url)||{id:digest(url).slice(0,16),url,groups:[]};if(!item.groups.includes(group))item.groups.push(group);sources.set(url,item);};
 for(const source of config.sourceFiles){const file=fs.readFileSync(path.join(root,source.path),'utf8');for(const match of file.matchAll(/https:\/\/[^\s'"<>`\\]+/g))add(match[0],source.group);}
 for(const source of config.discoverySources)add(source.url,source.group);
 return [...sources.values()].sort((a,b)=>a.url.localeCompare(b.url));
}
export function sourceText(html){
 const title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'';
 if(/just a moment|access denied|forbidden|captcha/i.test(title))throw Error('challenge_or_access_denied');
 let text=html.replace(/<!--[\s\S]*?-->/g,' ').replace(/<(script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ');
 text=(text.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)||[])[1]||text;
 text=text.replace(/<(nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]*>/g,' ');
 text=text.replace(/&nbsp;|&#160;/gi,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").normalize('NFKC').replace(/\s+/g,' ').trim();
 if(/verify you are human|checking your browser|enable javascript and cookies|ログインして続行/i.test(text.slice(0,600)))throw Error('challenge_or_login_page');
 return {title:title.replace(/<[^>]*>/g,'').trim(),text};
}
async function fetchSource(source,config,fetchImpl){
 if(!config.allowedHosts.includes(new URL(source.url).hostname))throw Error('source_host_not_allowed');
 let url=source.url;
 for(let hop=0;hop<5;hop++){
  const response=await fetchImpl(url,{redirect:'manual',signal:AbortSignal.timeout(config.timeoutMs),headers:{'User-Agent':'SumaLabo-AI-Guide-Maintenance/1.0','Accept':'text/html,application/json,text/plain'}});
  if([301,302,303,307,308].includes(response.status)){
   const target=canonical(new URL(response.headers.get('location'),url).href);
   if(!config.allowedHosts.includes(new URL(target).hostname))throw Error('redirect_host_not_allowed');url=target;continue;
  }
  if(response.status!==200)throw Error(`http_${response.status}`);
  if(!/text\/html|application\/json|text\/plain/i.test(response.headers.get('content-type')||''))throw Error('unexpected_content_type');
  const reader=response.body.getReader();let bytes=0,chunks=[];
  for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>config.maximumBytes){await reader.cancel();throw Error('response_too_large');}chunks.push(Buffer.from(value));}
  const raw=Buffer.concat(chunks).toString('utf8');const page=sourceText(raw);
  if(page.text.length<config.minimumTextLength)throw Error('insufficient_text_needs_browser');
  return {...page,raw,finalUrl:url,hash:digest(page.text)};
 }
 throw Error('too_many_redirects');
}
export async function checkSources({config=loadConfig(),stateDirectory=config.stateDirectory,sources=listSources(config),fetchImpl=fetch,now=new Date().toISOString()}={}){
 if(!config.enabled)throw Error('maintenance_disabled');
 const stateFile=path.join(stateDirectory,'state.json');const lockFile=path.join(stateDirectory,'check.lock');fs.mkdirSync(stateDirectory,{recursive:true});
 // Fail closed on a concurrent run or abandoned lock; never silently steal a live writer.
 const lock=fs.openSync(lockFile,'wx');fs.writeFileSync(lock,JSON.stringify({pid:process.pid,at:now}));
 try{
  const state=read(stateFile,{schemaVersion:1,sources:{},pending:{},history:[]});const results=[];
  let index=0;
  await Promise.all(Array.from({length:Math.min(config.concurrency,sources.length)},async()=>{while(index<sources.length){const source=sources[index++];
   try{
    const page=await fetchSource(source,config,fetchImpl);const previous=state.sources[source.id];const recovered=state.pending[source.id]?.reason==='fetch_failed_needs_browser';
    const dir=path.join(stateDirectory,'snapshots',source.id,page.hash);fs.mkdirSync(dir,{recursive:true});
    if(!fs.existsSync(path.join(dir,'source.html')))fs.writeFileSync(path.join(dir,'source.html'),page.raw);
    if(!fs.existsSync(path.join(dir,'text.txt')))fs.writeFileSync(path.join(dir,'text.txt'),page.text);
    const record={...source,hash:page.hash,finalUrl:page.finalUrl,title:page.title,checkedAt:now,snapshotDirectory:dir};
    const changed=!previous||previous.hash!==page.hash;
    if(changed||(!previous?.reviewedHash&&!state.pending[source.id]))state.pending[source.id]={...record,reason:previous?'source_changed':'initial_review',previousHash:previous?.hash||null,firstSeen:state.pending[source.id]?.firstSeen||now};
    // A fetch never clears a semantic-review item, even if the page later reverts.
    if(state.pending[source.id])state.pending[source.id]={...state.pending[source.id],...record,lastObserved:now,...(recovered?{reason:'source_recovered_needs_review'}:{})};
    state.sources[source.id]={...previous,...record};results.push({id:source.id,url:source.url,status:changed?'review_required':'unchanged',hash:page.hash});
   }catch(error){state.pending[source.id]={...state.pending[source.id],...source,reason:'fetch_failed_needs_browser',error:error.message,lastAttempt:now};results.push({id:source.id,url:source.url,status:'failed',error:error.message});}
  }}));
  state.lastCheckAt=now;state.history=state.history.slice(-99);save(stateFile,state);
  const failed=results.filter(r=>r.status==='failed');const summary={schemaVersion:1,at:now,status:failed.length?'needs_browser_review':Object.keys(state.pending).length?'review_required':'no_material_change',sourceCount:sources.length,successful:results.length-failed.length,failed:failed.length,pending:Object.keys(state.pending).length,results:results.sort((a,b)=>a.url.localeCompare(b.url))};
  save(path.join(stateDirectory,'latest-check.json'),summary);save(path.join(stateDirectory,'checks',now.replace(/[:.]/g,'-')+'.json'),summary);return summary;
 }finally{fs.closeSync(lock);fs.unlinkSync(lockFile);}
}
export function resolveReview({stateDirectory,sourceId,observedHash,evidenceFile,resolution,productionProofFile,now=new Date().toISOString()}){
 if(!['no_material_change','published','verified_no_change'].includes(resolution))throw Error('invalid_resolution');
 const lockFile=path.join(stateDirectory,'check.lock');const lock=fs.openSync(lockFile,'wx');
 try{
  const file=path.join(stateDirectory,'state.json');const state=read(file);const item=state.pending[sourceId];if(!item)throw Error('pending_item_missing');
  if(!observedHash||item.hash!==observedHash||state.sources[sourceId]?.hash!==observedHash)throw Error('stale_or_missing_observation');
  const evidence=read(evidenceFile);if(!evidence||evidence.sourceId!==sourceId||evidence.observedHash!==observedHash||canonical(evidence.url)!==item.url||!['official_http','official_browser','official_api'].includes(evidence.method)||!Array.isArray(evidence.facts)||!evidence.facts.length||!evidence.checkedAt)throw Error('review_evidence_required');
  if(item.reason==='fetch_failed_needs_browser'&&evidence.method!=='official_browser')throw Error('browser_evidence_required');
  if(resolution==='published'){const proof=read(productionProofFile);if(proof?.ok!==true||proof.production!==true||proof.base!=='https://sumalabo.com'||!proof.build||evidence.publishedCommit?.slice(0,12)!==proof.build)throw Error('verified_production_commit_required');}
  state.sources[sourceId].reviewedHash=observedHash;state.sources[sourceId].reviewedAt=now;delete state.pending[sourceId];state.history.push({sourceId,observedHash,resolution,evidenceFile,productionProofFile:productionProofFile||null,at:now});state.history=state.history.slice(-100);save(file,state);return {ok:true,pending:Object.keys(state.pending).length};
 }finally{fs.closeSync(lock);fs.unlinkSync(lockFile);}
}
export function observeBrowser({config=loadConfig(),stateDirectory=config.stateDirectory,inputFile}){
 const input=read(inputFile);const url=canonical(input.url);const source=listSources(config).find(s=>s.url===url);
 if(!source||input.method!=='official_browser'||!input.checkedAt||typeof input.text!=='string'||input.text.length<config.minimumTextLength)throw Error('registered_official_browser_observation_required');
 const text=input.text.normalize('NFKC').replace(/\s+/g,' ').trim();if(/verify you are human|checking your browser/i.test(text.slice(0,600)))throw Error('challenge_is_not_evidence');
 const lockFile=path.join(stateDirectory,'check.lock');fs.mkdirSync(stateDirectory,{recursive:true});const lock=fs.openSync(lockFile,'wx');
 try{const file=path.join(stateDirectory,'state.json');const state=read(file,{schemaVersion:1,sources:{},pending:{},history:[]});const hash=digest(text);const dir=path.join(stateDirectory,'snapshots',source.id,hash);fs.mkdirSync(dir,{recursive:true});save(path.join(dir,'browser.json'),input);fs.writeFileSync(path.join(dir,'text.txt'),text);
 const record={...source,hash,checkedAt:input.checkedAt,title:input.title||'',snapshotDirectory:dir,observationMethod:'official_browser'};
 state.sources[source.id]={...state.sources[source.id],...record};state.pending[source.id]={...record,reason:'browser_review',previousHash:state.pending[source.id]?.hash||null};save(file,state);return {ok:true,id:source.id,hash};
 }finally{fs.closeSync(lock);fs.unlinkSync(lockFile);}
}
export function archiveBenchmark(root=ROOT){
 const file=path.join(root,'public/data/ai-benchmarks/current.json');const raw=fs.readFileSync(file,'utf8');const current=JSON.parse(raw);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(current.checkedAt)||!current.version||!Array.isArray(current.rows)||!current.rows.length)throw Error('invalid_benchmark_snapshot');
 const hash=digest(raw);const target=path.join(root,'public/data/ai-benchmarks/archive',`${current.checkedAt}-${hash.slice(0,12)}.json`);fs.mkdirSync(path.dirname(target),{recursive:true});
 if(fs.existsSync(target)){if(fs.readFileSync(target,'utf8')!==raw)throw Error('archive_content_conflict');return {ok:true,status:'already_archived',hash,path:target};}
 fs.writeFileSync(target,raw,{flag:'wx'});return {ok:true,status:'archived',hash,path:target};
}
async function main(){
 const [command='check',...argv]=process.argv.slice(2);const args=Object.fromEntries(argv.map(a=>a.replace(/^--/,'').split('=')));const config=loadConfig();const stateDirectory=args['state-dir']||config.stateDirectory;
 if(command==='sources'){console.log(JSON.stringify(listSources(config),null,2));return;}
 if(command==='packet'){console.log(JSON.stringify(read(path.join(stateDirectory,'state.json'),{pending:{}}).pending,null,2));return;}
 if(command==='check'){let sources=listSources(config);if(args.group)sources=sources.filter(s=>s.groups.includes(args.group));const result=await checkSources({config,stateDirectory,sources});console.log(JSON.stringify({...result,results:undefined}));return;}
 if(command==='resolve'){console.log(JSON.stringify(resolveReview({stateDirectory,sourceId:args.id,observedHash:args.hash,evidenceFile:args.evidence,resolution:args.resolution,productionProofFile:args.proof})));return;}
 if(command==='observe-browser'){console.log(JSON.stringify(observeBrowser({config,stateDirectory,inputFile:args.input})));return;}
 if(command==='archive-benchmark'){console.log(JSON.stringify(archiveBenchmark()));return;}
 throw Error('Expected check, sources, packet, observe-browser, or resolve');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)main().catch(e=>{console.error(JSON.stringify({ok:false,error:e.message}));process.exitCode=1;});
