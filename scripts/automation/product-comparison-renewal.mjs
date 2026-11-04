import {pickPolicy,verifiedValue,evaluatePicks,segmentFor,requiredPickFields} from './product-comparison-picks.mjs';
import {validateRenewalFacts,renderDialogue} from './product-comparison-identity.mjs';
const esc=v=>String(v??'').replace(/[&<>"'{}]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','{':'&#123;','}':'&#125;'}[c]));
const labels={price:'参考価格',domesticSupport:'国内窓口',wifiGeneration:'Wi-Fi規格',lanPortCount:'有線LAN口数',band5GhzMbps:'5GHz規格値（Mbps）',has6GHz:'6GHz帯',wanMaxGbps:'回線入口（Gbps）',band24GhzMbps:'2.4GHz規格値（Mbps）',usbCPortCount:'USB-C口数',pdSupported:'USB PD',ppsSupported:'PPS',pseMark:'PSE表示',simultaneousTotalW:'同時出力（W）',capacityWh:'容量（Wh）',recallStatus:'回収告知',airlineCarryOn:'機内持込条件',wearStyle:'装着方式',ancSupported:'ANC',multipointDevices:'マルチポイント台数',productType:'製品の用途',weightG:'重さ（g）',maxSinglePortW:'単ポート出力（W）',usbCOutputW:'USB-C出力（W）',batteryAncHours:'ANC時の電池（時間）'};
const label=field=>labels[field]||pickPolicy.common.requiredAxes.concat(pickPolicy.categories.flatMap(c=>[...c.requiredAxes,c.upperAxis])).find(a=>a.field===field)?.label||field;
const money=v=>Number.isFinite(v)?v.toLocaleString('ja-JP')+'円':'価格未確認';
export function renderRenewalComparison(review,snapshot,category,now=Date.now()){
  validateRenewalFacts(review,category,now);
  const rule=pickPolicy.categories.find(c=>c.id===category.id),evaluation=evaluatePicks(review,snapshot,category.id);
  const copy={
    'wifi-router':{glossary:'',map:'無線速度は規格値で、実際の速度ではありません。',achievement:'メッシュとは、複数の親機を連携して電波を届ける仕組みです。'},
    'usb-charger':{glossary:'USB-C（差し込み口の種類）を使います。W（給電できる電力の大きさ）を比べます。USB PDは機器に合う電力で充電する規格、PPSは電圧を細かく調整する機能です。PSEは電気用品安全法の表示で、安全性を無条件に保証するものではありません。',map:'単ポート出力と、複数台につないだときの出力配分は別に確認します。',achievement:'PSEなど必須条件の確認が済まない候補は、3枠への選出を保留します。'},
    'power-bank':{glossary:'USB-C（差し込み口の種類）を使います。Wh（ワット時）は電池にためられる電力量、W（給電できる電力の大きさ）を比べます。PSEは電気用品安全法の表示で、安全性を無条件に保証するものではありません。',map:'容量（Wh）だけで飛行機への持ち込み可否は決まりません。本体表示と利用便の規定を確認します。',achievement:'未確認の容量・PSE表示・回収告知を推測で補って選出しません。'},
    audio:{glossary:'ANC（周りの騒音を抑える機能）の有無を比べます。マルチポイントは複数の機器につないで切り替える機能。電池時間はメーカーの測定条件による公称値です。',map:'形や公称機能による比較です。音質・装着感・通話品質は当サイトで実測していません。',achievement:'ANCの有無や接続台数を比べています。音質や装着感の優劣を示す表ではありません。'}
  }[category.id];

  Object.assign(review,evaluation);
  const segmentLabel=value=>category.id==='wifi-router'?value+'Gbps':({'tws-canal':'カナル型',open:'オープン型',headphone:'ヘッドホン',wired:'有線'})[value]||value;
  const slotName=slot=>slot.name.replace('{topSegment}',String(rule.segmentAxis.order?.[0]||''));
  const product=id=>({...snapshot.products.find(p=>p.id===id),...review.products.find(p=>p.id===id)});
  const photo=p=>`<figure class="r-photo"><RakutenAffiliateImage imageUrl="${esc(p.image.imageUrl)}" rakutenUrl="${esc(p.image.productUrl)}" alt="${esc(p.image.variantNote||p.model+'の商品写真')}" productName="${esc(p.model)}" /><figcaption>${esc(p.image.variantNote||p.image.caption)}</figcaption></figure>`;
  const buttons=p=>`<ComparisonPriceButtons model="${esc(p.model)}" rakutenUrl="${esc(p.image.productUrl)}" price={${Number.isFinite(p.priceYen)?p.priceYen:'null'}} />`;
  const bars=p=>rule.positionBars.map(field=>{
    const value=field==='price'?p.priceYen:verifiedValue(p,field),peers=review.products.filter(q=>segmentFor(q,rule.segmentAxis)===segmentFor(p,rule.segmentAxis)).map(q=>field==='price'?product(q.id).priceYen:verifiedValue(q,field)).filter(n=>typeof n==='number'&&Number.isFinite(n));
    if(typeof value!=='number'||!peers.length)return `<li>${esc(label(field))}：[公式確認]</li>`;
    const max=Math.max(...peers),width=max>0?Math.max(2,Math.min(100,value/max*100)):0;
    return `<li><span>${esc(label(field))}</span><span class="r-bar"><span style="width:${width}%"></span></span><strong>${esc(field==='price'?money(value):value)}</strong></li>`;
  }).join('');
  const card=(slot,result,hero=false,representative=false)=>{
    const slotAttr=representative?'data-pick-representative':'data-pick-slot';
    if(result.representatives)return `<section class="r-pick" data-pick-slot="${slot.id}"><h3>${esc(slotName(slot))}</h3>${result.representatives.map(r=>card({...slot,name:segmentLabel(r.segment)},r,false,true)).join('\n')}</section>`;
    if(result.status==='none')return `<section class="r-pick" ${slotAttr}="${slot.id}"><h3>${esc(slotName(slot))}：今月は該当なし</h3><p>${esc(result.reason)}</p></section>`;
    const p=product(result.productId);
    const evidence=[...(slot.id==='default'?[rule.upperAxis.field]:[]),...result.evidence.filter(f=>typeof verifiedValue(p,f)==='number')].filter((f,i,a)=>a.indexOf(f)===i).slice(0,2);
    const facts=evidence.map(f=>{const v=verifiedValue(p,f);return `${label(f)}：${v===true?'対応':v===false?'非対応':v}`;});
    const claim=result.claim.split('。')[0];
    const image=`<div class="r-photo-stage">${photo(p)}${hero?`<div class="r-award" aria-hidden="true"><small>すまラボ</small><strong>今月の1台</strong><span>${snapshot.updatedOn.slice(0,7).replace('/','.')}</span></div>`:''}</div>`;
    const proof=`<ul class="r-reasons"><li><span class="r-ok">○</span> ${esc(facts[0]||'国内窓口の条件を確認')}</li><li><span class="r-ok">○</span> ${esc(facts[1]||'必須条件を確認')}・国内の保証窓口あり</li><li><span class="r-no">✕</span> ${esc(p.caution)}</li></ul>`;
    const copy=`<div class="r-card-copy"><p class="r-slot r-slot-${slot.id}">${esc(slotName(slot))}</p><${hero?'h2':'h3'} class="r-claim">${esc(claim)}</${hero?'h2':'h3'}><p class="r-product-name">${esc(p.model)}</p>${proof}${hero?`<div class="r-position"><h4>同じ${esc(segmentLabel(segmentFor(p,rule.segmentAxis)))}の段の中での位置</h4><ul class="r-bars">${bars(p)}</ul></div>`:''}${buttons(p)}<p class="r-price-note">価格.com取得時の参考最安値。リンク先の販売価格・送料・ポイントとは異なります。</p><p class="r-runner">${esc(result.runnerUp?.text||'次点なし')}</p></div>`;
    const difference=`<aside class="r-difference"><img src="/images/characters/labomaru_chart_icon.webp" alt="らぼまる" width="44" height="44" /><p><strong>ココに差が</strong> ${facts.length?esc(facts.join('、'))+'。':esc(segmentLabel(segmentFor(p,rule.segmentAxis)))+'を選ぶ人へ。'}${esc(p.suitableFor)}に向く条件です。</p></aside>`;
    return `<article class="r-pick ${hero?'r-featured':''}" ${slotAttr}="${slot.id}" id="product-${p.id}"><div class="r-card-grid">${image}${copy}</div>${difference}<details><summary>向いている人・注意点・価格</summary><p>${esc(p.suitableFor)}</p><p>${esc(p.caution)}</p>${buttons(p)}</details></article>`;
  };
  const selected=new Set(Object.values(review.picks).flatMap(p=>p.representatives?p.representatives.filter(r=>r.productId).map(r=>r.productId):p.productId?[p.productId]:[]));
  const prices=snapshot.products.map(p=>p.priceYen).filter(p=>Number.isFinite(p)&&p>0),min=Math.min(...prices),max=Math.max(...prices);
  const segments=rule.segmentAxis.order?.map(String)||rule.segmentAxis.bands.map(b=>b.label);
  const mapRows=segments.map(segment=>{
    const rows=snapshot.products.filter(r=>segmentFor(product(r.id),rule.segmentAxis)===segment&&Number.isFinite(r.priceYen)&&r.priceYen>0);
    return `<div class="r-map-row"><strong>${esc(segmentLabel(segment))}</strong><div class="r-map-track" style="height:${Math.max(150,rows.length*40)}px">${rows.map((r,index)=>{const x=r.priceYen&&max>min?Math.log(r.priceYen/min)/Math.log(max/min)*88:0;return `<a href="#product-${r.id}" class="r-dot ${selected.has(r.id)?'r-selected':''}" style="left:${x}%;top:${8+index*40}px">${esc(product(r.id).model)}<small>${money(r.priceYen)}</small></a>`;}).join('')}</div></div>`;
  }).join('');
  const chips=segments.map(segment=>`<div><strong>${esc(segmentLabel(segment))}</strong><ul>${snapshot.products.filter(r=>segmentFor(product(r.id),rule.segmentAxis)===segment).map(r=>`<li><a href="#product-${r.id}">${esc(product(r.id).model)} ／ ${money(r.priceYen)}</a></li>`).join('')}</ul></div>`).join('');
  const table=(columns,rows)=>`<div class="r-tablewrap" role="region" aria-label="横にスクロールして比較" tabindex="0"><table class="r-table"><thead><tr><th scope="col">製品名</th>${columns.map(c=>`<th scope="col">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(({id,cells,anchor})=>`<tr${anchor?' id="product-'+id+'"':''}><th scope="row">${anchor?photo(product(id)):''}<a href="#product-${id}">${esc(product(id).model)}</a></th>${cells.map(v=>`<td>${v}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const achievement=table([...rule.achievementColumns.map(field=>({label:label(field)})),{label:'上位軸'},{label:'外れた理由・こんな人に・価格'}],review.achievement.filter(r=>!r.selected).map(row=>({id:row.productId,anchor:true,cells:[...rule.achievementColumns.map(f=>{const p=product(row.productId),v=verifiedValue(p,f),axis=[...pickPolicy.common.requiredAxes,...rule.requiredAxes,rule.upperAxis].find(a=>a.field===f);return esc(v===undefined?(p.comparisonFacts[f]?.status==='not_applicable'?'対象外':'[公式確認]'):axis?[...row.required,row.upper].find(a=>a.field===f)?.pass?'○':'✕':typeof v==='boolean'?v?'○':'✕':String(v));}),verifiedValue(product(row.productId),rule.upperAxis.field)===undefined?(product(row.productId).comparisonFacts[rule.upperAxis.field]?.status==='not_applicable'?'対象外':'[公式確認]'):row.upper.pass?'○':'✕',`<p>${esc(row.reason)}</p><p>${esc(row.suitableFor)}</p>${buttons(product(row.productId))}`]})));
  const displayValue=(p,field)=>{const v=verifiedValue(p,field);return v===true?'あり':v===false?'なし':field==='wearStyle'?({'tws-canal':'カナル型',open:'オープン型',headphone:'ヘッドホン',wired:'有線'})[v]||p.comparisonFacts[field].value:p.comparisonFacts[field].value;};
  const members=(field,value)=>{
    const matching=review.products.filter(p=>displayValue(p,field)===value);
    if(matching.length===review.products.length)return '全10候補';
    if(matching.length===review.products.length-1)return review.products.filter(p=>displayValue(p,field)!==value).map(p=>esc(p.model)).join('・')+'を除く9候補';
    return matching.map(p=>esc(p.model)).join('・');
  };
  const commonNotes=[],groups=[...review.identity.groups].sort((a,b)=>Number(b.id.includes('origin'))-Number(a.id.includes('origin')));
  const themes=groups.map((group,i)=>{
    const groupNotes=[];
    if(group.id===groups.find(g=>!g.id.includes('origin'))?.id)group={...group,columns:[...group.columns,...requiredPickFields(rule).filter(f=>f!=='price'&&f!=='domesticSupport'&&!groups.some(g=>g.columns.some(c=>c.field===f))).map(field=>({field,label:label(field)}))]};
    if(i===0)group={...group,title:'メーカーの拠点・製造国・国内窓口'};
    const columns=group.columns.filter(c=>{
      const counts=new Map();for(const p of review.products){const value=displayValue(p,c.field);counts.set(value,(counts.get(value)||0)+1);}
      if([...counts.values()].some(n=>n>=3)){
        groupNotes.push(`<p><strong>${esc(c.label)}</strong>：${[...counts].map(([value])=>`${esc(value)}（${members(c.field,value)}）`).join('／')}</p>`);return false;
      }return true;
    });
    return `<section class="r-theme" id="r-theme-${i}" data-r-panel="${i}"><h3>${esc(group.title)}</h3><p>${esc(group.intro)}</p>${columns.length?table(columns,snapshot.products.map(p=>({id:p.id,cells:columns.map(c=>{const f=product(p.id).comparisonFacts[c.field];return `${esc(displayValue(product(p.id),c.field))}${f.status!=='verified'?'<small>'+esc(f.reason)+'</small>':''}`;})} ))):'<p>共通事項は表の下にまとめています。</p>'}<aside class="r-common">${groupNotes.join('')}</aside>${i===0?'<p>日本メーカー＝日本製ではない。</p>':''}</section>`;
  }).join('');
  const defaultSlot=rule.slots.find(s=>s.id==='default'),remaining=rule.slots.filter(s=>s.id!=='default');
  const footnotes=`<h2>選び方の脚注</h2><p>候補：${esc(snapshot.scope)}の上位10製品。更新日：${esc(snapshot.updatedOn)}、取得：${esc(snapshot.observedAt)}。${snapshot.priceCheckedAt?` 参考価格の再確認：${esc(snapshot.priceCheckedAt)}。`:""}</p><p>段は${esc(rule.segmentAxis.label)}。必須軸：${[...pickPolicy.common.requiredAxes,...rule.requiredAxes].map(a=>esc(a.label)).join('・')}。${rule.slots.map(s=>esc(slotName(s))+'：'+esc(s.id==='default'?'候補が最多の段で必須軸＋上位軸を満たす最安':s.id==='budget'?'必須軸を満たす最安':'カテゴリ固有の段・追加条件を満たす最安')).join('／')}。</p><p>実機測定・試用はしていません。広告提携の有無で枠や順位を変えません。参考最安値は取得時点の情報で、リンク先価格・送料・ポイント・在庫とは異なります。</p><details><summary>出典一覧・確認日</summary><p>確認：${esc(review.reviewedAt)}</p><a href="${esc(snapshot.sourceUrl)}">候補の取得元</a><ul>${[...new Map(review.products.flatMap(p=>Object.values(p.comparisonFacts).flatMap(f=>f.sources||[])).map(s=>[s.url,s])).values()].map(s=>`<li><a href="${esc(s.url)}">${esc(s.label)}</a></li>`).join('')}</ul></details>`;
  return `<section class="comparison-renewal" data-renewal-kind="comparison:${category.id}" data-renewal-version="2026-11-04"><ComparisonRenewalPresentation /><section class="r-summary"><h2>30秒で分かる結論</h2>${copy.glossary?`<p class="r-glossary">${esc(copy.glossary)}</p>`:''}<dl><div><dt>誰に関係ある？</dt><dd>${esc(review.editorial.audience)}</dd></div><div><dt>今のままでよい人</dt><dd>${esc(review.editorial.unaffected)}</dd></div><div><dt>まず見ること</dt><dd>まず自分の段（${esc(rule.segmentAxis.label)}）を決める</dd></div><div><dt>結局どれ</dt><dd>${rule.slots.map(s=>esc(slotName(s))+'：'+esc(review.picks[s.id].productId?product(review.picks[s.id].productId).model:review.picks[s.id].status==='none'?'今月は該当なし':'形ごとの代表')).join('／')}</dd></div></dl></section><h2 class="r-visually-hidden">今月の1台（迷ったらこれ）</h2>${card(defaultSlot,review.picks.default,true)}<h2 class="r-visually-hidden">残り2枠</h2><div class="r-picks">${remaining.map(s=>card(s,review.picks[s.id])).join('')}</div><h2>段×価格のマップ</h2><p>横軸は参考最安値の対数。価格や段が未確認の候補は達成表に残します。${esc(copy.map)}</p><div class="r-map">${mapRows}</div><div class="r-chips">${chips}</div><h2>残りの候補の達成表</h2><p>${esc(copy.achievement)}</p>${achievement}<h2>全候補のテーマ別比較</h2><div class="r-tabs" role="tablist" aria-label="比較テーマ">${groups.map((g,i)=>`<button type="button" role="tab" data-r-tab="${i}" aria-controls="r-theme-${i}" aria-selected="${i===0}">${esc(i===0?'メーカーの拠点・製造国・国内窓口':g.title)}</button>`).join('')}</div>${themes}${footnotes}</section>`;
}
