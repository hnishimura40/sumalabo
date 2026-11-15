import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const html=readFileSync('dist/ai/index.html','utf8');
const payload=JSON.parse(html.match(/<script[^>]+id="ai-comparison-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
assert.equal(payload.entries.length,34);
assert.equal(new Set(payload.entries.map(e=>e.id)).size,34);
for(const e of payload.entries){assert.ok(e.country&&e.countryNote&&e.japanStatus&&e.cost&&e.availability,e.id);assert.equal(e.checkedAt,'2026-11-15');for(const s of e.sources)assert.equal(new URL(s.url).protocol,'https:');}
for(const id of ['muse','dots','gemini','claude','chatgpt','plamo','sarashina','exaone'])assert.ok(payload.entries.find(e=>e.id===id),id);
assert.ok(!payload.entries.find(e=>e.id==='muse').caution.includes('初版'));
assert.equal(payload.entries.find(e=>e.id==='duet').japanStatus,'unavailable');
assert.equal(payload.entries.find(e=>e.id==='muse').japanStatus,'available');
assert.ok(payload.entries.find(e=>e.id==='elevenlabs').features.video);
assert.equal((html.match(/data-model-country=/g)||[]).length,10);
assert.ok(html.includes('Terminal-Bench 4.1')&&html.includes('65.8% ±3.1%'));
assert.ok(html.includes('https://sumalabo.com/ai/'));
assert.ok(!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/.test(html));
assert.ok(readFileSync('dist/sitemap-0.xml','utf8').includes('https://sumalabo.com/ai/'));
const snapshotSection=html.slice(html.indexOf('id="benchmark-snapshots"'),html.indexOf('id="measurements"'));
assert.equal((snapshotSection.match(/<th scope="row"/g)||[]).length,13);
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,'duplicate HTML ids');
const protocol=JSON.parse(readFileSync('public/data/ai-eval-20261115/protocol.json'));
assert.equal(createHash('sha256').update(protocol.prompt).digest('hex'),protocol.promptSha256);
const stable=v=>JSON.stringify(v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const google=JSON.parse(readFileSync('public/data/ai-eval-20261115/results.json')).results;
const codex=JSON.parse(readFileSync('public/data/ai-eval-20261115/codex-results.json')).results;
assert.equal(google.length,9);assert.equal(codex.length,3);
for(const r of [...google,...codex]){const answer=JSON.parse(r.output);const score=protocol.cases.filter(c=>stable(answer[c.id])===stable(c.expected)).length;assert.equal(score,r.passed);assert.equal(r.checks.length,6);if(r.httpStatus)assert.equal(r.httpStatus,200);if(r.toolCalls!==undefined)assert.equal(r.toolCalls,0);}
const sums=JSON.parse(readFileSync('public/data/ai-eval-20261115/summary.json'));assert.equal(sums.length,4);
for(const s of sums){const rows=[...google,...codex].filter(r=>r.model===s.model);assert.equal(rows.length,s.trials);assert.equal(rows.reduce((n,r)=>n+r.passed,0),s.passed);assert.equal(rows.map(r=>r.elapsedMs).sort((a,b)=>a-b)[1],s.medianMs);}
console.log(JSON.stringify({ok:true,catalog:34,individualModels:10,benchmarkFamilies:6,benchmarkSnapshots:13,measuredModels:4,trials:12,checks:72,canonical:'/ai/'}));
