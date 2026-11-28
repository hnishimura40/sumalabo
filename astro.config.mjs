import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import aiGuidePublication from "./src/data/ai-guide-publication.json" with { type: "json" };
import { siteConfig } from "./src/config/site.ts";

// サイト内検索の索引（Pagefind）を astro build の直後に dist/pagefind/ へ生成する。
// package.json の build（astro build）を変えずに済むので、夜間runや
// deploy:production の build 手順はそのまま通る。
// 索引の対象は記事ページの data-pagefind-body（タイトルh1と本文）だけ。
// siteConfig.siteSearch=false なら何もしない。
// 索引生成に失敗しても記事公開（主契約）を止めないよう、build は失敗させず
// エラーをログに残す（検索ページ側は「検索を準備できませんでした」を表示する）。
function sitePagefind() {
  return {
    name: "sumalabo-pagefind",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        if (!siteConfig.siteSearch) {
          logger.info("siteSearch=false: Pagefind の索引生成をスキップ");
          return;
        }
        const outDir = fileURLToPath(dir);
        const started = Date.now();
        let pagefind;
        try {
          pagefind = await import("pagefind");
          const { index, errors } = await pagefind.createIndex({});
          if (!index) throw new Error(errors.join("\n"));
          const added = await index.addDirectory({ path: outDir });
          if (added.errors.length) throw new Error(added.errors.join("\n"));
          const written = await index.writeFiles({ outputPath: path.join(outDir, "pagefind") });
          if (written.errors.length) throw new Error(written.errors.join("\n"));
          logger.info(`Pagefind: ${added.page_count} ページを索引化 (${Date.now() - started}ms)`);
        } catch (error) {
          logger.error(`Pagefind の索引生成に失敗（build は継続）: ${error?.message || error}`);
        } finally {
          await pagefind?.close?.();
        }
      },
    },
  };
}

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
        if (new URL(item.url).pathname.startsWith('/ai/')) {
          // AIガイドは意味のある更新日を正本に持つ。無関係な記事のビルドで更新しない。
          item.lastmod = new Date(aiGuidePublication.dateModified).toISOString();
        } else if (m && articleLastmod.has(m[1])) {
          item.lastmod = articleLastmod.get(m[1]).toISOString();
        } else {
          // 固定ページ・一覧ページはビルド時刻
          item.lastmod = buildTime.toISOString();
        }
        return item;
      },
    }),
    sitePagefind(),
  ],
});
