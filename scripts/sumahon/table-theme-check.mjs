// Static safety net for table color regressions. Actual theme contrast must
// also be measured in a browser: this scan does not evaluate the CSS cascade.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

function maskExamples(text) {
  return text.replace(/^(?:[ \t]*)(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1[^\n]*$/gm, m=>m.replace(/[^\n]/g,' '))
    .replace(/<!--[\s\S]*?-->|\{\/\*[\s\S]*?\*\/\}|<(pre|code|script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,m=>m.replace(/[^\n]/g,' '));
}

const PAINT_PROPERTIES=new Set(['color','background','background-color','backgroundcolor','fill','-webkit-text-fill-color','webkittextfillcolor']);
const themeValue=value=>/^(?:transparent|inherit|currentcolor|unset|revert|revert-layer)$/i.test(value)||/\b(?:var|light-dark)\s*\(/i.test(value);

export function scanTableThemeStyles(source) {
  const text=maskExamples(source),findings=[];
  const blocks=/<table\b[^>]*>[\s\S]*?<\/table\s*>/gi;
  for(const table of text.matchAll(blocks)) {
    const tags=/<[\w:-]+\b(?:[^<>"']|"[^"]*"|'[^']*')*>/g;
    for(const tag of table[0].matchAll(tags)) {
      const tagName=tag[0].match(/^<([\w:-]+)/)[1].toLowerCase();
      // Do not mistake a prose mention of `style` or an arbitrary data attribute
      // for the real style attribute. Both MDX object styles and HTML are used.
      const styles=[...tag[0].matchAll(/(?:\s)style\s*=\s*(?:\{\{([\s\S]*?)\}\}|"([^"]*)"|'([^']*)')/gi)];
      for(const style of styles) {
        const jsx=style[1]!==undefined,body=style[1]??style[2]??style[3];
        const properties=jsx?/(["']?)([\w-]+)\1\s*:\s*("[^"]*"|'[^']*'|[^,}]+)/g:/([\w-]+)\s*:\s*([^;]+)/g;
        for(const prop of body.matchAll(properties)) {
          const property=jsx?prop[2]:prop[1],raw=jsx?prop[3]:prop[2],value=raw.trim().replace(/^(["'])([\s\S]*)\1$/,'$2').replace(/\s*!important\s*$/i,'').trim();
          if(!PAINT_PROPERTIES.has(property.toLowerCase())||themeValue(value))continue;
          const offset=table.index+tag.index+style.index;
          findings.push({kind:'fixed-table-paint',line:text.slice(0,offset).split('\n').length,tag:tagName,property,value,message:`表の ${property} を固定値 ${value} にせず、テーマ変数・継承・transparent を使ってください。両モードの実表示も確認してください。`});
        }
      }
    }
  }
  return {tables:[...text.matchAll(/<table\b/gi)].length,findings};
}

export function scanArticleTableFiles(root,{source=false,dist=false}={}) {
  const results=[];
  if(source)for(const name of fs.readdirSync(path.join(root,'content/articles')).filter(n=>/\.mdx?$/.test(n)).sort()) {
    const file=path.join('content/articles',name),result=scanTableThemeStyles(fs.readFileSync(path.join(root,file),'utf8'));
    results.push({file,...result});
  }
  if(dist) {
    const articles=path.join(root,'dist/articles');
    if(!fs.existsSync(articles))throw Error('dist/articles がありません。先にビルドしてください。');
    for(const entry of fs.readdirSync(articles,{withFileTypes:true}).filter(e=>e.isDirectory()).sort((a,b)=>a.name.localeCompare(b.name))) {
      const file=path.join('dist/articles',entry.name,'index.html');if(!fs.existsSync(path.join(root,file)))continue;
      results.push({file,...scanTableThemeStyles(fs.readFileSync(path.join(root,file),'utf8'))});
    }
  }
  return {files:results.length,articlesWithTables:results.filter(x=>x.tables>0).length,tables:results.reduce((s,x)=>s+x.tables,0),findings:results.flatMap(r=>r.findings.map(f=>({file:r.file,...f})))};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  try {
    const result=scanArticleTableFiles(root,{source:args.includes('--source'),dist:args.includes('--dist')||!args.includes('--source')});
    console.log(JSON.stringify({ok:result.findings.length===0,...result}));
    if(result.findings.length)process.exitCode=1;
  }catch(error){console.error(error.message);process.exitCode=1;}
}
