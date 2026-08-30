import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const DEFAULT_HTTP_INTERVAL_MS = 15_000;
const DEFAULT_HTTP_MAX_WAIT_MS = 10 * 60_000;

function readJson(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/u, "")); }
  catch { return fallback; }
}

export function previewVerificationPolicy(root) {
  const environment = readJson(path.join(root, "config", "night-environment.json"), {});
  const policy = environment?.previewVerification || {};
  return {
    deploymentPollIntervalMs: Number(policy.deploymentPollIntervalSeconds || 5) * 1000,
    deploymentMaxWaitMs: Number(policy.deploymentMaxWaitSeconds || 180) * 1000,
    httpRetryIntervalMs: Number(policy.httpRetryIntervalSeconds || 15) * 1000,
    httpMaxWaitMs: Number(policy.httpMaxWaitSeconds || 600) * 1000,
  };
}

export function previewBuildNowFromMdx(mdxText, now = new Date()) {
  const match = String(mdxText || "").match(/^publishAt:\s*["']?([^"'\r\n]+)["']?\s*$/m);
  const publishTime = match ? Date.parse(match[1].trim()) : Number.NaN;
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));
  const effectiveNow = Number.isFinite(nowMs) ? nowMs : Date.now();
  if (!Number.isFinite(publishTime) || publishTime <= effectiveNow) return new Date(effectiveNow).toISOString();
  return new Date(publishTime + 1000).toISOString();
}

export function previewBuildEnvironment({ root, slug, env = process.env, now = new Date() }) {
  const articleFile = path.join(root, "content", "articles", `${slug}.mdx`);
  const mdx = existsSync(articleFile) ? readFileSync(articleFile, "utf8") : "";
  return {
    ...env,
    SUMALAB_BUILD_TARGET: "preview",
    SUMALAB_PREVIEW_SLUG: slug,
    SUMALAB_NOW: previewBuildNowFromMdx(mdx, now),
  };
}

export async function waitForPreviewUrl({
  verify,
  url,
  slug,
  titlePrefix = "",
  intervalMs = DEFAULT_HTTP_INTERVAL_MS,
  maxWaitMs = DEFAULT_HTTP_MAX_WAIT_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now = () => Date.now(),
  onRetry = () => {},
} = {}) {
  if (typeof verify !== "function") throw new Error("preview verify function is required");
  const startedAtMs = now();
  let attempts = 0;
  let last = null;
  while (true) {
    attempts += 1;
    last = await verify({ url, slug, titlePrefix });
    const elapsedMs = Math.max(0, now() - startedAtMs);
    if (last?.ok) return { ...last, attempts, elapsedMs, maxWaitMs, intervalMs };
    if (elapsedMs >= maxWaitMs) return { ...(last || {}), ok: false, attempts, elapsedMs, maxWaitMs, intervalMs };
    const waitMs = Math.min(intervalMs, Math.max(0, maxWaitMs - elapsedMs));
    onRetry({ attempt: attempts, waitMs, elapsedMs, result: last });
    await sleep(waitMs);
  }
}

export function pendingPublishStatePath({ root, env = process.env } = {}) {
  const configured = readJson(path.join(root, "config", "night-environment.json"), {})?.pendingPublish?.pathTemplate;
  const profile = String(env.USERPROFILE || os.homedir()).trim();
  return String(configured || "%USERPROFILE%\\.sumalabo\\state\\pending-publish.json")
    .replace(/%USERPROFILE%/gi, profile);
}

function safeSlug(slug) {
  const value = String(slug || "").trim();
  if (!/^20\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error("invalid pending publish slug");
  return value;
}

export function recordPendingPublish({
  root,
  slug,
  branch,
  commitSha = null,
  prUrl = null,
  previewUrl = null,
  deployment = null,
  reason,
  status = null,
  stateFile = null,
  now = new Date(),
} = {}) {
  const normalizedSlug = safeSlug(slug);
  const file = stateFile || pendingPublishStatePath({ root });
  const current = readJson(file, { schemaVersion: 1, items: {} });
  const recordedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const item = {
    slug: normalizedSlug,
    state: "pending",
    branch,
    commitSha,
    prUrl,
    artifactPaths: [
      `content/articles/${normalizedSlug}.mdx`,
      `public/images/articles/${normalizedSlug}`,
      `public/images/thumbnails/${normalizedSlug}.webp`,
      `drafts/refinement/${normalizedSlug}`,
    ],
    preview: {
      url: previewUrl,
      deploymentId: deployment?.id || null,
      deploymentStatus: deployment?.status || deployment?.latestStage?.status || null,
      deploymentCreatedAt: deployment?.createdAt || null,
      deploymentCompletedAt: deployment?.completedAt || null,
    },
    failure: { reason: String(reason || "preview_publication_failed"), httpStatus: status || null, recordedAt },
    resumeCommand: `node scripts/automation/phase-a-outer-publish.mjs --resume-pending --slug ${normalizedSlug}`,
  };
  const next = {
    schemaVersion: 1,
    updatedAt: recordedAt,
    items: { ...(current?.items || {}), [normalizedSlug]: item },
  };
  mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
  return { ok: true, stateFile: file, item };
}

export function markPendingPublishResolved({ root, slug, stateFile = null, now = new Date() } = {}) {
  const normalizedSlug = safeSlug(slug);
  const file = stateFile || pendingPublishStatePath({ root });
  const current = readJson(file, null);
  if (!current?.items?.[normalizedSlug]) return { ok: true, changed: false, stateFile: file };
  current.items[normalizedSlug].state = "resolved";
  current.items[normalizedSlug].resolvedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  current.updatedAt = current.items[normalizedSlug].resolvedAt;
  const temporary = `${file}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(current, null, 2)}\n`, "utf8");
  renameSync(temporary, file);
  return { ok: true, changed: true, stateFile: file };
}
