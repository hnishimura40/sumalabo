import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fixture} from '../fixtures/ai-v2-fixture.mjs';
import {renderAiV2Html} from '../../scripts/automation/ai-article-v2.mjs';
const source=fs.readFileSync(new URL('../../src/components/DrainageTracking.astro',import.meta.url),'utf8').match(/<script define:vars=\{\{ targetSlugs \}\}>([\s\S]*?)<\/script>/)[1];
function harness(){const events=[],handlers={};vm.runInNewContext(source,{targetSlugs:['usb-c-charger-comparison'],window:{gtag:(...args)=>events.push(args)},location:{pathname:'/articles/test-ai/'},document:{addEventListener:(type,fn)=>handlers[type]=fn}});return {events,click(attrs,{type='click',button=0}={}){const a={getAttribute:key=>attrs[key]??null,closest:()=>({getAttribute:()=> 'comparison:usb-charger'})};handlers[type]({type,button,target:{closest:()=>a}});}};}
test('道具カードは遷移元・遷移先、価格ボタンは店舗・モデル・カテゴリを送る',()=>{
 const h=harness();h.click({'data-drainage':'ai_tools','data-drainage-target':'usb-c-charger-comparison'});
 assert.equal(h.events[0][1],'internal_drainage');assert.deepEqual({...h.events[0][2]},{lane:'ai_tools',target:'usb-c-charger-comparison',from_path:'/articles/test-ai/',interaction:'click'});
 h.click({'data-price-store':'rakuten','data-price-model':'ACDC-PD12565BK'});assert.equal(h.events[1][1],'comparison_price_click');assert.equal(h.events[1][2].category,'usb-charger');assert.equal(h.events[1][2].store,'rakuten');assert.equal(h.events[1][2].model,'ACDC-PD12565BK');
 h.click({'data-price-store':'amazon','data-price-model':'ACDC-PD12565BK'},{type:'auxclick',button:2});assert.equal(h.events.length,2);
 h.click({'data-price-store':'amazon','data-price-model':'ACDC-PD12565BK'},{type:'auxclick',button:1});assert.equal(h.events.length,3);assert.equal(h.events[2][2].store,'amazon');
});
test('描画されるAI道具カードには計測先slugが付く',()=>{
 const m=fixture();m.tags=['スマートホーム'];const registry={categories:{'wifi-router':{status:'published',imageVerified:true,href:'/articles/router-comparison/',headline:'1Gbpsの入口がある1台',model:'test model',imageUrl:'https://tshop.r10s.jp/test/item.jpg',issue:'2026.11'}}};
 assert.match(renderAiV2Html(m,registry),/data-drainage="ai_tools" data-drainage-target="router-comparison"/);
});
