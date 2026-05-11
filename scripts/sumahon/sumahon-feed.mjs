// すまほん RSS / HTML から最新記事URLを取り出す。
//
// 出力: [{ url, title, publishedAt }] の配列（pubDate 降順）。
//
// 設計方針:
// - sumalabo は smhn.info の RSS を 1 次情報源にする (https://smhn.info/feed)
// - RSS が落ちている / 形式が変わった場合は HTML fallback で <a href="https://smhn.info/2026..."> を拾う
// - 本文や画像はここで取らない（fetchSource が担当）。URL の発見のみ。
// - すまほん本体に負荷をかけない: 単発 fetch、UA は識別可能、結果はキャッシュしない

import { decodeHtml } from "./utils.mjs";

const DEFAULT_RSS = "https://smhn.info/feed";
const DEFAULT_HTML = "https://smhn.info/";
const USER_AGENT = "sumalabo-watch/0.1 (+https://sumalabo.com)";

function pickTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return "";
  let inner = m[1].trim();
  const cdata = inner.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) inner = cdata[1];
  return decodeHtml(inner).trim();
}

function parseRss(xml) {
  const items = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const item = m[1];
    const link = pickTag(item, "link");
    const title = pickTag(item, "title");
    const pubDate = pickTag(item, "pubDate");
    if (link && /^https?:\/\/smhn\.info\//.test(link)) {
      items.push({
        url: link.replace(/\/$/, ""),
        title,
        publishedAt: pubDate || null,
        source: "rss",
      });
    }
  }
  return items;
}

function parseHtml(html) {
  const items = [];
  const seen = new Set();
  const linkRegex = /<a[^>]+href=["'](https:\/\/smhn\.info\/[0-9][^"']+)["'][^>]*>/gi;
  let m;
  while ((m = linkRegex.exec(html)) !== null) {
    const url = m[1].replace(/[#?].*$/, "").replace(/\/$/, "");
    // smhn.info の記事 URL は数字始まり (年月)
    if (!/^https:\/\/smhn\.info\/\d{6}/.test(url)) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({ url, title: "", publishedAt: null, source: "html" });
    if (items.length >= 30) break;
  }
  return items;
}

export async function fetchSumahonFeed({
  rssUrl = DEFAULT_RSS,
  htmlUrl = DEFAULT_HTML,
  preferHtmlFallback = true,
  timeoutMs = 12000,
} = {}) {
  const headers = {
    "user-agent": USER_AGENT,
    accept: "application/rss+xml, application/xml, text/xml, text/html",
  };
  const events = [];

  // RSS first
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(rssUrl, { headers, signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`RSS HTTP ${res.status}`);
    const xml = await res.text();
    const items = parseRss(xml);
    events.push({ type: "rss_fetch_ok", url: rssUrl, itemCount: items.length });
    if (items.length > 0) return { items, events, source: "rss" };
    events.push({ type: "rss_empty", url: rssUrl });
  } catch (e) {
    events.push({ type: "rss_fetch_failed", url: rssUrl, error: e.message });
  }

  if (!preferHtmlFallback) {
    return { items: [], events, source: "rss_only" };
  }

  // HTML fallback
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    const res = await fetch(htmlUrl, { headers, signal: ctl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTML HTTP ${res.status}`);
    const html = await res.text();
    const items = parseHtml(html);
    events.push({ type: "html_fallback_ok", url: htmlUrl, itemCount: items.length });
    return { items, events, source: "html" };
  } catch (e) {
    events.push({ type: "html_fallback_failed", url: htmlUrl, error: e.message });
    return { items: [], events, source: "none" };
  }
}
