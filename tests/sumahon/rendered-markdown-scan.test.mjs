import test from "node:test";
import assert from "node:assert/strict";
import { scanRenderedArticleHtml } from "../../scripts/sumahon/rendered-markdown-scan.mjs";

function article(body) {
  return `<html><body><div class="outside">**outside**</div><div class="article-content">${body}</div></body></html>`;
}

test("過去事例の生Markdown強調を検出する", () => {
  const result = scanRenderedArticleHtml(article("<p>禁止は**20.6％**でした。</p>"));
  assert.equal(result.articleFound, true);
  assert.deepEqual(result.findings.map((item) => item.kind), ["bold-asterisks"]);
  assert.equal(result.findings[0].match, "**20.6％**");
});

test("強調・見出し・リンクの未変換記法を本文だけで検出する", () => {
  const result = scanRenderedArticleHtml(article("<p>__強調__</p><p>## 生見出し</p><p>[案内](https://example.com)</p>"));
  assert.deepEqual(result.findings.map((item) => item.kind), ["bold-underscores", "heading-marker", "markdown-link"]);
});

test("正しく変換済みのHTMLとコード・数式内の記号は除外する", () => {
  const result = scanRenderedArticleHtml(article([
    "<p><strong>20.6％</strong></p>",
    "<pre><code>**sample** __value__ [x](url)</code></pre>",
    "<span class=\"katex\">__x__ ** y **</span>",
  ].join("")));
  assert.deepEqual(result.findings, []);
});

