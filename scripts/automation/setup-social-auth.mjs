#!/usr/bin/env node
// Interactive, repository-external authentication setup for Threads and Bluesky.

import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import { chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import https from "node:https";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { pathToFileURL } from "node:url";
import {
  readAuthState,
  resolveBlueskyAuthPath,
  resolveThreadsAuthPath,
  writePrivateJson,
} from "./social-auth-state.mjs";
import { NIGHT_ENVIRONMENT } from "./night-environment.mjs";

const THREADS_GRAPH = "https://graph.threads.net";
const THREADS_AUTHORIZE = "https://threads.net/oauth/authorize";
const BLUESKY_CREATE_SESSION = "https://bsky.social/xrpc/com.atproto.server.createSession";
const DEFAULT_CALLBACK_PORT = Number(NIGHT_ENVIRONMENT.threadsAuth.callbackPort) || 43_821;
const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
const CERTIFICATE_VALID_DAYS = Number(NIGHT_ENVIRONMENT.threadsAuth.certificateValidityDays) || 7;

function opensslCandidates() {
  if (process.env.SUMALABO_OPENSSL_PATH) return [process.env.SUMALABO_OPENSSL_PATH];
  if (process.platform === "win32") {
    return [
      "C:\\Program Files\\Git\\usr\\bin\\openssl.exe",
      "C:\\Program Files\\Git\\mingw64\\bin\\openssl.exe",
      "openssl.exe",
    ];
  }
  return ["openssl"];
}

function certificateIsReusable(certificatePath, now) {
  try {
    const certificate = new crypto.X509Certificate(readFileSync(certificatePath));
    const validForAnotherDay = Date.parse(certificate.validTo) > now.getTime() + 86_400_000;
    return validForAnotherDay && /DNS:localhost/iu.test(certificate.subjectAltName || "");
  } catch {
    return false;
  }
}

export function ensureLocalhostCertificate({ stateDirectory, now = () => new Date(), spawnSyncImpl } = {}) {
  if (!stateDirectory) throw new Error("certificate_state_directory_missing");
  const keyPath = path.join(stateDirectory, "localhost-key.pem");
  const certificatePath = path.join(stateDirectory, "localhost-cert.pem");
  if (existsSync(keyPath) && certificateIsReusable(certificatePath, now())) {
    return { keyPath, certificatePath, generated: false };
  }
  mkdirSync(stateDirectory, { recursive: true, mode: 0o700 });
  const run = spawnSyncImpl || ((command, args) => {
    return spawnSync(command, args, {
      encoding: "utf8",
      windowsHide: true,
      env: { ...process.env, MSYS2_ARG_CONV_EXCL: "*" },
    });
  });
  const args = [
    "req", "-x509", "-newkey", "rsa:2048", "-sha256", "-nodes",
    "-keyout", keyPath,
    "-out", certificatePath,
    "-days", String(CERTIFICATE_VALID_DAYS),
    "-subj", "/CN=localhost",
    "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1",
    "-addext", "keyUsage=digitalSignature,keyEncipherment",
    "-addext", "extendedKeyUsage=serverAuth",
  ];
  let lastError = "openssl_not_found";
  for (const command of opensslCandidates()) {
    if (path.isAbsolute(command) && !existsSync(command)) continue;
    const result = run(command, args);
    if (result?.status === 0 && existsSync(keyPath) && certificateIsReusable(certificatePath, now())) {
      try { chmodSync(keyPath, 0o600); chmodSync(certificatePath, 0o600); } catch {}
      return { keyPath, certificatePath, generated: true, openssl: command };
    }
    lastError = String(result?.error?.message || result?.stderr || `exit=${result?.status}`).trim().slice(0, 500);
  }
  throw new Error(`localhost_certificate_generation_failed:${lastError}`);
}

async function responseJson(response) {
  const raw = await response.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw || null; }
  if (!response.ok) {
    const api = data?.error || data;
    const message = api?.message || api?.error || raw || `HTTP ${response.status}`;
    throw new Error(`HTTP ${response.status}: ${String(message).slice(0, 500)}`);
  }
  return data;
}

async function fetchJson(url, options, fetchImpl) {
  return responseJson(await fetchImpl(url, options));
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/gu, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
  })[character]);
}

function callbackHtml(ok, detail) {
  const title = ok ? "認証コードを受け取りました" : "認証を完了できませんでした";
  return `<!doctype html><html lang="ja"><meta charset="utf-8"><title>${title}</title><body><h1>${title}</h1><p>${escapeHtml(detail)}</p><p>このタブを閉じてセットアップ画面へ戻ってください。</p></body></html>`;
}

const LOCAL_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

export async function createOAuthCallbackListener({ expectedState, preferredPort = DEFAULT_CALLBACK_PORT, timeoutMs = CALLBACK_TIMEOUT_MS, key, certificate } = {}) {
  let authorizationUrlValue = "";
  if (!key || !certificate) throw new Error("localhost_tls_material_missing");
  let finish;
  let fail;
  let settled = false;
  const codePromise = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
  const server = https.createServer({ key, cert: certificate }, (request, response) => {
    const url = new URL(request.url || "/", "https://localhost");
    if (url.pathname === "/start") {
      if (!authorizationUrlValue) {
        response.writeHead(503, { ...LOCAL_RESPONSE_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
        response.end("Authorization is not ready");
        return;
      }
      response.writeHead(302, { ...LOCAL_RESPONSE_HEADERS, Location: authorizationUrlValue });
      response.end();
      return;
    }
    if (url.pathname !== "/callback") {
      response.writeHead(404, { ...LOCAL_RESPONSE_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    const state = url.searchParams.get("state");
    const code = url.searchParams.get("code");
    const oauthError = url.searchParams.get("error") || url.searchParams.get("error_reason");
    if (state !== expectedState) {
      response.writeHead(400, { ...LOCAL_RESPONSE_HEADERS, "Content-Type": "text/html; charset=utf-8" });
      response.end(callbackHtml(false, "stateが一致しません。最初からやり直してください。"));
      return;
    }
    if (oauthError || !code) {
      response.writeHead(400, { ...LOCAL_RESPONSE_HEADERS, "Content-Type": "text/html; charset=utf-8" });
      response.end(callbackHtml(false, oauthError || "認証コードがありません。"));
      if (!settled) {
        settled = true;
        fail(new Error(`threads_authorization_denied:${oauthError || "code_missing"}`));
      }
      return;
    }
    response.writeHead(200, { ...LOCAL_RESPONSE_HEADERS, "Content-Type": "text/html; charset=utf-8" });
    response.end(callbackHtml(true, "Threadsの認証を続行しています。"));
    if (!settled) {
      settled = true;
      finish(code);
    }
  });

  const listen = (port) => new Promise((resolve, reject) => {
    const onError = (error) => { server.off("listening", onListening); reject(error); };
    const onListening = () => { server.off("error", onError); resolve(); };
    server.once("error", onError);
    server.once("listening", onListening);
    server.listen(port, "127.0.0.1");
  });
  try {
    await listen(preferredPort);
  } catch (error) {
    if (error?.code === "EADDRINUSE") throw new Error(`threads_callback_port_in_use:${preferredPort}`);
    throw error;
  }
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : preferredPort;
  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      fail(new Error("threads_callback_timeout"));
    }
  }, timeoutMs);
  timer.unref?.();
  const close = async () => {
    clearTimeout(timer);
    if (!server.listening) return;
    await new Promise((resolve) => server.close(resolve));
  };
  return {
    port,
    preferredPortUnavailable: false,
    redirectUri: `https://localhost:${port}/callback`,
    startUri: `https://localhost:${port}/start`,
    setAuthorizationUrl: (value) => { authorizationUrlValue = String(value || ""); },
    waitForCode: () => codePromise.finally(close),
    close,
  };
}

export function buildThreadsAuthorizationUrl({ appId, redirectUri, state }) {
  const url = new URL(THREADS_AUTHORIZE);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "threads_basic,threads_content_publish");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

export function openDefaultBrowser(url) {
  let command;
  let args;
  if (process.platform === "win32") {
    command = "rundll32.exe";
    args = ["url.dll,FileProtocolHandler", url];
  } else if (process.platform === "darwin") {
    command = "open";
    args = [url];
  } else {
    command = "xdg-open";
    args = [url];
  }
  const child = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  child.unref();
}

export async function exchangeThreadsAuthorization({ appId, appSecret, code, redirectUri, fetchImpl = fetch, now = () => new Date() }) {
  const shortUrl = new URL(`${THREADS_GRAPH}/oauth/access_token`);
  shortUrl.searchParams.set("client_id", appId);
  shortUrl.searchParams.set("client_secret", appSecret);
  shortUrl.searchParams.set("code", code);
  shortUrl.searchParams.set("grant_type", "authorization_code");
  shortUrl.searchParams.set("redirect_uri", redirectUri);
  const shortToken = await fetchJson(shortUrl, { method: "POST" }, fetchImpl);
  if (!shortToken?.access_token) throw new Error("threads_short_token_missing");

  const longUrl = new URL(`${THREADS_GRAPH}/access_token`);
  longUrl.searchParams.set("grant_type", "th_exchange_token");
  longUrl.searchParams.set("client_secret", appSecret);
  longUrl.searchParams.set("access_token", shortToken.access_token);
  const longToken = await fetchJson(longUrl, { method: "GET" }, fetchImpl);
  if (!longToken?.access_token) throw new Error("threads_long_token_missing");

  const meUrl = new URL(`${THREADS_GRAPH}/v1.0/me`);
  meUrl.searchParams.set("fields", "id");
  meUrl.searchParams.set("access_token", longToken.access_token);
  const me = await fetchJson(meUrl, { method: "GET" }, fetchImpl);
  const userId = String(me?.id || shortToken.user_id || "").trim();
  if (!userId) throw new Error("threads_user_id_missing");
  const obtainedAt = now();
  const expiresInSeconds = Number(longToken.expires_in) || 5_184_000;
  return {
    accessToken: longToken.access_token,
    userId,
    tokenType: longToken.token_type || "bearer",
    obtainedAt: obtainedAt.toISOString(),
    expiresAt: new Date(obtainedAt.getTime() + expiresInSeconds * 1000).toISOString(),
    expiresInSeconds,
  };
}

export async function runThreadsAuthorization({
  appId,
  appSecret,
  authPath,
  preferredPort = DEFAULT_CALLBACK_PORT,
  fetchImpl = fetch,
  openBrowser = openDefaultBrowser,
  now = () => new Date(),
  timeoutMs = CALLBACK_TIMEOUT_MS,
  onReady = () => {},
}) {
  const oauthState = crypto.randomBytes(24).toString("hex");
  const tls = ensureLocalhostCertificate({ stateDirectory: path.dirname(authPath), now });
  const listener = await createOAuthCallbackListener({
    expectedState: oauthState,
    preferredPort,
    timeoutMs,
    key: readFileSync(tls.keyPath),
    certificate: readFileSync(tls.certificatePath),
  });
  const authorizationUrl = buildThreadsAuthorizationUrl({ appId, redirectUri: listener.redirectUri, state: oauthState });
  listener.setAuthorizationUrl(authorizationUrl);
  const existing = readAuthState(authPath) || {};
  writePrivateJson(authPath, {
    ...existing,
    schemaVersion: 1,
    appId,
    appSecret,
    redirectPort: listener.port,
    redirectUri: listener.redirectUri,
    tlsCertificatePath: tls.certificatePath,
    tlsKeyPath: tls.keyPath,
    setupPendingAt: now().toISOString(),
  });
  try {
    await onReady({ authorizationUrl, redirectUri: listener.redirectUri, startUri: listener.startUri, port: listener.port, preferredPortUnavailable: listener.preferredPortUnavailable });
    await openBrowser(listener.startUri);
    const code = await listener.waitForCode();
    const token = await exchangeThreadsAuthorization({ appId, appSecret, code, redirectUri: listener.redirectUri, fetchImpl, now });
    const finalState = {
      ...existing,
      schemaVersion: 1,
      appId,
      appSecret,
      redirectPort: listener.port,
      redirectUri: listener.redirectUri,
      tlsCertificatePath: tls.certificatePath,
      tlsKeyPath: tls.keyPath,
      ...token,
      setupCompletedAt: now().toISOString(),
      refreshHealth: { consecutiveFailureDays: 0, lastError: null },
    };
    writePrivateJson(authPath, finalState);
    return { ok: true, authPath, state: finalState };
  } catch (error) {
    await listener.close();
    throw error;
  }
}

export async function verifyAndSaveBluesky({ handle, appPassword, authPath, fetchImpl = fetch, now = () => new Date() }) {
  const session = await fetchJson(BLUESKY_CREATE_SESSION, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  }, fetchImpl);
  if (!session?.accessJwt || !session?.did) throw new Error("bluesky_session_invalid");
  const state = {
    schemaVersion: 1,
    handle: String(session.handle || handle),
    appPassword,
    did: session.did,
    verifiedAt: now().toISOString(),
  };
  writePrivateJson(authPath, state);
  return { ok: true, authPath, state };
}

async function hiddenQuestion(promptText) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
    try { return (await terminal.question(promptText)).trim(); } finally { terminal.close(); }
  }
  process.stdout.write(promptText);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");
  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onData = (character) => {
      if (character === "\u0003") { cleanup(); reject(new Error("setup_cancelled")); return; }
      if (character === "\r" || character === "\n") { cleanup(); resolve(value.trim()); return; }
      if (character === "\u007f" || character === "\b") { value = value.slice(0, -1); return; }
      value += character;
    };
    process.stdin.on("data", onData);
  });
}

async function plainQuestion(promptText) {
  const terminal = readline.createInterface({ input: process.stdin, output: process.stdout });
  try { return (await terminal.question(promptText)).trim(); } finally { terminal.close(); }
}

function parseArgs(argv) {
  return {
    threadsOnly: argv.includes("--threads-only"),
    blueskyOnly: argv.includes("--bluesky-only"),
    replaceThreadsApp: argv.includes("--replace-threads-app"),
    replaceBluesky: argv.includes("--replace-bluesky"),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.threadsOnly && args.blueskyOnly) throw new Error("choose_only_one_platform");
  let failed = false;
  if (!args.blueskyOnly) {
    try {
        const authPath = resolveThreadsAuthPath();
        const saved = readAuthState(authPath) || {};
        const appId = !args.replaceThreadsApp && saved.appId ? saved.appId : await plainQuestion("Threads App ID: ");
        const appSecret = !args.replaceThreadsApp && saved.appSecret ? saved.appSecret : await hiddenQuestion("Threads App Secret（画面には表示しません）: ");
        if (!appId || !appSecret) throw new Error("threads_app_credentials_missing");
        console.log("\n[Threads] localhostで認可結果を待ち受けます。");
        await runThreadsAuthorization({
          appId,
          appSecret,
          authPath,
          preferredPort: Number(saved.redirectPort) || DEFAULT_CALLBACK_PORT,
          onReady: ({ redirectUri, preferredPortUnavailable }) => {
            console.log(`[Threads] Redirect callback URL: ${redirectUri}`);
            if (preferredPortUnavailable) console.warn("[Threads] 保存済みポートが使用中です。Meta AppのRedirect Callback URLを上記URLへ変更してください。");
            console.log("[Threads] ブラウザの証明書警告で［詳細設定］→［localhost に進む］を選んでください。その後、認可画面で許可ボタンを押してください。");
          },
        });
        console.log(`[Threads] 保存完了: ${authPath}`);
    } catch (error) {
      failed = true;
      console.error(`[Threads] セットアップ失敗: ${error?.message || String(error)}`);
    }
  }
  if (!args.threadsOnly) {
    try {
        const authPath = resolveBlueskyAuthPath();
        const saved = readAuthState(authPath) || {};
        const handle = !args.replaceBluesky && saved.handle ? saved.handle : await plainQuestion("Bluesky handle: ");
        const appPassword = !args.replaceBluesky && saved.appPassword ? saved.appPassword : await hiddenQuestion("Blueskyアプリパスワード（画面には表示しません）: ");
        if (!handle || !appPassword) throw new Error("bluesky_credentials_missing");
        await verifyAndSaveBluesky({ handle, appPassword, authPath });
        console.log(`[Bluesky] 疎通確認・保存完了: ${authPath}`);
    } catch (error) {
      failed = true;
      console.error(`[Bluesky] セットアップ失敗: ${error?.message || String(error)}`);
    }
  }
  if (!failed) console.log("\n次にHiroがやること：なし（60日更新は夜間runが自動実行）");
  process.exitCode = failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[social-auth] ${error?.message || String(error)}`);
    process.exitCode = 1;
  });
}
