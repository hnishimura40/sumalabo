#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanRenderedArticleHtml } from "./sumahon/rendered-markdown-scan.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const articlesDir = path.resolve(root, process.argv[2] ?? "dist/articles");
if (!existsSync(articlesDir)) {
  console.error(`Article output directory does not exist: ${articlesDir}`);
  process.exit(2);
}

const results = [];
let checked = 0;
for (const entry of readdirSync(articlesDir, { withFileTypes: true }).filter((item) => item.isDirectory())) {
  const htmlPath = path.join(articlesDir, entry.name, "index.html");
  if (!existsSync(htmlPath)) continue;
  checked += 1;
  const scan = scanRenderedArticleHtml(readFileSync(htmlPath, "utf8"));
  if (!scan.articleFound) results.push({ slug: entry.name, kind: "article-content-missing", match: "", context: "" });
  else for (const finding of scan.findings) results.push({ slug: entry.name, ...finding });
}
console.log(JSON.stringify({ checked, findingCount: results.length, findings: results }, null, 2));
process.exit(results.length === 0 ? 0 : 1);

