const ARTICLE_CONTENT_RE = /<div\b[^>]*class=["'][^"']*\barticle-content\b[^"']*["'][^>]*>/i;
const TOKEN_RE = /<[^>]+>|[^<]+/g;
const IGNORED_TAGS = new Set(["code", "pre", "script", "style", "math", "svg"]);
const IGNORED_CLASS_RE = /(?:^|\s)(?:katex(?:-[\w-]+)?|math|mathjax)(?:\s|$)/i;

function decodeEntities(value) {
  return value.replace(/&ast;/gi, "*").replace(/&lowbar;/gi, "_")
    .replace(/&#(?:x2a|42);/gi, "*").replace(/&#(?:x5f|95);/gi, "_")
    .replace(/&lpar;/gi, "(").replace(/&rpar;/gi, ")").replace(/&num;/gi, "#")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}

function extractArticleContent(html) {
  const match = ARTICLE_CONTENT_RE.exec(html);
  if (!match) return null;
  const start = match.index + match[0].length;
  const divTagRe = /<\/?div\b[^>]*>/gi;
  divTagRe.lastIndex = start;
  let depth = 1;
  let tag;
  while ((tag = divTagRe.exec(html)) !== null) {
    if (/^<\/div/i.test(tag[0])) depth -= 1;
    else if (!/\/>$/.test(tag[0])) depth += 1;
    if (depth === 0) return html.slice(start, tag.index);
  }
  return html.slice(start);
}

function textNodesFromArticleHtml(articleHtml) {
  const nodes = [];
  const stack = [];
  for (const token of articleHtml.match(TOKEN_RE) ?? []) {
    if (!token.startsWith("<")) {
      if (!stack.some((item) => item.ignored)) nodes.push(decodeEntities(token));
      continue;
    }
    if (/^<!--/.test(token) || /^<!/.test(token)) continue;
    const closing = token.match(/^<\/\s*([\w:-]+)/);
    if (closing) {
      const name = closing[1].toLowerCase();
      for (let i = stack.length - 1; i >= 0; i -= 1) {
        const popped = stack.pop();
        if (popped.name === name) break;
      }
      continue;
    }
    const opening = token.match(/^<\s*([\w:-]+)/);
    if (!opening || /\/>$/.test(token)) continue;
    const name = opening[1].toLowerCase();
    const className = token.match(/\bclass=["']([^"']*)["']/i)?.[1] ?? "";
    stack.push({ name, ignored: IGNORED_TAGS.has(name) || IGNORED_CLASS_RE.test(className) });
  }
  return nodes;
}

const CHECKS = [
  { kind: "bold-asterisks", re: /\*\*[^*\r\n]+\*\*/g },
  { kind: "bold-underscores", re: /__[^_\r\n]+__/g },
  { kind: "heading-marker", re: /(?:^|[\r\n])\s{0,3}#{1,6}\s+\S[^\r\n]*/g },
  { kind: "markdown-link", re: /\]\([^\r\n)]*\)/g },
];

export function scanRenderedArticleHtml(html) {
  const articleHtml = extractArticleContent(html);
  if (articleHtml === null) return { articleFound: false, findings: [] };
  const findings = [];
  for (const text of textNodesFromArticleHtml(articleHtml)) {
    for (const { kind, re } of CHECKS) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(text)) !== null) {
        findings.push({
          kind,
          match: match[0].trim(),
          context: text.slice(Math.max(0, match.index - 45), match.index + match[0].length + 45).replace(/\s+/g, " ").trim(),
        });
      }
    }
  }
  return { articleFound: true, findings };
}

