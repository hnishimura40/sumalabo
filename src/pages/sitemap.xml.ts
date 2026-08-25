import type { APIRoute } from "astro";
import { siteConfig } from "../config/site";

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Stable conventional alias. @astrojs/sitemap continues to own sitemap-0.xml
// and its per-article lastmod values; this index lets crawlers use /sitemap.xml.
export const GET: APIRoute = () => {
  const child = `${siteConfig.siteUrl}/sitemap-0.xml`;
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <sitemap>",
    `    <loc>${escapeXml(child)}</loc>`,
    `    <lastmod>${new Date().toISOString()}</lastmod>`,
    "  </sitemap>",
    "</sitemapindex>",
  ].join("\n");
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8" } });
};
