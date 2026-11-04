import {primarySources} from './ai-v2-sources.mjs';
export function deriveStance(model,policy){
  const manual=policy.manualStances?.[model.slug];
  if(manual?.author==='Hiro'&&manual.text&&Array.isArray(manual.sourceIds)&&manual.sourceIds.length){primarySources(model,manual.sourceIds,policy.officialDomains);return {id:'manual',text:manual.text,sourceIds:manual.sourceIds,notice:policy.stanceNotice,evidence:manual.evidence||[]};}
  const items=model.uncertainties||[];
  const rule=policy.stanceRules.find(r=>r.requires.every(type=>items.some(i=>i.type===type&&i.label&&i.sourceId)));
  if(!rule)return null;
  const evidence=rule.requires.map(type=>items.find(i=>i.type===type));
  const sourceIds=[...new Set(evidence.map(e=>e.sourceId))];primarySources(model,sourceIds,policy.officialDomains);
  return {id:rule.id,text:rule.text,notice:policy.stanceNotice,evidence:evidence.map(e=>e.label),sourceIds};
}
