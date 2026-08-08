#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CLAUDE_EXE = process.env.CLAUDE_EXE || "C:\\Users\\hnish\\.local\\bin\\claude.exe";
const startedAt = new Date().toISOString();
const result = spawnSync(CLAUDE_EXE, [
  "-p", "--model", "claude-opus-4-8", "--no-chrome", "--max-turns", "1", "--output-format", "text",
], {
  cwd: ROOT,
  input: "Reply with exactly AUTH_PROBE_OK and nothing else.",
  encoding: "utf8",
  windowsHide: true,
  timeout: 120000,
});
const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
const authFailure = /(?:\b401\b|unauthorized|oauth[^\n]*expired|authentication required|not logged in)/i.test(output);
const ok = result.status === 0 && /(?:^|\s)AUTH_PROBE_OK(?:\s|$)/.test(output);
const kind = ok ? "ok" : authFailure ? "oauth_401" : result.error?.code === "ETIMEDOUT" ? "timeout" : "probe_failed";
const record = {
  schemaVersion: 1,
  startedAt,
  finishedAt: new Date().toISOString(),
  outcome: ok ? "success" : "failed",
  kind,
  exitCode: result.status ?? 1,
};
const dir = path.join(ROOT, "logs", "night", "auth-probe");
mkdirSync(dir, { recursive: true });
writeFileSync(path.join(dir, `${startedAt.slice(0, 10)}.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
if (!ok) {
  await notifyAutonomyEvent({
    slug: "night-claude-auth-probe",
    status: "failed",
    title: authFailure
      ? "[night-auth] Claude CLI non-interactive probe returned 401; sign-in required"
      : `[night-auth] Claude CLI non-interactive probe failed (${kind})`,
  });
}
console.log(JSON.stringify(record));
process.exitCode = ok ? 0 : authFailure ? 41 : 42;
