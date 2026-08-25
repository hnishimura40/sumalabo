import test from "node:test";
import assert from "node:assert/strict";
import { buildIndexNowPayload, runSearchNotify, SEARCH_NOTIFY_CONFIG, validateRssXml, validateSitemapXml } from "../../scripts/automation/search-notify.mjs";

const slug = "202608-notify-test";
const articleUrl = `https://sumalabo.com/articles/${slug}/`;
const rss = `<?xml version="1.0"?><rss><channel>
<item><title>最新</title><link>${articleUrl}</link><pubDate>Tue, 25 Aug 2026 12:00:00 GMT</pubDate><description>最新記事</description></item>
<item><title>過去</title><link>https://sumalabo.com/articles/older/</link><pubDate>Mon, 24 Aug 2026 12:00:00 GMT</pubDate><description>過去記事</description></item>
</channel></rss>`;
const sitemap = `<?xml version="1.0"?><urlset><url><loc>${articleUrl}</loc><lastmod>2026-08-25T12:00:00.000Z</lastmod></url></urlset>`;

function mockFetch({ indexStatus = 202 } = {}) {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith("/rss.xml")) return new Response(rss, { status: 200 });
    if (String(url).endsWith("/sitemap.xml")) return new Response(`<sitemapindex><sitemap><loc>https://sumalabo.com/sitemap-0.xml</loc></sitemap></sitemapindex>`, { status: 200 });
    if (String(url).endsWith("/sitemap-0.xml")) return new Response(sitemap, { status: 200 });
    if (String(url).endsWith(`/${SEARCH_NOTIFY_CONFIG.indexNow.key}.txt`)) return new Response(SEARCH_NOTIFY_CONFIG.indexNow.key, { status: 200 });
    if (String(url) === SEARCH_NOTIFY_CONFIG.indexNow.endpoint) return new Response("", { status: indexStatus });
    return new Response("not found", { status: 404 });
  };
  return { fetchImpl, calls };
}

test("RSS validation requires fields, newest-first order, and the new article first", () => {
  assert.deepEqual(validateRssXml(rss, articleUrl), {
    ok: true,
    itemCount: 2,
    firstLink: articleUrl,
    firstTitle: "最新",
    requiredFields: true,
    newestFirst: true,
    expectedFirst: true,
  });
  assert.equal(validateRssXml(rss.replace("Tue, 25 Aug", "Sun, 23 Aug"), articleUrl).ok, false);
});

test("sitemap validation requires the article and a parseable lastmod", () => {
  assert.deepEqual(validateSitemapXml(sitemap, articleUrl), {
    ok: true,
    urlCount: 1,
    articleFound: true,
    articleLastmod: "2026-08-25T12:00:00.000Z",
  });
});

test("search notify validates RSS/sitemap/key and sends one IndexNow URL", async () => {
  const mock = mockFetch();
  const result = await runSearchNotify({ slug, fetchImpl: mock.fetchImpl });
  assert.equal(result.status, "success");
  assert.equal(result.ok, true);
  assert.equal(result.steps.indexNow.status, 202);
  const post = mock.calls.find((call) => call.url === SEARCH_NOTIFY_CONFIG.indexNow.endpoint);
  assert.equal(post.options.method, "POST");
  assert.deepEqual(JSON.parse(post.options.body), buildIndexNowPayload(articleUrl));
});

test("IndexNow rejection is warning-only data", async () => {
  const result = await runSearchNotify({ slug, fetchImpl: mockFetch({ indexStatus: 500 }).fetchImpl });
  assert.equal(result.status, "warning");
  assert.equal(result.ok, false);
  assert.deepEqual(result.failedSteps, ["indexNow"]);
});
