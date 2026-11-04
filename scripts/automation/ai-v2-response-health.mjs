import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {aiPolicy,isAiV2,parseAiV2Mdx} from './ai-article-v2.mjs';
import {validateAiV2} from './ai-v2-checks.mjs';
import {validatePerformanceBlock} from './phase-a-orchestrator.mjs';
import {parseSlidePlan} from './codex-image-stage.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function responseTemplate(output,{root=ROOT,enabled=aiPolicy.enabled}={}){
  const relative=path.relative(path.resolve(root,'drafts/refinement'),path.resolve(output));
  const match=relative.match(/^([a-z0-9-]+)[\\/][^\\/]+\.md$/);
  if(!match)return null;
  const file=path.join(root,'logs/article',match[1]+'.state.json');
  if(!fs.existsSync(file))return null;
  const state=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
  return isAiV2(state,enabled)?'ai-v2':null;
}
export function analyzeAiV2Response(text,step){
  if(!['chatgpt_turn3_draft','chatgpt_turn5_final','chatgpt_turn6_slideplan'].includes(step))return null;
  const reasons=[],normalized=String(text).trim();let proseChars=0,checks=null;
  if(step==='chatgpt_turn6_slideplan'){
    const performance=validatePerformanceBlock(normalized);
    if(!performance.ok)reasons.push('performance_block_invalid:'+performance.missing.join(','));
    const items=parseSlidePlan(normalized),ids=items.map(i=>i.id);
    if(ids.filter(i=>i==='thumbnail').length!==1||ids.filter(i=>i==='slide01').length>1||/^##\s+slide(?!01\b)\d+/mi.test(normalized))reasons.push('ai_v2_thumbnail_and_at_most_one_figure_required');
    for(const item of items){
      if(item.section.length<100)reasons.push('image_direction_too_short:'+item.id);
      if(item.id==='thumbnail')for(const field of ['感情','行動','場面','手の動作'])if(!item.section.includes(field))reasons.push('thumbnail_field_missing:'+field);
    }
    proseChars=normalized.replace(/^##.*$/gm,'').length;
    if(proseChars<300)reasons.push('image_plan_too_short');
  }else{
    try{
      const model=/export\s+const\s+aiV2/.test(normalized)?parseAiV2Mdx(normalized):JSON.parse(normalized.replace(/^```(?:json)?\s*\n|\n```$/g,''));
      const validation=validateAiV2(model);checks=validation.checks;
      reasons.push(...validation.issues.map(i=>'ai_v2:'+i.code));
      const strings=[model.answer,...model.branches.flatMap(b=>[b.condition,b.action]),...model.changes.map(c=>c.text),model.figure?.caption,model.dialogue.question,model.dialogue.answer,...model.nextActions.flatMap(a=>[a.target,a.condition,a.action])];
      proseChars=strings.filter(Boolean).join('').length;
      if(proseChars<1200)reasons.push('prose_chars_too_few:'+proseChars+'<1200');
      if(new Set(model.sources.map(s=>s.url)).size<2)reasons.push('source_urls_too_few');
    }catch(error){reasons.push('ai_v2_model_invalid:'+error.message);}
  }
  return {healthy:reasons.length===0,reasons,outputChars:normalized.length,proseChars,templateVersion:'ai-v2',checks,limits:{minProseChars:step==='chatgpt_turn6_slideplan'?300:1200}};
}
