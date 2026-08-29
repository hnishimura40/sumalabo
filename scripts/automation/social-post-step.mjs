#!/usr/bin/env node
// Threads / Bluesky official HTTP API posting step.
// This step is deliberately independent and fail-soft: every platform is
// evaluated separately and the CLI always exits 0 after writing evidence.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractFrontmatter } from "../sumahon/frontmatter-lite.mjs";
import { NIGHT_ENVIRONMENT } from "./night-environment.mjs";
import {
  expandSocialStatePath,
  recordThreadsRefreshFailure,
  recordThreadsRefreshSuccess,
  resolveBlueskyAuthPath,
  resolveBlueskyCredentials,
  resolveThreadsAuthPath,
  resolveThreadsCredentials,
} from "./social-auth-state.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const THREADS_GRAPH = "https://graph.threads.net";
const THREADS_API = "https://graph.threads.net/v1.0";
const BLUESKY_API = "https://bsky.social/xrpc";
export const PLATFORM_LIMITS = Object.freeze({ threads: 500, bluesky: 300 });

export function resolveSocialLedgerPath(env = process.env) {
  return env.SUMALABO_SOCIAL_POSTED_LEDGER_PATH || expandSocialStatePath(NIGHT_ENVIRONMENT.socialPostedLedger.pathTemplate, env);
}

export { resolveBlueskyAuthPath, resolveThreadsAuthPath };

function atomicWriteJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporary, file);
}

export function readSocialLedger(file = resolveSocialLedgerPath()) {
  if (!existsSync(file)) return { schemaVersion: 1, platforms: { threads: {}, bluesky: {} } };
  let ledger;
  try { ledger = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/u, "")); }
  catch (error) { throw new Error(`social_ledger_io_error:${error?.message || String(error)}`); }
  if (!ledger || ledger.schemaVersion !== 1 || typeof ledger.platforms !== "object") {
    throw new Error("social_ledger_schema_invalid");
  }
  return {
    schemaVersion: 1,
    platforms: {
      threads: ledger.platforms.threads && typeof ledger.platforms.threads === "object" ? ledger.platforms.threads : {},
      bluesky: ledger.platforms.bluesky && typeof ledger.platforms.bluesky === "object" ? ledger.platforms.bluesky : {},
    },
  };
}

export function isAlreadyPosted(ledger, platform, slug) {
  return Boolean(ledger?.platforms?.[platform]?.[slug]?.postedAt);
}

export function recordSocialPost({ ledgerPath, platform, slug, record }) {
  const ledger = readSocialLedger(ledgerPath);
  ledger.platforms[platform] ||= {};
  if (isAlreadyPosted(ledger, platform, slug)) return false;
  ledger.platforms[platform][slug] = { ...record, slug, platform };
  atomicWriteJson(ledgerPath, ledger);
  return true;
}

const graphemeSegmenter = new Intl.Segmenter("ja", { granularity: "grapheme" });

export function graphemeLength(value) {
  return [...graphemeSegmenter.segment(String(value || ""))].length;
}

function takeGraphemes(value, count) {
  return [...graphemeSegmenter.segment(String(value || ""))].slice(0, Math.max(0, count)).map((item) => item.segment).join("");
}

export function fitPostText(sourceText, articleUrl, limit) {
  const url = String(articleUrl || "").trim();
  if (!url) throw new Error("article_url_missing");
  const withoutDuplicateUrl = String(sourceText || "")
    .split(/\r?\n/u)
    .filter((line) => line.trim() !== url)
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
  const suffix = `\n${url}`;
  const complete = `${withoutDuplicateUrl}${suffix}`.trim();
  if (graphemeLength(complete) <= limit) return complete;
  const budget = limit - graphemeLength(suffix) - 1;
  if (budget < 1) throw new Error("article_url_exceeds_platform_limit");
  const shortened = takeGraphemes(withoutDuplicateUrl, budget).trimEnd();
  return `${shortened}…${suffix}`;
}

export function buildLinkFacet(text, articleUrl) {
  const index = text.indexOf(articleUrl);
  if (index < 0) throw new Error("article_url_missing_from_bluesky_text");
  const prefix = text.slice(0, index);
  return {
    index: {
      byteStart: Buffer.byteLength(prefix, "utf8"),
      byteEnd: Buffer.byteLength(prefix + articleUrl, "utf8"),
    },
    features: [{ $type: "app.bsky.richtext.facet#link", uri: articleUrl }],
  };
}

function publicImageUrl(postData) {
  const candidate = String(postData.thumbnailPath || "").replace(/\\/g, "/");
  if (/^https?:\/\//iu.test(candidate)) return candidate;
  const relative = candidate.startsWith("/images/") ? candidate : `/images/thumbnails/${postData.slug}.webp`;
  return new URL(relative, "https://sumalabo.com").toString();
}

function localImagePath(postData, root = ROOT) {
  const candidate = String(postData.thumbnailPath || "").replace(/\\/g, "/");
  if (candidate.startsWith("/images/")) return path.join(root, "public", ...candidate.slice(1).split("/"));
  if (candidate && !/^https?:\/\//iu.test(candidate)) return path.resolve(root, candidate);
  return path.join(root, "public", "images", "thumbnails", `${postData.slug}.webp`);
}

function mimeType(file) {
  const extension = path.extname(file).toLowerCase();
  return ({ ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" })[extension] || "application/octet-stream";
}

function sanitizedApiError(response) {
  const payload = response?.data;
  const api = payload?.error || payload;
  return {
    status: response?.status || 0,
    code: api?.code ?? null,
    subcode: api?.error_subcode ?? api?.subcode ?? null,
    type: api?.type || api?.error || null,
    message: api?.message || response?.error || `HTTP ${response?.status || 0}`,
  };
}

export function isThreadsTokenRefreshRequired(response) {
  const error = sanitizedApiError(response);
  return error.status === 401 || Number(error.code) === 190 || /(?:expired|invalid|malformed).{0,30}(?:token|oauth)|(?:token|oauth).{0,30}(?:expired|invalid)/iu.test(error.message);
}

async function requestJson(url, { fetchImpl, method = "GET", headers = {}, body, timeoutMs = 15_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { method, headers, body, signal: controller.signal });
    let raw = "";
    if (typeof response.text === "function") raw = await response.text();
    let data = null;
    try { data = raw ? JSON.parse(raw) : (typeof response.json === "function" ? await response.json() : null); } catch { data = raw || null; }
    return { ok: response.ok, status: response.status, data };
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error?.name === "AbortError" ? "timeout" : error?.message || String(error) };
  } finally {
    clearTimeout(timer);
  }
}

export async function refreshThreadsAccessToken({ accessToken, sourceFingerprint, authPath, authState = {}, fetchImpl = fetch, now = () => new Date() }) {
  const url = new URL(`${THREADS_GRAPH}/refresh_access_token`);
  url.searchParams.set("grant_type", "th_refresh_token");
  url.searchParams.set("access_token", accessToken);
  const response = await requestJson(url, { fetchImpl });
  if (!response.ok) {
    const error = sanitizedApiError(response);
    const health = recordThreadsRefreshFailure({ authPath, authState, now: now(), error });
    return { ok: false, tokenRefreshRequired: isThreadsTokenRefreshRequired(response), error, ...health };
  }
  const refreshedToken = response.data?.access_token || accessToken;
  const expiresInSeconds = Number(response.data?.expires_in) || 5_184_000;
  const refreshedAt = now();
  const state = recordThreadsRefreshSuccess({ authPath, authState, accessToken: refreshedToken, sourceFingerprint, expiresInSeconds, now: refreshedAt });
  return { ok: true, accessToken: refreshedToken, refreshedAt: state.refreshedAt, expiresAt: state.expiresAt };
}

function platformFailure(reason, extra = {}) {
  return { status: "failed", summaryStatus: "failed", ok: false, reason, ...extra };
}

function credentialSkip(missingVariables) {
  return { status: "skipped", summaryStatus: "skipped(未設定)", ok: true, reason: "credentials_missing", missingVariables };
}

function duplicateSkip(record) {
  return { status: "skipped", summaryStatus: "skipped(既投稿)", ok: true, reason: "already_posted", postedAt: record.postedAt, postUrl: record.postUrl || null };
}

async function waitForThreadsContainer({ containerId, accessToken, fetchImpl, sleepImpl, attempts = 6 }) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const url = new URL(`${THREADS_API}/${encodeURIComponent(containerId)}`);
    url.searchParams.set("fields", "id,status,error_message");
    url.searchParams.set("access_token", accessToken);
    const response = await requestJson(url, { fetchImpl });
    if (!response.ok) return { ok: false, response };
    const status = String(response.data?.status || "").toUpperCase();
    if (["FINISHED", "PUBLISHED"].includes(status)) return { ok: true, status, attempts: attempt };
    if (["ERROR", "EXPIRED"].includes(status)) return { ok: false, response, containerStatus: status, errorMessage: response.data?.error_message || null };
    if (attempt < attempts) await sleepImpl(2_000);
  }
  return { ok: false, containerStatus: "TIMEOUT" };
}

export async function postToThreads({ slug, text, imageUrl, altText, userId, accessToken: configuredToken, sourceFingerprint = null, authPath, authState = {}, fetchImpl = fetch, sleepImpl = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), now = () => new Date() }) {
  const refreshed = await refreshThreadsAccessToken({ accessToken: configuredToken, sourceFingerprint, authPath, authState, fetchImpl, now });
  if (!refreshed.ok && refreshed.tokenRefreshRequired) {
    return platformFailure("threads_token_expired", {
      tokenRefreshRequired: true,
      warning: "トークン更新が必要",
      error: refreshed.error,
      refreshFailureConsecutiveDays: refreshed.consecutiveFailureDays,
      setupRequired: refreshed.setupRequired,
    });
  }
  const accessToken = refreshed.ok ? refreshed.accessToken : configuredToken;
  const refreshWarning = refreshed.ok ? {} : {
    refreshFailureConsecutiveDays: refreshed.consecutiveFailureDays,
    setupRequired: refreshed.setupRequired,
  };
  const createBody = new URLSearchParams({ media_type: "IMAGE", image_url: imageUrl, text, alt_text: altText, access_token: accessToken });
  const created = await requestJson(`${THREADS_API}/${encodeURIComponent(userId)}/threads`, {
    fetchImpl,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: createBody,
  });
  if (!created.ok || !created.data?.id) {
    const tokenRefreshRequired = isThreadsTokenRefreshRequired(created);
    return platformFailure("threads_container_create_failed", { tokenRefreshRequired, ...(tokenRefreshRequired ? { warning: "トークン更新が必要" } : {}), ...refreshWarning, error: sanitizedApiError(created) });
  }
  const ready = await waitForThreadsContainer({ containerId: created.data.id, accessToken, fetchImpl, sleepImpl });
  if (!ready.ok) {
    const tokenRefreshRequired = ready.response ? isThreadsTokenRefreshRequired(ready.response) : false;
    return platformFailure("threads_container_not_ready", { containerId: created.data.id, containerStatus: ready.containerStatus || null, tokenRefreshRequired, ...(tokenRefreshRequired ? { warning: "トークン更新が必要" } : {}), ...refreshWarning });
  }
  const publishBody = new URLSearchParams({ creation_id: created.data.id, access_token: accessToken });
  const published = await requestJson(`${THREADS_API}/${encodeURIComponent(userId)}/threads_publish`, {
    fetchImpl,
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body: publishBody,
  });
  if (!published.ok || !published.data?.id) {
    const tokenRefreshRequired = isThreadsTokenRefreshRequired(published);
    return platformFailure("threads_publish_failed", { tokenRefreshRequired, ...(tokenRefreshRequired ? { warning: "トークン更新が必要" } : {}), ...refreshWarning, error: sanitizedApiError(published) });
  }
  const permalinkUrl = new URL(`${THREADS_API}/${encodeURIComponent(published.data.id)}`);
  permalinkUrl.searchParams.set("fields", "permalink");
  permalinkUrl.searchParams.set("access_token", accessToken);
  const permalink = await requestJson(permalinkUrl, { fetchImpl });
  return {
    status: "success",
    summaryStatus: "success",
    ok: true,
    reason: "threads_published",
    slug,
    postId: published.data.id,
    postUrl: permalink.ok ? permalink.data?.permalink || null : null,
    containerId: created.data.id,
    postedAt: now().toISOString(),
    textLength: graphemeLength(text),
    imageUrl,
    ...refreshWarning,
    tokenRefresh: refreshed.ok ? { status: "success", refreshedAt: refreshed.refreshedAt, expiresAt: refreshed.expiresAt } : { status: "warning", reason: "refresh_failed_but_current_token_worked" },
  };
}

function postUrlFromAtUri(uri, handle) {
  const rkey = String(uri || "").split("/").at(-1);
  return rkey ? `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}` : null;
}

export async function postToBluesky({ slug, text, articleUrl, cardTitle, cardDescription, imagePath, handle, appPassword, fetchImpl = fetch, now = () => new Date() }) {
  if (!existsSync(imagePath)) return platformFailure("bluesky_image_missing", { imagePath });
  const image = await readFile(imagePath);
  if (image.length > 1_000_000) return platformFailure("bluesky_image_too_large", { imageBytes: image.length, maximumBytes: 1_000_000 });
  const session = await requestJson(`${BLUESKY_API}/com.atproto.server.createSession`, {
    fetchImpl,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: handle, password: appPassword }),
  });
  if (!session.ok || !session.data?.accessJwt || !session.data?.did) return platformFailure("bluesky_create_session_failed", { error: sanitizedApiError(session) });
  const authorization = { Authorization: `Bearer ${session.data.accessJwt}` };
  const upload = await requestJson(`${BLUESKY_API}/com.atproto.repo.uploadBlob`, {
    fetchImpl,
    method: "POST",
    headers: { ...authorization, "Content-Type": mimeType(imagePath) },
    body: image,
  });
  if (!upload.ok || !upload.data?.blob) return platformFailure("bluesky_image_upload_failed", { error: sanitizedApiError(upload) });
  const createdAt = now().toISOString();
  const record = {
    $type: "app.bsky.feed.post",
    text,
    createdAt,
    langs: ["ja"],
    facets: [buildLinkFacet(text, articleUrl)],
    embed: {
      $type: "app.bsky.embed.external",
      external: {
        uri: articleUrl,
        title: cardTitle,
        description: cardDescription,
        thumb: upload.data.blob,
      },
    },
  };
  const posted = await requestJson(`${BLUESKY_API}/com.atproto.repo.createRecord`, {
    fetchImpl,
    method: "POST",
    headers: { ...authorization, "Content-Type": "application/json" },
    body: JSON.stringify({ repo: session.data.did, collection: "app.bsky.feed.post", record }),
  });
  if (!posted.ok || !posted.data?.uri) return platformFailure("bluesky_post_failed", { error: sanitizedApiError(posted) });
  return {
    status: "success",
    summaryStatus: "success",
    ok: true,
    reason: "bluesky_published",
    slug,
    uri: posted.data.uri,
    cid: posted.data.cid || null,
    postUrl: postUrlFromAtUri(posted.data.uri, handle),
    postedAt: createdAt,
    textLength: graphemeLength(text),
    imageMode: "external_card_thumbnail",
  };
}

function summarize(platforms) {
  return `social: threads=${platforms.threads.summaryStatus}, bluesky=${platforms.bluesky.summaryStatus}`;
}

export async function runSocialPostStep({
  slug,
  env = process.env,
  root = ROOT,
  ledgerPath = resolveSocialLedgerPath(env),
  threadsAuthPath = resolveThreadsAuthPath(env),
  blueskyAuthPath = resolveBlueskyAuthPath(env),
  postData = null,
  articleMeta = null,
  fetchImpl = fetch,
  sleepImpl,
  now = () => new Date(),
} = {}) {
  const startedAt = now().toISOString();
  const threadsCredentials = resolveThreadsCredentials({ env, authPath: threadsAuthPath, now: now() });
  const blueskyCredentials = resolveBlueskyCredentials({ env, authPath: blueskyAuthPath });
  const platforms = {
    threads: threadsCredentials.missing.length ? credentialSkip(threadsCredentials.missing) : null,
    bluesky: blueskyCredentials.missing.length ? credentialSkip(blueskyCredentials.missing) : null,
  };
  let ledger;
  try { ledger = readSocialLedger(ledgerPath); }
  catch (error) {
    for (const platform of ["threads", "bluesky"]) {
      if (!platforms[platform]) platforms[platform] = platformFailure("social_ledger_unavailable", { detail: error?.message || String(error) });
    }
    const failedPlatforms = Object.entries(platforms).filter(([, value]) => value.status === "failed").map(([name]) => name);
    return {
      schemaVersion: 1, status: "warning", ok: false, reason: `social_failed:${failedPlatforms.join(",")}`,
      slug, startedAt, finishedAt: now().toISOString(), summary: summarize(platforms), failedPlatforms, platforms,
    };
  }
  for (const platform of ["threads", "bluesky"]) {
    if (!platforms[platform] && isAlreadyPosted(ledger, platform, slug)) platforms[platform] = duplicateSkip(ledger.platforms[platform][slug]);
  }
  if (!platforms.threads || !platforms.bluesky) {
    try {
      if (!postData) postData = loadOrGenerateXPost(slug, root);
      if (!articleMeta) articleMeta = loadArticleMeta(slug, root, postData);
    } catch (error) {
      for (const platform of ["threads", "bluesky"]) {
        if (!platforms[platform]) platforms[platform] = platformFailure("social_content_preparation_failed", { detail: error?.message || String(error) });
      }
    }
    if (!platforms.threads) {
      try {
        const threadsText = fitPostText(postData.primary?.text, postData.articleUrl, PLATFORM_LIMITS.threads);
        const threadsAccess = threadsCredentials.accessToken;
        platforms.threads = await postToThreads({
          slug,
          text: threadsText,
          imageUrl: publicImageUrl(postData),
          altText: articleMeta.title,
          userId: threadsCredentials.userId,
          accessToken: threadsAccess,
          sourceFingerprint: threadsCredentials.sourceFingerprint,
          authPath: threadsCredentials.authPath,
          authState: threadsCredentials.state,
          fetchImpl,
          sleepImpl,
          now,
        });
        if (platforms.threads.status === "success") recordSocialPost({ ledgerPath, platform: "threads", slug, record: platforms.threads });
      } catch (error) {
        platforms.threads = platformFailure("threads_step_exception", { detail: error?.message || String(error) });
      }
    }
    if (!platforms.bluesky) {
      try {
        const blueskyText = fitPostText(postData.primary?.text, postData.articleUrl, PLATFORM_LIMITS.bluesky);
        platforms.bluesky = await postToBluesky({
          slug,
          text: blueskyText,
          articleUrl: postData.articleUrl,
          cardTitle: articleMeta.title,
          cardDescription: articleMeta.description,
          imagePath: localImagePath(postData, root),
          handle: blueskyCredentials.handle,
          appPassword: blueskyCredentials.appPassword,
          fetchImpl,
          now,
        });
        if (platforms.bluesky.status === "success") recordSocialPost({ ledgerPath, platform: "bluesky", slug, record: platforms.bluesky });
      } catch (error) {
        platforms.bluesky = platformFailure("bluesky_step_exception", { detail: error?.message || String(error) });
      }
    }
  }
  const failedPlatforms = Object.entries(platforms).filter(([, value]) => value.status === "failed").map(([name]) => name);
  const allSkipped = Object.values(platforms).every((value) => value.status === "skipped");
  return {
    schemaVersion: 1,
    status: failedPlatforms.length ? "warning" : allSkipped ? "skipped" : "success",
    ok: failedPlatforms.length === 0,
    reason: failedPlatforms.length ? `social_failed:${failedPlatforms.join(",")}` : allSkipped ? "all_platforms_skipped" : "social_step_completed",
    slug,
    startedAt,
    finishedAt: now().toISOString(),
    summary: summarize(platforms),
    failedPlatforms,
    platforms,
  };
}

function loadOrGenerateXPost(slug, root) {
  const file = path.join(root, "logs", "social", `${slug}.x-post.json`);
  if (!existsSync(file)) {
    const generated = spawnSync(process.execPath, [path.join(root, "scripts", "run", "generate-x-post.mjs"), "--slug", slug], { cwd: root, encoding: "utf8", windowsHide: true });
    if (![0, 3].includes(generated.status) || !existsSync(file)) throw new Error(`x_post_generation_failed:${generated.status}`);
  }
  return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/u, ""));
}

function loadArticleMeta(slug, root, postData) {
  const raw = readFileSync(path.join(root, "content", "articles", `${slug}.mdx`), "utf8");
  const { fm } = extractFrontmatter(raw);
  return {
    title: String(fm.title || postData.primary?.text?.split(/\r?\n/u)[0] || slug).slice(0, 300),
    description: String(fm.description || "すまラボの記事を読む").slice(0, 1_000),
  };
}

function parseArgs(argv) {
  const args = { slug: null, output: null };
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index];
    if (value.startsWith("--slug=")) args.slug = value.slice(7).trim();
    else if (value === "--slug") args.slug = argv[++index]?.trim();
    else if (value.startsWith("--output=")) args.output = value.slice(9).trim();
    else if (value === "--output") args.output = argv[++index]?.trim();
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let result;
  try {
    if (!/^[a-z0-9][a-z0-9-]*$/iu.test(args.slug || "")) throw new Error("invalid_slug");
    result = await runSocialPostStep({ slug: args.slug });
  } catch (error) {
    const failed = platformFailure("social_step_exception");
    result = {
      schemaVersion: 1,
      status: "warning",
      ok: false,
      reason: "social_step_exception",
      detail: error?.message || String(error),
      slug: args.slug,
      finishedAt: new Date().toISOString(),
      platforms: { threads: failed, bluesky: failed },
    };
    result.summary = summarize(result.platforms);
  }
  if (args.output) atomicWriteJson(path.resolve(args.output), result);
  console.log(JSON.stringify(result, null, 2));
  const failed = Object.values(result.platforms || {}).filter((value) => value?.status === "failed");
  if (failed.length) {
    const setupWarning = result.platforms?.threads?.setupRequired ? " / setup-social-auth.mjs の再実行が必要" : "";
    const tokenWarning = result.platforms?.threads?.tokenRefreshRequired ? " / Threadsトークン更新が必要" : "";
    try {
      const { notifyAutonomyEvent } = await import("./autonomy-notify.mjs");
      await notifyAutonomyEvent({ slug: args.slug || "social-post", status: "warning", title: `[夜間run] ${result.summary}${tokenWarning}${setupWarning}` });
    } catch {
      // Notification failure is evidence-only and cannot change this fail-soft step.
    }
  }
  process.exitCode = 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
