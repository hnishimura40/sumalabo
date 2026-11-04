import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {fixture} from '../fixtures/ai-v2-fixture.mjs';
import {aiV2Mdx} from '../../scripts/automation/ai-article-v2.mjs';
import {runHealthCheck} from '../../scripts/automation/chatgpt-response-health.mjs';
import {responseTemplate} from '../../scripts/automation/ai-v2-response-health.mjs';
import {mergePr} from '../../scripts/automation/auto-phase-b.mjs';
import {newState} from '../../scripts/automation/phase-a-orchestrator.mjs';
import {isAiV2,aiPolicy} from '../../scripts/automation/ai-article-v2.mjs';
import {generateArticleBrief} from '../../scripts/sumahon/generate-article-brief.mjs';
function article(){const m=fixture();m.sources.push({...m.sources[0],id:'official2',url:'https://blog.google/products/another-test-fixture/'});for(const c of m.changes)c.text+='対象の画面が表示された場合に、現在提供されている機能を選びます。提供予定の内容と、今日実際に選べる内容を分けて読み、対象地域や契約条件が自分に合う場合だけ設定を変更します。'.repeat(4);return m;}
const plan=`## 演出ブロック
- 衣装：テーマに合わせた家庭用ルータを設定するベスト
- 小道具：スマホとルータ、比較条件を書いたメモ
- 手・小道具：壊れにくい手を自然に描く。開いた手を小さめにし、片手を軽く添える自然な構図。
- ポーズ：スマホの提供条件を二人で見比べる
- 背景：明るい家庭の机、実際の設定場面
- 表情：条件の違いを発見して納得
- 演出根拠：日本の利用条件を自分の画面で確かめる記事
- 日付型判定：非該当
- 主要モチーフ：設定画面と読者の判断
- 直近10記事類型チェック：重複なし、主要な動きが異なる
## thumbnail
- 感情：利用条件の違いを発見する驚き
- 行動：スマホと対応条件のメモを見比べる
- 場面：家庭の机で自分が対象か調べる
- 手の動作：片手をメモに軽く添える。指の接写を避ける
- 構図：キャラの顔・手に干渉しない余白へ「日本で使える？」を画像と一体生成する。正本の顔と体型を維持する。
`;
test('v2のJSON本文は見出し数に依存せず10項目と本文量で検査し、旧記事の検査を維持',()=>{
 const raw=aiV2Mdx(article());const result=runHealthCheck({raw,step:'chatgpt_turn5_final',templateVersion:'ai-v2'});
 assert.equal(result.metrics.healthy,true,result.metrics.reasons.join(','));
 assert.equal(Object.keys(result.metrics.checks).length,10);
 assert.equal(runHealthCheck({raw,step:'chatgpt_turn5_final'}).metrics.healthy,false);
 const bad=article();bad.branches=[];assert.equal(runHealthCheck({raw:aiV2Mdx(bad),step:'chatgpt_turn5_final',templateVersion:'ai-v2'}).metrics.healthy,false);
});
test('v2のサムネのみ計画を受け入れ、演出不足と2枚目の本文図を止める',()=>{
 const check=raw=>runHealthCheck({raw,step:'chatgpt_turn6_slideplan',templateVersion:'ai-v2'});
 assert.equal(check(plan).metrics.healthy,true,check(plan).metrics.reasons.join(','));
 assert.equal(check(plan+'\n## slide01\n'+('条件を図で比較する説明。'.repeat(20))).metrics.healthy,true);
 assert.equal(check(plan+'\n## slide02\n図を追加').metrics.healthy,false);
 assert.equal(check(plan.replace('手・小道具','その他')).metrics.healthy,false);
 assert.match(check('## thumbnail\n空').retryPrompt,/旧8枚構成.*戻さない/);
});
test('CLIのテンプレート判定は当該出力先の状態だけを読み、無効化で旧形式へ戻る',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sumalabo-b7-'));try{
 fs.mkdirSync(path.join(root,'logs/article'),{recursive:true});fs.writeFileSync(path.join(root,'logs/article/test-ai.state.json'),JSON.stringify({theme:'生成AIの新しい条件'}));
 const output=path.join(root,'drafts/refinement/test-ai/final_article.md');
 assert.equal(responseTemplate(output,{root,enabled:true}),'ai-v2');assert.equal(responseTemplate(output,{root,enabled:false}),null);
 assert.equal(responseTemplate(path.join(root,'elsewhere/final_article.md'),{root,enabled:true}),null);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
async function mergeFixture({approved=false,failSource=false}={}){
 const calls=[],sha='b'.repeat(40);const result=await mergePr(404,false,{token:'test',approvalLookup:()=>approved?{approvedBy:'Hiro',approvedAt:'2026-11-04',version:'2026-11-04'}:null,fetchImpl:async(url,options={})=>{
 calls.push({url,options});if(url.includes('/contents/'))return {ok:!failSource,status:503,json:async()=>({encoding:'base64',content:Buffer.from(aiV2Mdx(article())).toString('base64')})};
 if(url.includes('/files?'))return {ok:true,json:async()=>[{filename:'content/articles/first-ai.mdx',status:'added'}]};
 return {ok:true,json:async()=>options.method==='PUT'?{merged:true}:{state:'open',draft:false,head:{sha}}};
 }});return {result,calls,sha};
}
test('未承認AI記事はmainへ入れず、承認後も検査した同一headだけをマージ',async()=>{
 const held=await mergeFixture();assert.equal(held.result.held,true);assert.match(held.result.reason,/first_publication_requires_hiro_approval:ai/);assert.equal(held.calls.some(c=>c.options.method==='PUT'),false);
 const allowed=await mergeFixture({approved:true});assert.equal(allowed.result.ok,true);assert.match(allowed.calls[2].url,new RegExp('ref='+allowed.sha));assert.equal(JSON.parse(allowed.calls.at(-1).options.body).sha,allowed.sha);
 const failed=await mergeFixture({approved:true,failSource:true});assert.equal(failed.result.ok,false);assert.equal(failed.calls.some(c=>c.options.method==='PUT'),false);
});
test('タイトルにAI語がなくても採用した型を状態へ保存し、ブリーフの旧構成と混在させない',()=>{
 const state=newState({slug:'general-news',theme:'日常の条件が変わった',templateVersion:'ai-v2'});assert.equal(isAiV2(state,true),true);assert.equal(isAiV2(state,false),false);assert.throws(()=>newState({slug:'x',theme:'x',templateVersion:'unknown'}));
 const brief=generateArticleBrief({source:{},classification:{topicCategory:'AI',tags:['生成AI']},generated:{slug:'x',title:'日常の条件が変わった'}});assert.equal(brief.templateVersion,'ai-v2');assert.deepEqual(brief.suggestedStructure,aiPolicy.blocks);assert.ok(!brief.suggestedStructure.includes('先に結論'));
});
