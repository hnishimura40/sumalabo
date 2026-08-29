import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { NIGHT_ENVIRONMENT } from "./night-environment.mjs";

export function expandSocialStatePath(template, env = process.env) {
  const profile = env.USERPROFILE || os.homedir();
  return path.resolve(String(template).replace(/%USERPROFILE%/giu, profile));
}

export function resolveThreadsAuthPath(env = process.env) {
  return env.SUMALABO_THREADS_AUTH_PATH || expandSocialStatePath(NIGHT_ENVIRONMENT.threadsAuth.pathTemplate, env);
}

export function resolveBlueskyAuthPath(env = process.env) {
  return env.SUMALABO_BLUESKY_AUTH_PATH || expandSocialStatePath(NIGHT_ENVIRONMENT.blueskyAuth.pathTemplate, env);
}

export function readAuthState(file) {
  try {
    const value = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/u, ""));
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

export function writePrivateJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(temporary, file);
}

export function tokenFingerprint(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function resolveThreadsCredentials({ env = process.env, authPath = resolveThreadsAuthPath(env), now = new Date() } = {}) {
  const state = readAuthState(authPath) || {};
  const envToken = String(env.THREADS_ACCESS_TOKEN || "").trim();
  const stateTokenIsRefreshedOverride = envToken
    && state.sourceFingerprint === tokenFingerprint(envToken)
    && state.accessToken
    && (!state.expiresAt || Date.parse(state.expiresAt) > now.getTime());
  const selectedCredential = stateTokenIsRefreshedOverride ? state.accessToken : envToken || state.accessToken;
  const userId = String(env.THREADS_USER_ID || state.userId || "").trim();
  const missing = [];
  if (!userId) missing.push("THREADS_USER_ID/threads-auth.json:userId");
  if (!selectedCredential) missing.push("THREADS_ACCESS_TOKEN/threads-auth.json:accessToken");
  return {
    authPath,
    state,
    userId,
    accessToken: selectedCredential || "",
    sourceFingerprint: envToken ? tokenFingerprint(envToken) : null,
    source: stateTokenIsRefreshedOverride ? "refreshed_environment_override" : envToken ? "environment_override" : "threads-auth.json",
    missing,
  };
}

export function resolveBlueskyCredentials({ env = process.env, authPath = resolveBlueskyAuthPath(env) } = {}) {
  const state = readAuthState(authPath) || {};
  const handle = String(env.BLUESKY_HANDLE || state.handle || "").trim();
  const appPassword = String(env.BLUESKY_APP_PASSWORD || state.appPassword || "").trim();
  const missing = [];
  if (!handle) missing.push("BLUESKY_HANDLE/bluesky-auth.json:handle");
  if (!appPassword) missing.push("BLUESKY_APP_PASSWORD/bluesky-auth.json:appPassword");
  return {
    authPath,
    state,
    handle,
    appPassword,
    source: env.BLUESKY_HANDLE || env.BLUESKY_APP_PASSWORD ? "environment_override" : "bluesky-auth.json",
    missing,
  };
}

function calendarDateInTokyo(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function isNextCalendarDay(previous, current) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(previous || "")) return false;
  return Date.parse(`${current}T00:00:00Z`) - Date.parse(`${previous}T00:00:00Z`) === 86_400_000;
}

export function recordThreadsRefreshFailure({ authPath, authState = {}, now = new Date(), error = null }) {
  const today = calendarDateInTokyo(now);
  const previous = authState.refreshHealth || {};
  const consecutiveFailureDays = previous.lastFailureDate === today
    ? Math.max(1, Number(previous.consecutiveFailureDays) || 1)
    : isNextCalendarDay(previous.lastFailureDate, today)
      ? Math.max(1, Number(previous.consecutiveFailureDays) || 1) + 1
      : 1;
  const next = {
    ...authState,
    schemaVersion: 1,
    refreshHealth: {
      ...previous,
      consecutiveFailureDays,
      lastFailureDate: today,
      lastFailureAt: now.toISOString(),
      lastError: error ? {
        status: Number(error.status) || 0,
        code: error.code ?? null,
        type: error.type || null,
        message: String(error.message || "refresh_failed").slice(0, 500),
      } : null,
    },
  };
  writePrivateJson(authPath, next);
  return { state: next, consecutiveFailureDays, setupRequired: consecutiveFailureDays >= 2 };
}

export function recordThreadsRefreshSuccess({ authPath, authState = {}, accessToken, sourceFingerprint = null, expiresInSeconds, now = new Date() }) {
  const refreshedAt = now.toISOString();
  const next = {
    ...authState,
    schemaVersion: 1,
    accessToken,
    refreshedAt,
    expiresAt: new Date(now.getTime() + expiresInSeconds * 1000).toISOString(),
    expiresInSeconds,
    ...(sourceFingerprint ? { sourceFingerprint } : {}),
    refreshHealth: {
      ...(authState.refreshHealth || {}),
      consecutiveFailureDays: 0,
      lastSuccessAt: refreshedAt,
      lastError: null,
    },
  };
  writePrivateJson(authPath, next);
  return next;
}
