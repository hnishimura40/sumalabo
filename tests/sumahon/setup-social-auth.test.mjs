import test from "node:test";
import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import { mkdtempSync, readFileSync } from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import {
  buildThreadsAuthorizationUrl,
  ensureLocalhostCertificate,
  runThreadsAuthorization,
  verifyAndSaveBluesky,
} from "../../scripts/automation/setup-social-auth.mjs";

function jsonResponse(status, data) {
  return { ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(data) };
}

function localHttpsGet(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { rejectUnauthorized: false }, (response) => {
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => { body += chunk; });
      response.on("end", () => resolve({ status: response.statusCode, body, headers: response.headers }));
    });
    request.on("error", reject);
  });
}

test("Threads mocked OAuth completes through a real localhost callback and saves long-lived auth", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-auth-"));
  const authPath = path.join(root, "state", "threads-auth.json");
  const calls = [];
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(String(input));
    calls.push({ url, options });
    if (url.pathname === "/oauth/access_token") {
      assert.equal(options.method, "POST");
      assert.equal(url.searchParams.get("code"), "mock-code");
      return jsonResponse(200, { access_token: "short-token", user_id: "short-user" });
    }
    if (url.pathname === "/access_token") {
      assert.equal(url.searchParams.get("grant_type"), "th_exchange_token");
      assert.equal(url.searchParams.get("access_token"), "short-token");
      return jsonResponse(200, { access_token: "long-token", token_type: "bearer", expires_in: 5_184_000 });
    }
    if (url.pathname === "/v1.0/me") {
      assert.equal(url.searchParams.get("access_token"), "long-token");
      return jsonResponse(200, { id: "threads-user" });
    }
    throw new Error(`unexpected URL: ${url}`);
  };
  let redirectUri;
  const result = await runThreadsAuthorization({
    appId: "app-id",
    appSecret: "app-secret",
    authPath,
    preferredPort: 0,
    fetchImpl,
    now: () => new Date("2026-08-29T03:00:00.000Z"),
    onReady: (ready) => { redirectUri = ready.redirectUri; },
    openBrowser: async (startUri) => {
      assert.match(startUri, /^https:\/\/localhost:\d+\/start$/u);
      const started = await localHttpsGet(startUri);
      assert.equal(started.status, 302);
      const authorizationUrl = started.headers.location;
      const url = new URL(authorizationUrl);
      assert.equal(url.origin + url.pathname, "https://threads.net/oauth/authorize");
      assert.equal(url.searchParams.get("scope"), "threads_basic,threads_content_publish");
      const callback = new URL(url.searchParams.get("redirect_uri"));
      callback.searchParams.set("code", "mock-code");
      callback.searchParams.set("state", url.searchParams.get("state"));
      const response = await localHttpsGet(callback);
      assert.equal(response.status, 200);
      assert.match(response.body, /認証コードを受け取りました/u);
    },
  });
  assert.equal(result.ok, true);
  assert.match(redirectUri, /^https:\/\/localhost:\d+\/callback$/u);
  assert.equal(calls.length, 3);
  const saved = JSON.parse(readFileSync(authPath, "utf8"));
  assert.equal(saved.appId, "app-id");
  assert.equal(saved.appSecret, "app-secret");
  assert.equal(saved.accessToken, "long-token");
  assert.equal(saved.userId, "threads-user");
  assert.equal(saved.expiresAt, "2026-10-28T03:00:00.000Z");
  assert.equal(saved.refreshHealth.consecutiveFailureDays, 0);
  assert.doesNotMatch(readFileSync(authPath, "utf8"), /mock-code/u);
});

test("localhost certificate is generated with a localhost SAN and then safely reused", () => {
  const stateDirectory = mkdtempSync(path.join(os.tmpdir(), "sumalabo-cert-"));
  const first = ensureLocalhostCertificate({ stateDirectory, now: () => new Date() });
  assert.equal(first.generated, true);
  const certificate = new X509Certificate(readFileSync(first.certificatePath));
  assert.match(certificate.subjectAltName, /DNS:localhost/u);
  const second = ensureLocalhostCertificate({ stateDirectory, now: () => new Date() });
  assert.equal(second.generated, false);
  assert.equal(second.certificatePath, first.certificatePath);
  assert.equal(second.keyPath, first.keyPath);
});

test("Threads authorization URL contains exact required OAuth parameters", () => {
  const url = new URL(buildThreadsAuthorizationUrl({ appId: "123", redirectUri: "https://localhost:43821/callback", state: "csrf" }));
  assert.equal(url.searchParams.get("client_id"), "123");
  assert.equal(url.searchParams.get("redirect_uri"), "https://localhost:43821/callback");
  assert.equal(url.searchParams.get("scope"), "threads_basic,threads_content_publish");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("state"), "csrf");
});

test("Bluesky createSession is verified before credentials are saved", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-bsky-auth-"));
  const authPath = path.join(root, "state", "bluesky-auth.json");
  const fetchImpl = async (input, options) => {
    assert.equal(String(input), "https://bsky.social/xrpc/com.atproto.server.createSession");
    assert.deepEqual(JSON.parse(options.body), { identifier: "suma-labo.bsky.social", password: "app-password" });
    return jsonResponse(200, { accessJwt: "temporary-session", did: "did:plc:sumalabo", handle: "suma-labo.bsky.social" });
  };
  await verifyAndSaveBluesky({
    handle: "suma-labo.bsky.social",
    appPassword: "app-password",
    authPath,
    fetchImpl,
    now: () => new Date("2026-08-29T04:00:00.000Z"),
  });
  const saved = JSON.parse(readFileSync(authPath, "utf8"));
  assert.equal(saved.handle, "suma-labo.bsky.social");
  assert.equal(saved.appPassword, "app-password");
  assert.equal(saved.did, "did:plc:sumalabo");
  assert.equal(saved.accessJwt, undefined);
});
