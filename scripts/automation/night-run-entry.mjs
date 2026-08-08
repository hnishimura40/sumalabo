#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { OUTCOMES, outcomeFile, recordRunOutcome } from "./night-run-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function run(command, args) {
  return spawnSync(command, args, { cwd: ROOT, encoding: "utf8", windowsHide: true });
}

function runIdFor(date) {
  const pad = (value, width = 2) => String(value).padStart(width, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
}

function fail(runId, startedAt, reason, detail) {
  recordRunOutcome({ runId, outcome: OUTCOMES.FAILED, reason, detail }, { root: ROOT, startedAt });
  console.error(`[night-entry] ${reason}`);
  process.exitCode = 30;
}

const started = new Date();
const startedAt = started.toISOString();
const runId = runIdFor(started);
process.env.SUMALABO_NIGHT_RUN_ID = runId;
process.env.SUMALABO_NIGHT_RUN_STARTED_AT = startedAt;

const status = run("git", ["status", "--porcelain", "--untracked-files=normal"]);
if (status.status !== 0) fail(runId, startedAt, "runner_clone_status_failed", String(status.stderr || "").trim());
else if (String(status.stdout || "").trim()) fail(runId, startedAt, "runner_clone_dirty", String(status.stdout).trim().slice(0, 2000));
else {
  const fetch = run("git", ["fetch", "origin", "main", "--prune"]);
  if (fetch.status !== 0) fail(runId, startedAt, "runner_clone_fetch_failed", String(fetch.stderr || "").trim());
  else {
    const checkout = run("git", ["checkout", "--detach", "origin/main"]);
    if (checkout.status !== 0) fail(runId, startedAt, "runner_clone_checkout_failed", String(checkout.stderr || "").trim());
    else {
      const nodeModules = path.join(ROOT, "node_modules");
      const lockFile = path.join(ROOT, "package-lock.json");
      const marker = path.join(ROOT, "logs", "night", "runner-package-lock.sha256");
      const lockHash = existsSync(lockFile) ? crypto.createHash("sha256").update(readFileSync(lockFile)).digest("hex") : "no-lockfile";
      const installedHash = existsSync(marker) ? readFileSync(marker, "utf8").trim() : "";
      if (!existsSync(nodeModules) || installedHash !== lockHash) {
        const install = run("npm.cmd", ["ci", "--no-audit", "--no-fund"]);
        if (install.status !== 0) {
          fail(runId, startedAt, "runner_clone_dependency_install_failed", String(install.stderr || install.stdout || "").trim().slice(-4000));
        } else {
          mkdirSync(path.dirname(marker), { recursive: true });
          writeFileSync(marker, `${lockHash}\n`, "utf8");
        }
      }
      if (process.exitCode !== 30) {
        const shell = spawnSync("powershell.exe", [
          "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
          path.join(ROOT, "scripts", "automation", "night-run.ps1"),
        ], { cwd: ROOT, stdio: "inherit", windowsHide: true, env: process.env });
        if (!existsSync(outcomeFile(runId, ROOT))) {
          fail(runId, startedAt, "night_run_returned_without_contract", `exit=${shell.status ?? 1}`);
        } else {
          process.exitCode = shell.status ?? 30;
        }
      }
    }
  }
}
