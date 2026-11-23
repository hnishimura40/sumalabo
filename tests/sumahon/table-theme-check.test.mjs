import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {scanArticleTableFiles,scanTableThemeStyles} from '../../scripts/sumahon/table-theme-check.mjs';

test('Muse不具合: 透明背景の表・セル・子要素の黒固定を検出する',()=>{
 const r=scanTableThemeStyles('<table style={{background:"transparent",color:"#000"}}><tr><td style={{color:"black"}}><strong style={{color:"rgb(0, 0, 0)"}}>文字</strong></td></tr></table>');
 assert.equal(r.tables,1);assert.equal(r.findings.length,3);
});
test('明るい固定背景と暗いテーマ文字の組み合わせも検出する',()=>{
 const r=scanTableThemeStyles('<table><tr><td style="background-color:#fff;color:var(--fg)">料金</td></tr></table>');
 assert.deepEqual(r.findings.map(x=>x.property),['background-color']);
});
test('テーマ変数、継承、transparent、light-darkは許可する',()=>{
 assert.equal(scanTableThemeStyles('<table style={{background:"transparent",color:"var(--article-table-ink, #000)"}}><tr><th style="color:inherit;background:transparent">見出し</th><td style={{color:"light-dark(#000, #eee)"}}>本文</td></tr></table>').findings.length,0);
});
test('色以外の固定値やdata-style属性を誤検出しない',()=>{
 assert.equal(scanTableThemeStyles('<table data-style="color:#000" style={{width:"100%",boxShadow:"none"}}><tr><td style={{textAlign:"right",whiteSpace:"nowrap"}}>1円</td></tr></table>').findings.length,0);
});
test('コード例、コメント、表の外のスタイルを検査対象にしない',()=>{
 const s='```html\n<table style="color:#000"></table>\n```\n<!-- <table style="color:black"></table> -->\n<pre><table style="color:#fff"></table></pre><p style="color:#000">説明</p>';
 assert.equal(scanTableThemeStyles(s).findings.length,0);
});
test('単引用符のHTMLと引用符付きMDXプロパティ、importantを検出する',()=>{
 const r=scanTableThemeStyles('<table>\n<tr><td style=\'color:white !important\'>A</td><td style={{"backgroundColor": "white"}}>B</td></tr></table>');
 assert.equal(r.findings.length,2);assert.equal(r.findings[0].line,2);
});
test('複数の表と背景省略のセルも漏らさない',()=>{
 const r=scanTableThemeStyles('<table><td style="color:#111">A</td></table><table><th style={{color:"#fff"}}>B</th></table>');
 assert.equal(r.tables,2);assert.equal(r.findings.length,2);
});

test('コンポーネントから生成されたHTMLも走査し、MDXだけの検査で見逃さない',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sumalabo-table-theme-'));
 try {
  fs.mkdirSync(path.join(root,'content/articles'),{recursive:true});
  fs.mkdirSync(path.join(root,'dist/articles/comparison'),{recursive:true});
  fs.writeFileSync(path.join(root,'content/articles/comparison.mdx'),'<ProductComparison />');
  fs.writeFileSync(path.join(root,'dist/articles/comparison/index.html'),'<article><table><td style="color:#000">生成されたセル</td></table></article>');
  assert.equal(scanArticleTableFiles(root,{source:true}).findings.length,0);
  const result=scanArticleTableFiles(root,{dist:true});
  assert.equal(result.articlesWithTables,1);assert.equal(result.tables,1);
  assert.equal(result.findings.length,1);
  assert.equal(result.findings[0].file,path.join('dist/articles/comparison/index.html'));
  fs.writeFileSync(path.join(root,'dist/articles/comparison/index.html'),'<table><td style="color:var(--article-table-ink)">修正済み</td></table>');
  assert.equal(scanArticleTableFiles(root,{dist:true}).findings.length,0);
 } finally {assert.equal(path.dirname(root),path.resolve(os.tmpdir()));fs.rmSync(root,{recursive:true,force:true});}
});

test('ビルド済みHTMLが存在しない場合は成功扱いにしない',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'sumalabo-table-theme-'));
 try {assert.throws(()=>scanArticleTableFiles(root,{dist:true}),/先にビルド/);}
 finally {assert.equal(path.dirname(root),path.resolve(os.tmpdir()));fs.rmSync(root,{recursive:true,force:true});}
});
