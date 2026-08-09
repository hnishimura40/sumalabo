#!/usr/bin/env node
import process from "node:process";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const GH_TOKEN_EXIT = Object.freeze({ ok: 0, missing: 41, invalid: 42, expiryMetadata: 43, expired: 44, expiring: 45, repoDenied: 46 });

function expiryResult(expiresAt, now, warnDays) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expiresAt || ""))) {
    return { ok: false, kind: "gh_token_expiry_missing", exitCode: GH_TOKEN_EXIT.expiryMetadata, expiresAt: null, daysRemaining: null };
  }
  const expires = new Date(`${expiresAt}T00:00:00Z`);
  if (Number.isNaN(expires.getTime()) || expires.toISOString().slice(0, 10) !== expiresAt) {
    return { ok: false, kind: "gh_token_expiry_invalid", exitCode: GH_TOKEN_EXIT.expiryMetadata, expiresAt: null, daysRemaining: null };
  }
  const daysRemaining = Math.ceil((expires.getTime() - now.getTime()) / 86400000);
  if (daysRemaining <= 0) return { ok: false, kind: "gh_token_expired", exitCode: GH_TOKEN_EXIT.expired, expiresAt: expires, daysRemaining };
  if (daysRemaining <= warnDays) return { ok: false, kind: "gh_token_expiring", exitCode: GH_TOKEN_EXIT.expiring, expiresAt: expires, daysRemaining };
  return { ok: true, kind: "ok", exitCode: 0, expiresAt: expires, daysRemaining };
}

export async function probeGitHubToken({
  token = process.env.GH_TOKEN,
  expiresAt = process.env.GH_TOKEN_EXPIRES_AT,
  warnDays = Number(process.env.GH_TOKEN_WARN_DAYS || 14),
  now = new Date(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!token) return { ok: false, kind: "gh_token_missing", exitCode: GH_TOKEN_EXIT.missing, expiresAt: null, daysRemaining: null };
  if (!String(token).startsWith("github_pat_")) return { ok: false, kind: "gh_token_not_fine_grained", exitCode: GH_TOKEN_EXIT.invalid, expiresAt: null, daysRemaining: null };
  const expiry = expiryResult(expiresAt, now, Number.isFinite(warnDays) ? warnDays : 14);
  if (expiry.exitCode === GH_TOKEN_EXIT.expiryMetadata || expiry.exitCode === GH_TOKEN_EXIT.expired) {
    return { ok: false, kind: expiry.kind, exitCode: expiry.exitCode, expiresAt: expiry.expiresAt?.toISOString().slice(0, 10) || null, daysRemaining: expiry.daysRemaining };
  }
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sumalabo-night-auth-probe",
  };
  let user;
  try { user = await fetchImpl("https://api.github.com/user", { headers }); }
  catch { return { ok: false, kind: "gh_token_network_error", exitCode: GH_TOKEN_EXIT.invalid, expiresAt: expiry.expiresAt?.toISOString().slice(0, 10) || null, daysRemaining: expiry.daysRemaining }; }
  if (!user.ok) return { ok: false, kind: `gh_token_http_${user.status}`, exitCode: GH_TOKEN_EXIT.invalid, expiresAt: expiry.expiresAt?.toISOString().slice(0, 10) || null, daysRemaining: expiry.daysRemaining };
  let identity = null;
  try { identity = (await user.json())?.login || null; } catch {}
  let repo;
  try { repo = await fetchImpl("https://api.github.com/repos/hnishimura40/sumalabo", { headers }); }
  catch { return { ok: false, kind: "gh_repo_network_error", exitCode: GH_TOKEN_EXIT.repoDenied, identity, expiresAt: expiry.expiresAt?.toISOString().slice(0, 10) || null, daysRemaining: expiry.daysRemaining }; }
  if (!repo.ok) return { ok: false, kind: `gh_repo_http_${repo.status}`, exitCode: GH_TOKEN_EXIT.repoDenied, identity, expiresAt: expiry.expiresAt?.toISOString().slice(0, 10) || null, daysRemaining: expiry.daysRemaining };
  return {
    ok: expiry.ok,
    kind: expiry.kind,
    exitCode: expiry.exitCode,
    identity,
    repository: "hnishimura40/sumalabo",
    expiresAt: expiry.expiresAt?.toISOString().slice(0, 10) || null,
    daysRemaining: expiry.daysRemaining,
  };
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  const result = await probeGitHubToken();
  console.log(JSON.stringify(result));
  process.exitCode = result.exitCode;
}
