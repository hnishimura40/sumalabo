import {aiPolicy,parseAiV2Mdx,renderAiV2Html,publishedPicks} from './ai-article-v2.mjs';
import {primarySources,isPrimarySource} from './ai-v2-sources.mjs';
import {deriveStance} from './ai-v2-stance.mjs';
import {selectToolCards} from './ai-v2-tools.mjs';
export const AI_CHECKS=['headline-answer-align','answer-with-source','three-way-split','source-badges','one-figure','no-duplicate-summary','next-actions','tool-cards','stance-rule','changelog'];
const text=v=>typeof v==='string'&&v.trim().length>1;
const date=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const visible=v=>String(v).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
export function headlineAnswerAligned(title,answer){
  if(!text(title)||!text(answer))return false;
  const normalize=s=>s.normalize('NFKC').replace(/,/g,'');
  const first=normalize(answer).split(/[。！？!?]/)[0],headline=normalize(title);
  const numbers=headline.match(/\d+(?:\.\d+)?(?:円|ドル|%|台|時間|分|GB|万人)/g)||[];
  if(numbers.some(n=>!first.includes(n)))return false;
  const conditional=/場合|だけ|以降|終了後|対象|非会員|まで|未定|未発表|まだ/.test(first);
  if(/無料/.test(headline)&&/有料|支払う|課金が必要/.test(first)&&!conditional)return false;
  if(/有料|課金が必要/.test(headline)&&/無料/.test(first)&&!conditional)return false;
  if(/日本で/.test(headline)&&!/日本|国内|未発表|未定/.test(first))return false;
  return true;
}
export function validateAiV2(model,{title=model?.headline,registry=publishedPicks,now=Date.now()}={}){
  const checks={};const record=(id,pass,reason)=>checks[id]={status:pass?'pass':'fail',reason};
  const first=String(model?.answer||'').split(/[。！？!?]/)[0];
  record('headline-answer-align',title===model?.headline&&headlineAnswerAligned(title,first),'見出しと答えの1文目の数値・条件・日本提供の方向を照合');
  let answerSource=false,changeSources=false;
  try{primarySources(model,model.answerSourceIds,aiPolicy.officialDomains);answerSource=date(model.checkedAt)&&Date.parse(model.checkedAt)<=now;}catch{}
  record('answer-with-source',answerSource,'答えの一次情報と確認日を必須にする');
  record('three-way-split',Array.isArray(model?.branches)&&model.branches.length===3&&new Set(model.branches.map(b=>b.condition?.trim())).size===3&&model.branches.every((b,i)=>b.kind===['relevant','wait','unrelated'][i]&&text(b.condition)&&text(b.action)),'3分岐に条件と行動');
  try{changeSources=Array.isArray(model?.changes)&&model.changes.length===3&&new Set(model.changes.map(c=>c.text?.trim())).size===3&&model.changes.every((c,i)=>c.kind===['changed','available','unavailable'][i]&&text(c.text)&&primarySources(model,c.sourceIds,aiPolicy.officialDomains).length>0);}catch{}
  record('source-badges',changeSources&&new Set((model?.sources||[]).map(s=>s.id)).size===(model?.sources||[]).length,'各カラムの根拠を発表元の公式ドメイン・確認済み日付へ結合');
  record('one-figure',!model?.figure||(!Array.isArray(model.figure)&&/^\/images\/[a-zA-Z0-9/_-]+\.webp$/.test(model.figure.src)&&text(model.figure.alt)&&text(model.figure.caption)),'図は0〜1枚・alt・キャプション');
  const publicText=[model?.answer,...(model?.changes||[]).map(c=>c.text),model?.dialogue?.question,model?.dialogue?.answer,...(model?.nextActions||[]).map(a=>a.action)].join(' ');
  record('no-duplicate-summary',!/(?:30秒サマリー|先に結論|すまラボまとめ|図のポイント)/.test(publicText)&&!Object.hasOwn(model||{},'summary')&&!Object.hasOwn(model||{},'stance'),'廃止ブロック・自由生成の見立てを拒否');
  record('next-actions',Array.isArray(model?.nextActions)&&model.nextActions.length===3&&model.nextActions.every(a=>text(a.target)&&text(a.condition)&&text(a.action)&&!/^確認してください[。！]?$/.test(a.action)),'対象・条件・条件成立後の行動を3つ、表示で番号付け');
  const tools=selectToolCards(model||{},aiPolicy,registry);
  const expectedToolCategories=[...new Set(aiPolicy.toolMappings.filter(m=>m.tags.some(t=>(model?.tags||[]).includes(t))).flatMap(m=>m.categories))].filter(id=>registry.categories?.[id]?.status==='published').slice(0,2);
  checks['tool-cards']=tools.length?{status:'pass',reason:'公開済み月次比較の写真・見出し・号数を使用'}:{status:'not_applicable',reason:'対応カテゴリの公開済み今月の1台がないか、対応表が導線なしの話題'};
  if(tools.length!==expectedToolCategories.length)record('tool-cards',false,'公開済みカードに写真・見出し・号数の欠落があります');
  let stance=null;try{stance=deriveStance(model,aiPolicy);checks['stance-rule']=stance?{status:'pass',reason:'設定の型に一致。根拠項目・一次情報・確定情報でない注記を表示'}:{status:'not_applicable',reason:'設定表に一致せず見立てを省略'};}catch{record('stance-rule',false,'見立ての根拠が一次情報として確認されていない');}
  record('changelog',Array.isArray(model?.changelog)&&model.changelog.length>0&&model.changelog.every(c=>date(c.date)&&text(c.note)&&Array.isArray(c.sourceIds)&&c.sourceIds.length&&c.sourceIds.every(id=>model.sources?.some(s=>s.id===id))),'公開日と更新ごとの確認内容・根拠を記録');
  if(!text(model?.dialogue?.question)||!text(model?.dialogue?.answer))record('three-way-split',false,'ひまり・らぼまるの1往復が必要');
  if((model?.sources||[]).some(s=>!/^https:\/\//.test(s.url||'')||(()=>{try{const u=new URL(s.url);return !!(u.username||u.password);}catch{return true;}})()||!date(s.date)||Date.parse(s.date)>now||s.type==='primary'&&!isPrimarySource(s,aiPolicy.officialDomains)))record('source-badges',false,'出典の日付・公式情報の確認が不正');
  let rendered='';try{rendered=renderAiV2Html(model,registry);}catch(e){record('source-badges',false,e.message);}
  const issues=Object.entries(checks).filter(([,v])=>v.status==='fail').map(([code,v])=>({code,severity:'major',message:v.reason}));
  return {checks,issues,ok:issues.length===0,rendered};
}
export function validateAiV2Mdx(body,options){try{return validateAiV2(parseAiV2Mdx(body),options);}catch(e){return {ok:false,rendered:'',checks:Object.fromEntries(AI_CHECKS.map(id=>[id,{status:'fail',reason:e.message}])),issues:[{code:'ai-v2-model',severity:'major',message:e.message}]};}}
