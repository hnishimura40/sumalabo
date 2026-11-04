const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function isPrimarySource(source,domains){
  if(source?.type!=='primary'||source.verified!==true||!source.publisher||!source.basis||!/^\d{4}-\d{2}-\d{2}$/.test(source.date)||(!Number.isFinite(Date.parse(source.date))||new Date(source.date).toISOString().slice(0,10)!==source.date)||!['published','checked'].includes(source.dateType))return false;
  try{const u=new URL(source.url);return u.protocol==='https:'&&!u.username&&!u.password&&domains.some(d=>u.hostname===d||u.hostname.endsWith('.'+d));}catch{return false;}
}
export function primarySources(model,ids,domains){
  if(!Array.isArray(ids)||!ids.length)throw Error('primary_source_badge_required');
  return ids.map(id=>{const source=model.sources.find(s=>s.id===id);if(!isPrimarySource(source,domains))throw Error('primary_official_source_required:'+id);return source;});
}
export function sourceBadges(model,ids,domains){return primarySources(model,ids,domains).map(s=>`<a class="ai-source" href="${esc(s.url)}" data-source-id="${esc(s.id)}">${esc(s.publisher)} ${s.dateType==='checked'?'確認 ':''}${esc(s.date)}</a>`).join(' ');}
