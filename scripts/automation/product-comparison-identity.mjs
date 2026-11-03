import fs from 'node:fs';
const policy=JSON.parse(fs.readFileSync(new URL('../../data/automation/sumalabo-editorial-identity.json',import.meta.url),'utf8'));
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
const fresh=(v,now)=>Number.isFinite(Date.parse(v))&&now-Date.parse(v)>=0&&now-Date.parse(v)<=72*3600000;
const escape=value=>String(value??'').replace(/[&<>"'{}]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','{':'&#123;','}':'&#125;'}[c]));
export function validateIdentity(review,category,now=Date.now()){
  const identity=review.identity,groups=policy.categoryComparisonGroups[category.id];
  if(identity?.policyVersion!==policy.version||!Array.isArray(identity.groups)||identity.groups.length!==groups.length)throw Error('identity_policy_required');
  if(!nonempty(identity.opening?.question)||!nonempty(identity.opening?.answer))throw Error('specific_character_guidance_required');
  for(const group of groups){
    const display=identity.groups.find(g=>g.id===group.id);
    if(!display||!nonempty(display.title)||!nonempty(display.intro)||!nonempty(display.question)||!nonempty(display.answer)||!Array.isArray(display.columns)||display.columns.length!==group.fields.length||new Set(display.columns.map(c=>c.field)).size!==group.fields.length||group.fields.some(field=>!display.columns.some(c=>c.field===field&&nonempty(c.label))))throw Error('cross_product_groups_required');
  }
  for(const p of review.products){
    if(!p.image||!nonempty(p.image.imageModel)||!nonempty(p.image.caption))throw Error('all_ten_product_photos_required');
    if(p.image.imageModel!==p.model&&!nonempty(p.image.variantNote))throw Error('reference_photo_caption_required');
    for(const field of new Set([...policy.commonComparisonFields,...groups.flatMap(g=>g.fields)])){
      const f=p.comparisonFacts?.[field];
      if(!f||!nonempty(f.value)||!['verified','unknown','not_applicable'].includes(f.status)||!fresh(f.verifiedAt,now)||!Array.isArray(f.sources)||!f.sources.length)throw Error('identity_fact_evidence_required:'+field);
      if(f.status!=='verified'&&!nonempty(f.reason))throw Error('unknown_or_inapplicable_reason_required');
      for(const source of f.sources){
        let u;try{u=new URL(source.url);}catch{throw Error('identity_source_url_required');}
        if(u.protocol!=='https:'||u.username||u.password||!nonempty(source.label)||!['manufacturer','authority','airline','kakaku'].includes(source.type))throw Error('identity_source_url_required');
        if(source.type==='manufacturer'&&/(?:^|\.)(?:kakaku\.com|amazon\.co\.jp|rakuten\.co\.jp|yahoo\.co\.jp)$/.test(u.hostname))throw Error('identity_manufacturer_source_required');
      }
    }
    if(category.id==='power-bank'){
      const f=p.comparisonFacts,carry=f.carryOn;
      if(carry.status==='verified'&&carry.value.includes('可')){
        if(!carry.value.includes('条件付き可')||f.capacityWh.status!=='verified'||!Number.isFinite(f.capacityWh.numericValue)||f.capacityWh.numericValue<=0||f.capacityWh.numericValue>160||!carry.sources.some(s=>s.type==='authority'&&new URL(s.url).hostname==='www.mlit.go.jp')||!carry.sources.some(s=>s.type==='airline')||!nonempty(identity.travelScope))throw Error('flight_wh_and_current_rules_required');
      }
      if(f.batteryTechnology.status==='verified'&&/絶対安全|発火しない|燃えない/.test(f.batteryTechnology.value))throw Error('battery_safety_guarantee_forbidden');
    }
  }
  return identity;
}
export function renderDialogue(question,answer){
  return `<aside class="pc-conversation" aria-label="ひまりとらぼまるの選び方ガイド"><div class="pc-speaker pc-himari"><img src="/images/characters/himari_question_icon.webp" alt="ひまり" width="54" height="54" loading="lazy" /><p><strong>ひまり</strong>${escape(question)}</p></div><div class="pc-speaker pc-labomaru"><img src="/images/characters/labomaru_chart_icon.webp" alt="らぼまる" width="54" height="54" loading="lazy" /><p><strong>らぼまる</strong>${escape(answer)}</p></div></aside>`;
}
export function renderIdentityGroups(review,snapshot,category){
  const identity=review.identity;
  const sourceMap=new Map();
  for(const p of review.products)for(const fact of Object.values(p.comparisonFacts))for(const source of fact.sources)if(!sourceMap.has(source.url))sourceMap.set(source.url,{...source,number:sourceMap.size+1});
  const cell=f=>`<span class="pc-fact pc-fact-${f.status}">${escape(f.value).replaceAll('\n','<br />')}</span>${f.status!=='verified'?`<small class="pc-fact-reason">${escape(f.reason)}</small>`:''}<span class="pc-cell-sources">${f.sources.map(s=>`<a href="#pc-source-${sourceMap.get(s.url).number}" aria-label="根拠${sourceMap.get(s.url).number}">[${sourceMap.get(s.url).number}]</a>`).join(' ')}</span>`;
  const panels=identity.groups.map((group,index)=>{
    const tables=[];
    for(let offset=0;offset<group.columns.length;offset+=3){
      const columns=group.columns.slice(offset,offset+3);
      tables.push(`<table class="pc-table pc-matrix" role="table"><caption>${escape(columns.map(c=>c.label).join('・'))}</caption><thead><tr><th scope="col">比較する製品</th>${columns.map(c=>`<th scope="col">${escape(c.label)}</th>`).join('')}</tr></thead><tbody>${snapshot.products.map(raw=>{const p=review.products.find(p=>p.id===raw.id);return `<tr data-status="${p.status}" data-product-id="${p.id}"><th scope="row"><a data-pc-open href="#product-${p.id}">${escape(p.display.name)}</a><span class="pc-model">${escape(p.model)}</span></th>${columns.map(c=>`<td data-label="${escape(c.label)}">${cell(p.comparisonFacts[c.field])}</td>`).join('')}</tr>`;}).join('\n')}</tbody></table>`);
    }
    return `<section class="pc-group" id="pc-group-${group.id}" role="tabpanel" aria-labelledby="pc-tab-${group.id}" tabindex="0"><h3>${escape(group.title)}</h3><p>${escape(group.intro)}</p>${renderDialogue(group.question,group.answer)}${tables.join('\n')}${group.notes?.length?`<div class="pc-group-notes">${group.notes.map(note=>`<p>${escape(note)}</p>`).join('')}</div>`:''}</section>`;
  }).join('\n');
  const sources=[...sourceMap.entries()].map(([url,s])=>`<li id="pc-source-${s.number}"><a href="${escape(url)}">${escape(s.label)}</a></li>`).join('\n');
  return `<h2 id="pc-compare">買う前に気になる違いを比べる</h2><p>早見表の先にある違いを、同じ10候補で比較できます。上の「比べる」にチェックすると、選んだ最大3製品へ絞れます。</p><div class="pc-shortlist" role="group" aria-label="比較する製品を絞る"><button type="button" data-pc-shortlist="all" aria-pressed="true">全10候補</button><button type="button" data-pc-shortlist="selected" aria-pressed="false" disabled>選んだ製品だけ</button><button type="button" data-pc-clear>選択を解除</button><span data-pc-selected-count aria-live="polite">0製品を選択中（最大3）</span></div><div class="pc-tabs" role="tablist" aria-label="比較したいテーマ" hidden>${identity.groups.map((g,index)=>`<button type="button" role="tab" id="pc-tab-${g.id}" aria-controls="pc-group-${g.id}" aria-selected="${index===0}" tabindex="${index===0?0:-1}" data-pc-tab="${g.id}">${escape(g.title)}</button>`).join('')}</div>${identity.travelScope?`<p class="pc-scope">飛行機の判定対象：${escape(identity.travelScope)}</p>`:''}<p class="pc-legend">読み方：<strong>条件付き可</strong>は条件の確認が必要、<strong>未確認・要確認</strong>は推測できない項目、<strong>対象外</strong>は製品の用途が異なる項目です。国・地域だけで品質や安全性を順位付けしていません。</p>${panels}<details class="pc-method" id="pc-identity-sources"><summary>比較表の出典と確認日（${sourceMap.size}件）</summary><p>確認：${escape(new Date(review.reviewedAt).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo',hour12:false}))}（日本時間）。未確認は、リンク先の当該型番の記載で確定できなかった項目です。</p><ol class="pc-source-list">${sources}</ol></details>`;
}
