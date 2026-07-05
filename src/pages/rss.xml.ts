// /rss.xml — RSSフィード（M3 SEO基盤）。要約+リンクのみ（全文は載せない）。新着20件。
// 依存ライブラリなしの手書きXML（@astrojs/rss 不使用でビルド依存を増やさない）。
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSortedVisibleArticles, getArticlePublicTime } from "../lib/articles";
import { siteConfig } from "../config/site";

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async () => {
  const articles = getSortedVisibleArticles(await getCollection("articles")).slice(0, 20);

  const items = articles
    .map((entry) => {
      const url = `${siteConfig.siteUrl}/articles/${entry.data.slug}/`;
      const pub = new Date(getArticlePublicTime(entry)).toUTCString();
      return [
        "    <item>",
        `      <title>${escapeXml(entry.data.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${pub}</pubDate>`,
        `      <description>${escapeXml(entry.data.description)}</description>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(siteConfig.siteName)}</title>`,
    `    <link>${siteConfig.siteUrl}/</link>`,
    `    <description>${escapeXml(siteConfig.siteDescription)}</description>`,
    "    <language>ja</language>",
    `    <atom:link href="${siteConfig.siteUrl}/rss.xml" rel="self" type="application/rss+xml" />`,
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
};
