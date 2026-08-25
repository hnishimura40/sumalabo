import assert from "node:assert/strict";
import test from "node:test";

import { buildPurgeUrls } from "../../scripts/automation/cache-purge.mjs";

test("cache purge includes article slide image URLs referenced by MDX", () => {
  const urls = buildPurgeUrls("ai-youtube-video-creation-guide-2026", "https://sumalabo.com");
  assert.ok(urls.includes("https://sumalabo.com/images/articles/ai-youtube-video-creation-guide-2026/slide07-rules.webp"));
  assert.ok(urls.includes("https://sumalabo.com/images/articles/ai-youtube-video-creation-guide-2026/slide08-checklist.webp"));
  assert.equal(new Set(urls).size, urls.length);
});

test("cache purge keeps base URLs for an article without a matching MDX", () => {
  const urls = buildPurgeUrls("nonexistent-test-slug", "https://sumalabo.com/");
  assert.ok(urls.includes("https://sumalabo.com/articles/nonexistent-test-slug/"));
  assert.ok(urls.includes("https://sumalabo.com/images/thumbnails/nonexistent-test-slug.webp"));
  assert.ok(urls.includes("https://sumalabo.com/rss.xml"));
  assert.ok(urls.includes("https://sumalabo.com/sitemap.xml"));
  assert.ok(urls.some((url) => /\/[a-f0-9]{32}\.txt$/.test(url)));
});
