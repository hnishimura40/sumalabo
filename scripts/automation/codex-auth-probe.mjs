#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";
import { probeGitHubToken } from "./github-token-probe.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CODEX_EXE = process.env.CODEX_EXE || "C:\\Users\\hnish\\AppData\\Roaming\\npm\\node_modules\\@openai\\codex\\node_modules\\@openai\\codex-win32-x64\\vendor\\x86_64-pc-windows-msvc\\bin\\codex.exe";
const startedAt = new Date().toISOString();
const github = await probeGitHubToken();
const codexEnv = { ...process.env };
delete codexEnv.GH_TOKEN;
delete codexEnv.GH_TOKEN_EXPIRES_AT;
const result = spawnSync(CODEX_EXE, [
  "exec", "--ephemeral", "--sandbox", "read-only", "--skip-git-repo-check",
  "--color", "never", "-C", ROOT, "-",
], {
  cwd: ROOT,
  input: "Reply with exactly CODEX_AUTH_PROBE_OK and nothing else. Do not use any tools.",
  encoding: "utf8",
  windowsHide: true,
  timeout: 120000,
  env: codexEnv,
});
const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
const authFailure = /(?:\b401\b|unauthorized|oauth[^\n]*expired|authentication required|not logged in|login required)/i.test(output);
const ok = result.status === 0 && /(?:^|\s)CODEX_AUTH_PROBE_OK(?:\s|$)/.test(output);
const kind = ok ? "ok" : authFailure ? "oauth_401" : result.error?.code === "ETIMEDOUT" ? "timeout" : "probe_failed";
const combinedOk = ok && github.ok;
const combinedExitCode = !ok ? (authFailure ? 41 : 42) : github.exitCode;
const record = {
  schemaVersion: 3,
  actor: "codex",
  startedAt,
  finishedAt: new Date().toISOString(),
  outcome: combinedOk ? "success" : "failed",
  kind: combinedOk ? "ok" : !github.ok ? github.kind : kind,
  exitCode: combinedExitCode,
  codexExitCode: result.status ?? 1,
  github,
};
const dir = path.join(ROOT, "logs", "night", "auth-probe");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, `${startedAt.slice(0, 10)}.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
if (!ok) {
  await notifyAutonomyEvent({
    slug: "night-codex-auth-probe",
    status: "failed",
    title: authFailure
      ? "[night-auth] Codex non-interactive probe returned 401; sign-in required"
      : `[night-auth] Codex non-interactive probe failed (${kind})`,
  });
}
if (!github.ok) {
  await notifyAutonomyEvent({
    slug: "night-github-token-probe",
    status: "failed",
    title: github.kind === "gh_token_expiring"
      ? `[night-auth] GitHub PAT expires in ${github.daysRemaining} days (${github.expiresAt})`
      : `[night-auth] GitHub PAT probe failed (${github.kind})`,
  });
}
console.log(JSON.stringify(record));
process.exitCode = combinedExitCode;
