#!/usr/bin/env node
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SEARCH_NOTIFY_CONFIG = JSON.parse(readFileSync(path.join(ROOT, "config", "search-notify.json"), "utf8"));

function parseArgs(argv) {
  const args = { slug: null, output: null, baseUrl: SEARCH_NOTIFY_CONFIG.siteUrl, endpoint: SEARCH_NOTIFY_CONFIG.indexNow.endpoint, dryRun: false };
  for (const value of argv) {
    if (value.startsWith("--slug=")) args.slug = value.slice(7).trim();
    else if (value.startsWith("--output=")) args.output = value.slice(9).trim();
    else if (value.startsWith("--base-url=")) args.baseUrl = value.slice(11).trim().replace(/\/+$/, "");
    else if (value.startsWith("--endpoint=")) args.endpoint = value.slice(11).trim();
    else if (value === "--dry-run") args.dryRun = true;
  }
  return args;
}

function stripCdata(value) {
  return String(value || "").replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function tag(block, name) {
  return stripCdata((block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i")) || [])[1]);
}

export function validateRssXml(xml, expectedArticleUrl) {
  const items = [...String(xml).matchAll(/<item>([\s\S]*?)<\/item>/gi)].map((match) => ({
    title: tag(match[1], "title"),
    link: tag(match[1], "link"),
    pubDate: tag(match[1], "pubDate"),
    description: tag(match[1], "description"),
  }));
  const requiredFields = items.length > 0 && items.every((item) => item.title && item.link && item.pubDate && item.description);
  const dates = items.map((item) => Date.parse(item.pubDate));
  const validDates = dates.every(Number.isFinite);
  const newestFirst = validDates && dates.every((value, index) => index === 0 || dates[index - 1] >= value);
  const expectedFirst = !expectedArticleUrl || items[0]?.link === expectedArticleUrl;
  return {
    ok: requiredFields && newestFirst && expectedFirst && items.length <= 50,
    itemCount: items.length,
    firstLink: items[0]?.link || null,
    firstTitle: items[0]?.title || null,
    requiredFields,
    newestFirst,
    expectedFirst,
  };
}

export function validateSitemapXml(xml, expectedArticleUrl) {
  const blocks = [...String(xml).matchAll(/<url>([\s\S]*?)<\/url>/gi)];
  const entries = blocks.map((match) => ({ loc: tag(match[1], "loc"), lastmod: tag(match[1], "lastmod") }));
  const article = entries.find((entry) => entry.loc === expectedArticleUrl);
  return {
    ok: Boolean(article && Number.isFinite(Date.parse(article.lastmod))),
    urlCount: entries.length,
    articleFound: Boolean(article),
    articleLastmod: article?.lastmod || null,
  };
}

export function buildIndexNowPayload(articleUrl, config = SEARCH_NOTIFY_CONFIG) {
  return {
    host: new URL(config.siteUrl).host,
    key: config.indexNow.key,
    keyLocation: new URL(config.indexNow.keyPath, config.siteUrl).toString(),
    urlList: [articleUrl],
  };
}

async function requestText(url, { fetchImpl, method = "GET", headers = {}, body = undefined, timeoutMs = 15_000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { method, headers, body, redirect: "follow", cache: "no-store", signal: controller.signal });
    return { status: response.status, ok: response.ok, url: response.url || url, text: await response.text() };
  } catch (error) {
    return { status: 0, ok: false, url, text: "", error: error?.name === "AbortError" ? "timeout" : error?.message || String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runSearchNotify({
  slug,
  baseUrl = SEARCH_NOTIFY_CONFIG.siteUrl,
  endpoint = SEARCH_NOTIFY_CONFIG.indexNow.endpoint,
  dryRun = false,
  fetchImpl = fetch,
  config = SEARCH_NOTIFY_CONFIG,
} = {}) {
  const startedAt = new Date().toISOString();
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(String(slug || ""))) {
    return { schemaVersion: 1, status: "warning", ok: false, reason: "invalid_slug", slug: slug || null, startedAt, finishedAt: new Date().toISOString(), steps: {} };
  }
  const site = baseUrl.replace(/\/+$/, "");
  const articleUrl = `${site}/articles/${slug}/`;
  const urls = {
    article: articleUrl,
    rss: new URL(config.rssPath, `${site}/`).toString(),
    sitemap: new URL(config.sitemapPath, `${site}/`).toString(),
    sitemapContent: new URL(config.sitemapContentPath, `${site}/`).toString(),
    key: new URL(config.indexNow.keyPath, `${site}/`).toString(),
  };
  const steps = {};

  const rssResponse = await requestText(urls.rss, { fetchImpl });
  const rssValidation = validateRssXml(rssResponse.text, articleUrl);
  steps.rss = { ok: rssResponse.status === 200 && rssValidation.ok, status: rssResponse.status, url: urls.rss, ...rssValidation };

  const sitemapAlias = await requestText(urls.sitemap, { fetchImpl });
  const sitemapContent = await requestText(urls.sitemapContent, { fetchImpl });
  const sitemapValidation = validateSitemapXml(sitemapContent.text, articleUrl);
  steps.sitemap = {
    ok: sitemapAlias.status === 200 && sitemapAlias.text.includes(urls.sitemapContent) && sitemapContent.status === 200 && sitemapValidation.ok,
    status: sitemapAlias.status,
    contentStatus: sitemapContent.status,
    url: urls.sitemap,
    contentUrl: urls.sitemapContent,
    ...sitemapValidation,
  };
  steps.google = {
    ok: steps.sitemap.ok,
    strategy: config.google.strategy,
    searchConsoleApiEnabled: config.google.searchConsoleApiEnabled === true,
    reason: "Google sitemap ping is retired; robots.txt discovery plus accurate lastmod is used without adding OAuth credentials.",
  };

  const keyResponse = await requestText(urls.key, { fetchImpl });
  steps.key = { ok: keyResponse.status === 200 && keyResponse.text.trim() === config.indexNow.key, status: keyResponse.status, url: urls.key };

  if (dryRun) {
    steps.indexNow = { ok: true, status: "dry_run", endpoint, articleUrl };
  } else {
    const payload = buildIndexNowPayload(articleUrl, config);
    const indexNow = await requestText(endpoint, {
      fetchImpl,
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "User-Agent": "sumalabo-search-notify/1.0" },
      body: JSON.stringify(payload),
    });
    steps.indexNow = { ok: [200, 202].includes(indexNow.status), status: indexNow.status, endpoint, articleUrl };
  }

  const failedSteps = Object.entries(steps).filter(([, value]) => value.ok !== true).map(([name]) => name);
  return {
    schemaVersion: 1,
    status: failedSteps.length ? "warning" : "success",
    ok: failedSteps.length === 0,
    reason: failedSteps.length ? `notify_failed:${failedSteps.join(",")}` : "rss_sitemap_indexnow_notified",
    slug,
    articleUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    failedSteps,
    steps,
  };
}

function writeResult(file, result) {
  if (!file) return;
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let result;
  try {
    result = await runSearchNotify(args);
  } catch (error) {
    result = {
      schemaVersion: 1,
      status: "warning",
      ok: false,
      reason: "notify_exception",
      detail: error?.message || String(error),
      slug: args.slug,
      finishedAt: new Date().toISOString(),
      steps: {},
    };
  }
  try { writeResult(args.output, result); } catch (error) { result.outputWarning = error?.message || String(error); }
  console.log(JSON.stringify(result, null, 2));
  // Search notification is deliberately fail-soft. Invalid input and network
  // failures remain visible in JSON but can never change the publishing exit.
  process.exitCode = 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
