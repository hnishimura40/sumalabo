// Read-only release verification for the permanent guide, including crawler discovery.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createHash} from 'node:crypto';
const args=Object.fromEntries(process.argv.slice(2).map(a=>a.replace(/^--/,'').split('=')));
const base=(args['base-url']||'https://sumalabo.com').replace(/\/$/,'');
const production=base==='https://sumalabo.com';
if(!/^https:\/\/(sumalabo\.com|[a-z0-9-]+\.sumalabo\.pages\.dev)$/.test(base))throw Error('Expected the production site or its preview');
const publication=JSON.parse(readFileSync('src/data/ai-guide-publication.json','utf8'));
const sources=JSON.parse(readFileSync('src/data/ai-logo-sources.json','utf8'));
const get=async path=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(20000),redirect:'follow'});return {status:r.status,headers:r.headers,text:await r.text()};};
const checks={};
const [home,hub,robots,sitemap]=await Promise.all(['/', '/ai/', '/robots.txt','/sitemap-0.xml'].map(get));
const build=(hub.text.match(/<meta[^>]+name="sumalabo-build"[^>]+content="([^"]+)"/)||[])[1];
checks.build=Boolean(build)&&home.text.includes(`name="sumalabo-build" content="${build}"`)&&(!args['expected-commit']||build===args['expected-commit'].slice(0,12));
const graph=h=>[...h.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>{const j=JSON.parse(m[1]);return j['@graph']||[j];});
const payload=JSON.parse(hub.text.match(/<script[^>]+id="ai-guide-directory-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const routes=['/ai/',...payload.sections.map(s=>`/ai/${s.slug}/`),'/ai/benchmarks/','/ai/tests/'];
checks.homeEntry=home.status===200&&home.text.includes('data-ai-home-entry')&&home.text.indexOf('data-ai-home-entry')<home.text.indexOf('class="lead-hero"');
checks.homeServiceLinks=payload.featured.every(id=>home.text.includes(`href="/ai/#major-detail-${id}"`));
checks.robots=robots.status===200&&/^Allow:\s*\//m.test(robots.text)&&!/^Disallow:\s*\/(?:ai\/?)?\s*$/m.test(robots.text)&&robots.text.includes('Sitemap: https://sumalabo.com/sitemap.xml');
checks.sitemap=sitemap.status===200&&routes.every(route=>sitemap.text.includes(`<loc>https://sumalabo.com${route}</loc>`));
checks.stableLastmod=routes.every(route=>{const block=sitemap.text.split('<url>').find(b=>b.includes(`<loc>https://sumalabo.com${route}</loc>`));return block?.includes(`<lastmod>${publication.dateModified}T00:00:00.000Z</lastmod>`);});
checks.hubMetadata=hub.text.includes(`<title>${publication.title} | すまラボ</title>`)&&hub.text.includes(`content="${publication.description}"`);
const collection=graph(hub.text).find(n=>n['@type']==='CollectionPage');
checks.hubSchema=collection?.dateModified===publication.dateModified&&collection?.mainEntity?.numberOfItems===6&&collection.mainEntity.itemListElement.map(i=>i.name).join('|')==='Gemini|ChatGPT|Claude|Grok|Copilot|Muse';
checks.freePaidSummaries=(hub.text.match(/data-free-summary=/g)||[]).length===6&&(hub.text.match(/data-paid-summary=/g)||[]).length===6;
const benchmark=await get('/data/ai-benchmarks/current.json');
const expectedBenchmark=readFileSync('public/data/ai-benchmarks/current.json','utf8');
checks.currentBenchmark=benchmark.status===200&&benchmark.text===expectedBenchmark&&(hub.text.match(/data-frontier-benchmark=/g)||[]).length===JSON.parse(expectedBenchmark).rows.length;
await Promise.all(routes.map(async route=>{
 const page=route==='/ai/'?hub:await get(route);
 const headerRobots=page.headers.get('x-robots-tag')||'';
 // Cloudflare intentionally excludes preview hosts. Production must remain indexable.
 const headerAllowed=!/noindex|nofollow/i.test(headerRobots)||(!production&&headerRobots.toLowerCase()==='noindex');
 checks[route]=page.status===200&&page.text.includes(`<link rel="canonical" href="https://sumalabo.com${route}"`)&&headerAllowed&&!/<meta[^>]+name="robots"[^>]+content="[^"]*(noindex|nofollow)/i.test(page.text)&&page.text.includes('href="/ai/"')&&graph(page.text).some(n=>n['@type']==='BreadcrumbList');
}));
await Promise.all(sources.map(async source=>{
 const r=await fetch(base+source.path,{signal:AbortSignal.timeout(20000)});const bytes=Buffer.from(await r.arrayBuffer());
 checks[source.path]=r.status===200&&createHash('sha256').update(bytes).digest('hex')===source.sha256;
}));
const result={at:new Date().toISOString(),base,production,build,ok:Object.values(checks).every(Boolean),checks,google:{strategy:'crawlable_internal_links_and_robots_sitemap',previewNoindexExpected:!production,indexingConfirmed:false,searchConsoleApiEnabled:false}};
if(args.output){mkdirSync(dirname(args.output),{recursive:true});writeFileSync(args.output,JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;
