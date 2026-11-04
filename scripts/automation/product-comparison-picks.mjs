import fs from 'node:fs';
export const pickPolicy=JSON.parse(fs.readFileSync(new URL('../../data/automation/product-comparison-picks.json',import.meta.url),'utf8'));
export function verifiedValue(product,field){
  const f=product.comparisonFacts?.[field];
  if(f?.status!=='verified')return undefined;
  return f.numericValue ?? f.booleanValue ?? f.enumValue ?? f.value;
}
function passes(product,axis){
  const value=verifiedValue(product,axis.field);
  if(value===undefined)return false;
  if(axis.op==='eq')return value===axis.value;
  if(typeof value!=='number'||!Number.isFinite(value))return false;
  return axis.op==='gte'?value>=axis.value:axis.op==='lte'?value<=axis.value:false;
}
export function segmentFor(product,axis){
  const value=verifiedValue(product,axis.field);
  if(axis.order)return axis.order.includes(value)?String(value):null;
  if(typeof value!=='number'||value<=0)return null;
  return axis.bands?.find(b=>b.max===null||value<=b.max)?.label??null;
}
export function requiredPickFields(category){
  return [...new Set([category.segmentAxis.field,...pickPolicy.common.requiredAxes.map(a=>a.field),...category.requiredAxes.map(a=>a.field),category.upperAxis.field,...category.slots.flatMap(s=>s.with?[s.with.field]:[]),...(category.exclude||[]).map(a=>a.field),...category.positionBars,...category.achievementColumns,...category.slots.flatMap(s=>[...s.claimTemplate.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).filter(k=>!['segmentValue','segmentLabel','priceBand','topSegment'].includes(k)))])];
}
export function evaluatePicks(review,snapshot,categoryId,policy=pickPolicy){
  const category=policy.categories.find(c=>c.id===categoryId);if(!category)throw Error('pick_category_required');
  if(review.products.length!==10||snapshot.products.length!==10||new Set(review.products.map(p=>p.id)).size!==10||review.products.some(p=>!snapshot.products.some(r=>r.id===p.id)))throw Error('pick_candidate_pool_mismatch');
  const supportedRules=new Set(['cheapest_meeting_required','cheapest_in_largest_segment_meeting_required_and_upper','cheapest_in_top_segment_with','cheapest_meeting_required_with','cheapest_in_segment_with','representative_per_other_segment']);
  if(category.slots.length!==3||new Set(category.slots.map(s=>s.id)).size!==3||category.slots.some(s=>!supportedRules.has(s.rule)))throw Error('unsupported_pick_rule');
  const required=[...policy.common.requiredAxes,...category.requiredAxes];
  const rows=review.products.map(p=>{
    const price=snapshot.products.find(r=>r.id===p.id).priceYen;
    const excluded=(category.exclude||[]).find(a=>passes(p,a));
    const axes=required.map(a=>({field:a.field,label:a.label,pass:passes(p,a),value:verifiedValue(p,a.field)??null}));
    return {product:p,productId:p.id,price,segment:segmentFor(p,category.segmentAxis),required:axes,upper:{field:category.upperAxis.field,label:category.upperAxis.label,pass:passes(p,category.upperAxis)},eligible:p.status==='eligible'&&!excluded&&axes.every(a=>a.pass)&&Number.isFinite(price)&&price>0,reason:excluded?.reason||(p.status!=='eligible'?p.exclusionReason||'仕様確認が未完了':axes.filter(a=>!a.pass).map(a=>a.label+'の条件確認が未完了').join('／'))||(!Number.isFinite(price)||price<=0?'参考価格が未確認':'')};
  });
  const segments=category.segmentAxis.order?.map(String)||category.segmentAxis.bands.map(b=>b.label);
  const counts=segments.map(segment=>({segment,count:rows.filter(r=>r.segment===segment).length}));
  const largest=[...counts].sort((a,b)=>b.count-a.count||segments.indexOf(a.segment)-segments.indexOf(b.segment))[0]?.segment;
  const used=new Set(),picks={};
  const sorted=rows.filter(r=>r.eligible).sort((a,b)=>a.price-b.price||a.productId.localeCompare(b.productId));
  function makePick(slot,candidates){
    candidates=candidates.filter(r=>!used.has(r.productId));
    if(!candidates.length)return {status:'none',productId:null,claim:null,runnerUp:null,reason:'確認済みの必須条件・枠条件を満たす未選出候補がありません'};
    const selected=candidates[0],p=selected.product;
    const context={segmentValue:selected.segment,segmentLabel:selected.segment,topSegment:segments[0],priceBand:selected.price.toLocaleString('ja-JP')+'円'};
    const missing=[];
    let claim=slot.claimTemplate.replace(/\{(\w+)\}/g,(_,key)=>{
      const value=context[key]??verifiedValue(p,key);
      if(value===undefined){missing.push(key);return '';}
      return key==='wifiGeneration'?'Wi-Fi '+value:String(value);
    }).replace('10候補で最安','必須条件を満たす10候補中で最安');
    if(missing.length)return {status:'none',productId:null,claim:null,runnerUp:null,reason:'決め手の公式確認が不足：'+missing.join('・')};
    const evidence=[...required,category.upperAxis,...(slot.with?[slot.with]:[])].filter(a=>passes(p,a));
    if(evidence.length<2)throw Error('two_verified_claim_axes_required');
    claim+='。'+evidence.map(a=>`${a.label||({has6GHz:'6GHz帯',simultaneousTotalW:'同時出力（W）',airlineCarryOn:'機内持込'})[a.field]||a.field}（${verifiedValue(p,a.field)===true?'確認済み':verifiedValue(p,a.field)}）`).join('、');
    if(policy.common.forbiddenWords.some(word=>claim.includes(word)))throw Error('forbidden_pick_claim');
    const next=candidates[1];
    const diff=next&&[...required,category.upperAxis].find(a=>verifiedValue(next.product,a.field)!==verifiedValue(p,a.field))||evidence.find(a=>typeof verifiedValue(p,a.field)==='number')||evidence[0];
    used.add(p.id);
    return {status:'selected',productId:p.id,claim,reason:'確認済み条件を満たす候補を価格昇順・同額は候補ID順で判定',evidence:evidence.map(a=>a.field),runnerUp:next?{productId:next.productId,priceDiff:next.price-selected.price,field:diff.field,value:verifiedValue(next.product,diff.field)??null,text:`次点：${next.product.model}（${next.price-selected.price}円差。${diff.label}：${verifiedValue(next.product,diff.field)===true?'あり':verifiedValue(next.product,diff.field)===false?'なし':verifiedValue(next.product,diff.field)??'公式確認が必要'}）`}:null};
  }
  for(const slot of category.slots){
    let candidates=sorted;
    if(slot.rule.includes('largest_segment'))candidates=candidates.filter(r=>r.segment===largest&&r.upper.pass);
    if(slot.rule==='cheapest_in_top_segment_with')candidates=candidates.filter(r=>r.segment===segments[0]);
    if(slot.rule==='cheapest_in_segment_with')candidates=candidates.filter(r=>r.segment===slot.segment);
    if(slot.with)candidates=candidates.filter(r=>passes(r.product,slot.with));
    if(slot.rule==='representative_per_other_segment'){
      const representatives=segments.filter(s=>s!==largest&&s!=='tws-canal').map(s=>({segment:s,...makePick(slot,candidates.filter(r=>r.segment===s))}));
      picks[slot.id]={status:representatives.some(r=>r.status==='selected')?'selected':'none',productId:null,claim:slot.claimTemplate,runnerUp:null,reason:'カナル型以外の各段から必須条件を満たす最安を選定',representatives};
    }else picks[slot.id]=makePick(slot,candidates);
  }
  function omissionReason(row){
    if(row.reason)return row.reason;
    if(used.has(row.productId))return '編集部の枠に選出';
    const defaultPick=picks.default,chosen=rows.find(r=>r.productId===defaultPick?.productId);
    const topPick=Object.values(picks).find(p=>p.status==='selected'&&rows.find(r=>r.productId===p.productId)?.segment===row.segment&&p.productId!==defaultPick?.productId);
    const peer=rows.find(r=>r.productId===topPick?.productId)||chosen;
    if(peer)return `${row.segment??'段が未確認'}の段。${row.upper.pass?category.upperAxis.label+'を確認':'上位軸の条件確認が未完了'}。選出した${peer.product.model}との参考価格差は${row.price-peer.price}円。`;
    return `${row.segment??'段が未確認'}の段・参考価格${row.price}円。枠の追加条件に合わず選出対象外。`;
  }
  return {picks,achievement:rows.map(({product,eligible,...row})=>({...row,selected:used.has(row.productId),reason:omissionReason(row),suitableFor:product.suitableFor})),pickEvaluation:{policyVersion:policy.version,largestSegment:largest,segmentCounts:counts}};
}
