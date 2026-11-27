import { readFileSync,readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const read=route=>readFileSync('dist'+route+'index.html','utf8');
const json=(html,id)=>JSON.parse(html.match(new RegExp('<script[^>]+id="'+id+'"[^>]*>([\\s\\S]*?)<\\/script>'))[1]);
const html=read('/ai/');const payload=json(html,'ai-guide-directory-data');
const currentBenchmark=JSON.parse(readFileSync('public/data/ai-benchmarks/current.json'));const validDate=date=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&date<=new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'});
assert.equal(payload.entries.length,35);assert.equal(new Set(payload.entries.map(e=>e.id)).size,35);
assert.equal(payload.sections.length,12);assert.equal((html.match(/<table/g)||[]).length,4,'Hub contains separate free, paid, service/model and benchmark tables');
assert.ok(!html.includes('このガイドでは未確認')&&!html.includes('制作機能ごとに確認'));
assert.equal((html.match(/<tr[^>]*data-capability=/g)||[]).length,14);
assert.equal((html.match(/<td[^>]*data-capability-status=/g)||[]).length,84);
const planTables=Object.fromEntries([...html.matchAll(/<table[^>]*data-plan-table="(free|paid)"[^>]*>([\s\S]*?)<\/table>/g)].map(m=>[m[1],m[2]]));
for(const plan of ['free','paid']){
 assert.ok(planTables[plan]);assert.equal((planTables[plan].match(/data-capability-status=/g)||[]).length,42);
 assert.equal((planTables[plan].match(/<tr[^>]*data-capability=/g)||[]).length,7);
 assert.equal((planTables[plan].match(/class="capability-description"[^>]*href="https:\/\//g)||[]).length,42);
}
assert.notEqual(planTables.free,planTables.paid);
const planCell=(plan,axis,id)=>planTables[plan].match(new RegExp('<tr[^>]*data-capability="'+axis+'"[^>]*>([\\s\\S]*?)</tr>'))[1].match(new RegExp('<td[^>]*data-featured-column="'+id+'"[^>]*>([\\s\\S]*?)</td>'))[0];
assert.match(planCell('free','video','gemini'),/data-capability-status="no"/);
assert.match(planCell('paid','video','gemini'),/data-capability-status="yes"/);
assert.match(planCell('free','automation','chatgpt'),/data-capability-status="no"/);
assert.match(planCell('paid','automation','chatgpt'),/data-capability-status="yes"/);
assert.match(planCell('paid','video','grok'),/Premium/);
assert.match(planCell('free','automation','muse'),/data-capability-status="yes"/);
assert.match(planCell('free','automation','gemini'),/data-capability-status="yes"/);
const typeCards=[...html.matchAll(/<article[^>]*data-ai-type="([^"]+)"[^>]*>([\s\S]*?)<\/article>/g)];
assert.deepEqual(typeCards.map(m=>m[1]),['chat','agent','companion']);
for(const card of typeCards){assert.ok(card[2].includes('ひまり')&&card[2].includes('らぼまる'));assert.equal((card[2].match(/class="talk /g)||[]).length,2);}
assert.equal((html.match(/<tr[^>]*data-service-model=/g)||[]).length,6);
assert.equal((html.match(/<tr[^>]*data-frontier-benchmark=/g)||[]).length,currentBenchmark.rows.length);
assert.equal((html.match(/<article[^>]*data-strength-panel=/g)||[]).length,6);
assert.equal((html.match(/data-free-summary=/g)||[]).length,6);assert.equal((html.match(/data-paid-summary=/g)||[]).length,6);
assert.ok(/<details[^>]*id="advanced-models"/.test(html));assert.ok(!/<details[^>]*id="advanced-models"[^>]*\sopen/.test(html));
assert.ok(html.indexOf('id="major-details"')<html.indexOf('id="advanced-models"'));assert.ok(!html.includes('>独自実測</a>'));

for(const name of readdirSync('public/data/ai-benchmarks/archive')){
 if(!name.endsWith('.json'))continue;
 const match=name.match(/^(\d{4}-\d{2}-\d{2})-([a-f0-9]{12})\.json$/);assert.ok(match,'Archive has a date and content hash');
 const raw=readFileSync('public/data/ai-benchmarks/archive/'+name);assert.equal(createHash('sha256').update(raw).digest('hex').slice(0,12),match[2],'Archived benchmark bytes must retain their recorded hash');assert.equal(JSON.parse(raw).checkedAt,match[1]);
}

const common=JSON.parse(readFileSync('public/data/ai-benchmarks/current.json'));assert.match(common.version,/^\d+(?:\.\d+)+$/);assert.match(common.checkedAt,/^\d{4}-\d{2}-\d{2}$/);assert.ok(common.rows.length>0);assert.ok(common.rows.every(r=>Number.isFinite(r.score)&&r.score>=0&&r.effort&&r.context&&r.model&&payload.featured.includes(r.serviceId)&&new URL(r.source).hostname==='artificialanalysis.ai'));assert.equal(new Set(common.rows.map(r=>[r.model,r.effort].join('/'))).size,common.rows.length);
assert.ok(common.rows.filter(r=>r.serviceId==='muse').every(r=>r.access.includes('無料')));

assert.deepEqual(payload.featured,['gemini','chatgpt','claude','grok','copilot','muse']);
assert.equal((html.match(/data-featured=/g)||[]).length,6);
assert.equal((html.match(/<input[^>]*data-featured-toggle/g)||[]).length,6);
assert.ok(html.indexOf('id="major"')<html.indexOf('id="more"'));
for(const id of payload.featured)assert.ok(html.includes('id="major-detail-'+id+'"'));
for(const slug of ['chat','research','images','video','voice'])assert.ok(payload.sections.find(s=>s.slug===slug).ids.includes('grok'));
for(const id of ['gemini','chatgpt','copilot'])assert.ok(payload.sections.find(s=>s.slug==='images').ids.includes(id));
const sitemap=readFileSync('dist/sitemap-0.xml','utf8');
const publication=JSON.parse(readFileSync('src/data/ai-guide-publication.json','utf8'));
const schema=page=>[...page.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{const j=JSON.parse(m[1]);return j['@graph']||[j];});
const home=read('/');assert.ok(home.includes('data-ai-home-entry'));assert.ok(home.indexOf('data-ai-home-entry')<home.indexOf('class="lead-hero"'));
for(const id of payload.featured)assert.ok(home.includes(`href="/ai/#major-detail-${id}"`));
assert.ok(html.includes(`<title>${publication.title} | すまラボ</title>`));
const collection=schema(html).find(n=>n['@type']==='CollectionPage');assert.equal(collection.mainEntity.numberOfItems,6);assert.equal(collection.dateModified,publication.dateModified);
const covered=new Set();const pages=[['/ai/',html]];
for(const section of payload.sections){
 assert.ok(html.includes('href="/ai/'+section.slug+'/"'));
 const route='/ai/'+section.slug+'/';const page=read(route);pages.push([route,page]);
 assert.ok(sitemap.includes('https://sumalabo.com'+route));assert.equal(new Set(section.ids).size,section.ids.length);section.ids.forEach(id=>covered.add(id));
 if(section.slug==='models')continue;
 const cat=json(page,'ai-comparison-data');assert.deepEqual(cat.entries.map(e=>e.id),section.ids);
 assert.equal((page.match(/data-entry=/g)||[]).length,section.ids.length);
 assert.ok(cat.entries.every(e=>e.kind!=='モデル群'));assert.ok(cat.axes.length<=2);
 for(const e of cat.entries){assert.ok(e.priceEntrance,'Missing concise price for '+e.id);assert.equal(e.axes.length,cat.axes.length);assert.ok(page.includes('id="detail-'+e.id+'"'));}
}
assert.deepEqual([...covered].sort(),payload.entries.map(e=>e.id).sort());
for(const e of payload.entries){assert.ok(e.country&&e.countryNote&&e.japanStatus&&e.cost&&e.availability,e.id);assert.ok(validDate(e.checkedAt));for(const s of e.sources)assert.equal(new URL(s.url).protocol,'https:');}
assert.equal(payload.entries.find(e=>e.id==='duet').japanStatus,'unavailable');assert.equal(payload.entries.find(e=>e.id==='muse').japanStatus,'available');assert.ok(payload.entries.find(e=>e.id==='elevenlabs').features.video);
const models=read('/ai/models/'),bench=read('/ai/benchmarks/'),tests=read('/ai/tests/');pages.push(['/ai/benchmarks/',bench],['/ai/tests/',tests]);
assert.equal((models.match(/data-model-country=/g)||[]).length,10);
assert.equal((bench.match(/data-benchmark-group/g)||[]).length,6);
const archivedGroups=bench.match(/<article[^>]*data-benchmark-group[^>]*>[\s\S]*?<\/article>/g)||[];assert.equal(archivedGroups.reduce((n,g)=>n+(g.match(/<th scope="row"/g)||[]).length,0),13);
assert.equal((bench.match(/data-frontier-benchmark=/g)||[]).length,currentBenchmark.rows.length);
assert.ok(bench.includes('Terminal-Bench 4.1')&&bench.includes('65.8% ±3.1%'));
assert.ok(!tests.includes('id="models"')&&!models.includes('id="measurements"'));
for(const [route,page]of pages){assert.ok(page.includes('https://sumalabo.com'+route));assert.ok(!/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/.test(page));assert.ok(schema(page).some(n=>n['@type']==='BreadcrumbList'));const block=sitemap.split('<url>').find(b=>b.includes(`<loc>https://sumalabo.com${route}</loc>`));assert.ok(block?.includes(`<lastmod>${publication.dateModified}T00:00:00.000Z</lastmod>`));const ids=[...page.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(ids.length,new Set(ids).size,route+' duplicate ids');}
const protocol=JSON.parse(readFileSync('public/data/ai-eval-20261115/protocol.json'));
assert.equal(createHash('sha256').update(protocol.prompt).digest('hex'),protocol.promptSha256);
const stable=v=>JSON.stringify(v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
const google=JSON.parse(readFileSync('public/data/ai-eval-20261115/results.json')).results;
const codex=JSON.parse(readFileSync('public/data/ai-eval-20261115/codex-results.json')).results;
assert.equal(google.length,9);assert.equal(codex.length,3);
for(const r of [...google,...codex]){const answer=JSON.parse(r.output);const score=protocol.cases.filter(c=>stable(answer[c.id])===stable(c.expected)).length;assert.equal(score,r.passed);assert.equal(r.checks.length,6);if(r.httpStatus)assert.equal(r.httpStatus,200);if(r.toolCalls!==undefined)assert.equal(r.toolCalls,0);}
const sums=JSON.parse(readFileSync('public/data/ai-eval-20261115/summary.json'));assert.equal(sums.length,4);
for(const s of sums){const rows=[...google,...codex].filter(r=>r.model===s.model);assert.equal(rows.length,s.trials);assert.equal(rows.reduce((n,r)=>n+r.passed,0),s.passed);assert.equal(rows.map(r=>r.elapsedMs).sort((a,b)=>a-b)[1],s.medianMs);}
console.log(JSON.stringify({ok:true,catalog:35,individualModels:10,benchmarkFamilies:6,benchmarkSnapshots:13,measuredModels:4,trials:12,checks:72,canonical:'/ai/',categoryPages:12,benchmarkGroups:6,capabilityCells:84,planTables:2,typeConversations:3,serviceModelRows:6,commonBenchmarkRows:currentBenchmark.rows.length,strengthConversations:6}));
