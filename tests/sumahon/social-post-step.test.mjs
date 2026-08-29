import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  PLATFORM_LIMITS,
  buildLinkFacet,
  fitPostText,
  graphemeLength,
  isThreadsTokenRefreshRequired,
  readSocialLedger,
  refreshThreadsAccessToken,
  runSocialPostStep,
} from "../../scripts/automation/social-post-step.mjs";
import { readAuthState } from "../../scripts/automation/social-auth-state.mjs";

const SLUG = "202608-social-http-regression";
const ARTICLE_URL = `https://sumalabo.com/articles/${SLUG}/`;
const FIXED_TIME = "2026-08-29T01:02:03.000Z";

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-social-"));
  const imagePath = path.join(root, "public", "images", "thumbnails", `${SLUG}.webp`);
  mkdirSync(path.dirname(imagePath), { recursive: true });
  writeFileSync(imagePath, Buffer.from("mock-webp"));
  return {
    root,
    ledgerPath: path.join(root, "state", "social-posted.json"),
    threadsAuthPath: path.join(root, "state", "threads-auth.json"),
    blueskyAuthPath: path.join(root, "state", "bluesky-auth.json"),
    postData: {
      slug: SLUG,
      articleUrl: ARTICLE_URL,
      thumbnailPath: `/images/thumbnails/${SLUG}.webp`,
      primary: { text: `${"新機能の要点をやさしく解説します。".repeat(30)}\n#すまラボ` },
    },
    articleMeta: { title: "公式API SNS投稿テスト", description: "記事の要点を解説します。" },
  };
}

function jsonResponse(status, data) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(data) };
}

function officialApiMock(calls) {
  return async (input, options = {}) => {
    const url = String(input);
    calls.push({ url, options });
    if (url.includes("graph.threads.net/refresh_access_token")) return jsonResponse(200, { access_token: "threads-refreshed", expires_in: 5_184_000 });
    if (url.endsWith("/threads-user/threads")) return jsonResponse(200, { id: "threads-container" });
    if (url.includes("/threads-container?")) return jsonResponse(200, { id: "threads-container", status: "FINISHED" });
    if (url.endsWith("/threads-user/threads_publish")) return jsonResponse(200, { id: "threads-post" });
    if (url.includes("/threads-post?")) return jsonResponse(200, { permalink: "https://www.threads.net/@sumalabo/post/test" });
    if (url.endsWith("/com.atproto.server.createSession")) return jsonResponse(200, { accessJwt: "bsky-access", did: "did:plc:sumalabo" });
    if (url.endsWith("/com.atproto.repo.uploadBlob")) return jsonResponse(200, { blob: { $type: "blob", ref: { $link: "bafy-test" }, mimeType: "image/webp", size: 9 } });
    if (url.endsWith("/com.atproto.repo.createRecord")) return jsonResponse(200, { uri: "at://did:plc:sumalabo/app.bsky.feed.post/3test", cid: "bafy-post" });
    throw new Error(`unexpected mock request: ${url}`);
  };
}

test("platform text limits preserve the complete article URL", () => {
  const source = `${"家族👨‍👩‍👧‍👦向けの長い説明です。".repeat(100)}\n${ARTICLE_URL}`;
  for (const [platform, limit] of Object.entries(PLATFORM_LIMITS)) {
    const text = fitPostText(source, ARTICLE_URL, limit);
    assert.ok(graphemeLength(text) <= limit, `${platform} exceeds ${limit}`);
    assert.ok(text.endsWith(ARTICLE_URL));
    assert.equal(text.split(ARTICLE_URL).length - 1, 1);
  }
  const text = `日本語の前置き\n${ARTICLE_URL}`;
  const facet = buildLinkFacet(text, ARTICLE_URL);
  assert.equal(facet.index.byteStart, Buffer.byteLength("日本語の前置き\n", "utf8"));
  assert.equal(facet.index.byteEnd, Buffer.byteLength(text, "utf8"));
});

test("missing credentials skip both platforms without network or ledger writes", async () => {
  const f = fixture();
  const result = await runSocialPostStep({
    slug: SLUG,
    env: {},
    root: f.root,
    ledgerPath: f.ledgerPath,
    threadsAuthPath: f.threadsAuthPath,
    blueskyAuthPath: f.blueskyAuthPath,
    fetchImpl: async () => { throw new Error("network must not be called"); },
    now: () => new Date(FIXED_TIME),
  });
  assert.equal(result.status, "skipped");
  assert.equal(result.ok, true);
  assert.equal(result.platforms.threads.summaryStatus, "skipped(未設定)");
  assert.equal(result.platforms.bluesky.summaryStatus, "skipped(未設定)");
  assert.equal(result.summary, "social: threads=skipped(未設定), bluesky=skipped(未設定)");
  assert.equal(readSocialLedger(f.ledgerPath).platforms.threads[SLUG], undefined);
});

test("official API mock posts independently and the platform-by-slug ledger prevents duplicates", async () => {
  const f = fixture();
  const calls = [];
  mkdirSync(path.dirname(f.threadsAuthPath), { recursive: true });
  writeFileSync(f.threadsAuthPath, JSON.stringify({ schemaVersion: 1, userId: "threads-user", accessToken: "threads-original" }));
  writeFileSync(f.blueskyAuthPath, JSON.stringify({ schemaVersion: 1, handle: "sumalabo.bsky.social", appPassword: "app-password" }));
  const options = {
    slug: SLUG,
    env: {},
    root: f.root,
    ledgerPath: f.ledgerPath,
    threadsAuthPath: f.threadsAuthPath,
    blueskyAuthPath: f.blueskyAuthPath,
    postData: f.postData,
    articleMeta: f.articleMeta,
    fetchImpl: officialApiMock(calls),
    sleepImpl: async () => {},
    now: () => new Date(FIXED_TIME),
  };
  const first = await runSocialPostStep(options);
  assert.equal(first.status, "success");
  assert.equal(first.platforms.threads.status, "success");
  assert.equal(first.platforms.bluesky.status, "success");
  assert.ok(first.platforms.threads.textLength <= 500);
  assert.ok(first.platforms.bluesky.textLength <= 300);

  const createThread = calls.find((call) => call.url.endsWith("/threads-user/threads"));
  assert.equal(createThread.options.body.get("media_type"), "IMAGE");
  assert.ok(createThread.options.body.get("text").includes(ARTICLE_URL));
  assert.match(createThread.options.body.get("image_url"), /sumalabo\.com\/images\/thumbnails/);
  const createRecord = calls.find((call) => call.url.endsWith("/com.atproto.repo.createRecord"));
  const recordBody = JSON.parse(createRecord.options.body);
  assert.equal(recordBody.collection, "app.bsky.feed.post");
  assert.equal(recordBody.record.embed.$type, "app.bsky.embed.external");
  assert.equal(recordBody.record.embed.external.uri, ARTICLE_URL);
  assert.equal(recordBody.record.embed.external.thumb.ref.$link, "bafy-test");
  assert.equal(recordBody.record.facets[0].features[0].uri, ARTICLE_URL);

  const tokenState = JSON.parse(readFileSync(f.threadsAuthPath, "utf8"));
  assert.equal(tokenState.accessToken, "threads-refreshed");
  assert.equal(tokenState.expiresInSeconds, 5_184_000);
  assert.equal(tokenState.userId, "threads-user");
  const ledger = readSocialLedger(f.ledgerPath);
  assert.equal(ledger.platforms.threads[SLUG].postId, "threads-post");
  assert.equal(ledger.platforms.bluesky[SLUG].uri, "at://did:plc:sumalabo/app.bsky.feed.post/3test");

  const second = await runSocialPostStep({ ...options, fetchImpl: async () => { throw new Error("duplicate must not call network"); } });
  assert.equal(second.platforms.threads.summaryStatus, "skipped(既投稿)");
  assert.equal(second.platforms.bluesky.summaryStatus, "skipped(既投稿)");
});

test("Threads OAuth expiry is classified as requiring token renewal", () => {
  assert.equal(isThreadsTokenRefreshRequired({ status: 400, data: { error: { code: 190, message: "Invalid OAuth access token." } } }), true);
  assert.equal(isThreadsTokenRefreshRequired({ status: 503, data: { error: { message: "Temporary outage" } } }), false);
});

test("one platform failure does not prevent the other platform from posting", async () => {
  const f = fixture();
  const calls = [];
  const baseMock = officialApiMock(calls);
  const fetchImpl = async (input, options) => {
    const url = String(input);
    if (url.includes("graph.threads.net/refresh_access_token")) {
      calls.push({ url, options });
      return jsonResponse(400, { error: { code: 190, message: "Access token has expired" } });
    }
    return baseMock(input, options);
  };
  const result = await runSocialPostStep({
    slug: SLUG,
    env: {
      THREADS_USER_ID: "threads-user",
      THREADS_ACCESS_TOKEN: "expired-token",
      BLUESKY_HANDLE: "sumalabo.bsky.social",
      BLUESKY_APP_PASSWORD: "app-password",
    },
    root: f.root,
    ledgerPath: f.ledgerPath,
    threadsAuthPath: f.threadsAuthPath,
    blueskyAuthPath: f.blueskyAuthPath,
    postData: f.postData,
    articleMeta: f.articleMeta,
    fetchImpl,
    sleepImpl: async () => {},
    now: () => new Date(FIXED_TIME),
  });
  assert.equal(result.status, "warning");
  assert.equal(result.platforms.threads.status, "failed");
  assert.equal(result.platforms.threads.tokenRefreshRequired, true);
  assert.equal(result.platforms.threads.warning, "トークン更新が必要");
  assert.equal(result.platforms.bluesky.status, "success");
  assert.ok(calls.some((call) => call.url.endsWith("/com.atproto.repo.createRecord")));
});

test("an unreadable existing ledger fails closed before any post", async () => {
  const f = fixture();
  mkdirSync(path.dirname(f.ledgerPath), { recursive: true });
  writeFileSync(f.ledgerPath, "not-json\n");
  let calls = 0;
  const result = await runSocialPostStep({
    slug: SLUG,
    env: {
      THREADS_USER_ID: "threads-user",
      THREADS_ACCESS_TOKEN: "threads-token",
      BLUESKY_HANDLE: "sumalabo.bsky.social",
      BLUESKY_APP_PASSWORD: "app-password",
    },
    root: f.root,
    ledgerPath: f.ledgerPath,
    threadsAuthPath: f.threadsAuthPath,
    blueskyAuthPath: f.blueskyAuthPath,
    fetchImpl: async () => { calls += 1; throw new Error("must not post"); },
    now: () => new Date(FIXED_TIME),
  });
  assert.equal(result.status, "warning");
  assert.equal(result.platforms.threads.reason, "social_ledger_unavailable");
  assert.equal(result.platforms.bluesky.reason, "social_ledger_unavailable");
  assert.equal(calls, 0);
});

test("Threads refresh failures on two consecutive Tokyo dates require setup rerun", async () => {
  const f = fixture();
  const fetchImpl = async () => jsonResponse(503, { error: { message: "Temporary outage" } });
  const first = await refreshThreadsAccessToken({
    accessToken: "threads-token",
    authPath: f.threadsAuthPath,
    authState: { schemaVersion: 1, userId: "threads-user", accessToken: "threads-token", appSecret: "secret" },
    fetchImpl,
    now: () => new Date("2026-08-29T01:00:00.000Z"),
  });
  assert.equal(first.consecutiveFailureDays, 1);
  assert.equal(first.setupRequired, false);
  const second = await refreshThreadsAccessToken({
    accessToken: "threads-token",
    authPath: f.threadsAuthPath,
    authState: readAuthState(f.threadsAuthPath),
    fetchImpl,
    now: () => new Date("2026-08-30T01:00:00.000Z"),
  });
  assert.equal(second.consecutiveFailureDays, 2);
  assert.equal(second.setupRequired, true);
  assert.equal(readAuthState(f.threadsAuthPath).refreshHealth.consecutiveFailureDays, 2);
});
