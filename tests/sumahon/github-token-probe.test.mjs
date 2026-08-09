import assert from "node:assert/strict";
import test from "node:test";
import { probeGitHubToken } from "../../scripts/automation/github-token-probe.mjs";

function fetchOk(url) {
  return Promise.resolve({ ok: true, status: 200, json: async () => url.endsWith("/user") ? { login: "night-publisher" } : {} });
}

test("GitHub token probe never returns the token and reports remaining days", async () => {
  const token = "github_pat_test_only";
  const result = await probeGitHubToken({ token, expiresAt: "2026-09-01", now: new Date("2026-08-09T00:00:00Z"), fetchImpl: fetchOk });
  assert.equal(result.ok, true);
  assert.equal(result.daysRemaining, 23);
  assert.equal(JSON.stringify(result).includes(token), false);
});

test("GitHub token probe warns before expiry", async () => {
  const result = await probeGitHubToken({ token: "github_pat_test_only", expiresAt: "2026-08-20", warnDays: 14, now: new Date("2026-08-09T00:00:00Z"), fetchImpl: fetchOk });
  assert.equal(result.ok, false);
  assert.equal(result.kind, "gh_token_expiring");
  assert.equal(result.exitCode, 45);
});

test("GitHub token probe fails closed on missing token or expiry metadata", async () => {
  assert.equal((await probeGitHubToken({ token: "", expiresAt: "2026-09-01", fetchImpl: fetchOk })).exitCode, 41);
  assert.equal((await probeGitHubToken({ token: "github_pat_test_only", expiresAt: "", fetchImpl: fetchOk })).exitCode, 43);
});
