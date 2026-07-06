import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";

// sitemap の lastmod 用: 記事 slug → updated(なければ pubDate) の対応表を
// frontmatter から組み立てる（M3 SEO基盤）。固定ページはビルド時刻を lastmod にする。
function buildArticleLastmodMap() {
  const dir = path.resolve("./content/articles");
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))) {
    try {
      const raw = readFileSync(path.join(dir, f), "utf-8");
      const slug = (raw.match(/^slug:\s*"([^"]+)"/m) || [])[1];
      const updated = (raw.match(/^updated:\s*"([^"]+)"/m) || [])[1];
      const pubDate = (raw.match(/^pubDate:\s*"([^"]+)"/m) || [])[1];
      const date = updated || pubDate;
      if (slug && date && !Number.isNaN(Date.parse(date))) {
        map.set(slug, new Date(date));
      }
    } catch {
      // frontmatter が読めない記事は lastmod なしで sitemap に載る（安全側）
    }
  }
  return map;
}

const articleLastmod = buildArticleLastmodMap();
const buildTime = new Date();

export default defineConfig({
  site: "https://sumalabo.com",
  integrations: [
    mdx(),
    sitemap({
      // noindex の社内確認ページは sitemap に載せない
      filter: (page) => !page.includes("/design-preview/") && !page.includes("/review/"),
      serialize(item) {
        const m = item.url.match(/\/articles\/([^/]+)\/?$/);
        if (m && articleLastmod.has(m[1])) {
          item.lastmod = articleLastmod.get(m[1]).toISOString();
        } else {
          // 固定ページ・一覧ページはビルド時刻
          item.lastmod = buildTime.toISOString();
        }
        return item;
      },
    }),
  ],
});
