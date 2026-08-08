#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const RUNNER_ROOT = process.env.SUMALABO_NIGHT_RUNNER_ROOT || "D:\\work\\sumalabo-night-runner";
export const ENTRY_ROOT = process.env.SUMALABO_NIGHT_ENTRY_ROOT || "D:\\work";
const PRIVATE_RUNTIME_FILES = [
  "data/automation/autonomy.json",
  "data/automation/ledger.json",
  "data/automation/scout-picked.json",
  "data/automation/sumahon-queue.json",
  "data/automation/processed-urls.json",
  "logs/night/last-run.json",
  "logs/night/run-history.jsonl",
];

function run(command, args, cwd = SOURCE_ROOT) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed: ${String(result.stderr || result.stdout || "").trim()}`);
  return String(result.stdout || "").trim();
}

export function assertAscii(file) {
  const bytes = readFileSync(file);
  if ([...bytes].some((value) => value > 0x7f)) throw new Error(`entry wrapper is not ASCII-only: ${file}`);
}

export function prepareRunner() {
  mkdirSync(path.dirname(RUNNER_ROOT), { recursive: true });
  if (!existsSync(path.join(RUNNER_ROOT, ".git"))) {
    const remote = run("git", ["remote", "get-url", "origin"]);
    run("git", ["clone", remote, RUNNER_ROOT], path.dirname(RUNNER_ROOT));
  }
  const dirty = run("git", ["status", "--porcelain", "--untracked-files=normal"], RUNNER_ROOT);
  if (dirty) throw new Error(`dedicated runner clone is dirty:\n${dirty}`);
  run("git", ["fetch", "origin", "main", "--prune"], RUNNER_ROOT);
  run("git", ["checkout", "--detach", "origin/main"], RUNNER_ROOT);
  if (!existsSync(path.join(RUNNER_ROOT, "node_modules"))) run("npm.cmd", ["ci", "--no-audit", "--no-fund"], RUNNER_ROOT);
  const lockFile = path.join(RUNNER_ROOT, "package-lock.json");
  const lockHash = existsSync(lockFile) ? crypto.createHash("sha256").update(readFileSync(lockFile)).digest("hex") : "no-lockfile";
  const lockMarker = path.join(RUNNER_ROOT, "logs", "night", "runner-package-lock.sha256");
  mkdirSync(path.dirname(lockMarker), { recursive: true });
  writeFileSync(lockMarker, `${lockHash}\n`, "utf8");

  // Runtime ledgers are intentionally excluded from the public repository.
  // Seed the isolated runner from the local private state during registration;
  // subsequent nightly updates remain in the runner's ignored private files.
  let privateFilesCopied = 0;
  for (const relative of PRIVATE_RUNTIME_FILES) {
    const source = path.join(SOURCE_ROOT, relative);
    if (!existsSync(source)) continue;
    const target = path.join(RUNNER_ROOT, relative);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
    privateFilesCopied += 1;
  }

  mkdirSync(ENTRY_ROOT, { recursive: true });
  for (const name of ["night-entry.cmd", "night-watchdog-entry.cmd", "night-auth-probe-entry.cmd"]) {
    const source = path.join(SOURCE_ROOT, "scripts", "automation", name);
    assertAscii(source);
    copyFileSync(source, path.join(ENTRY_ROOT, `sumalabo-${name}`));
  }
  return { runnerRoot: RUNNER_ROOT, entryRoot: ENTRY_ROOT, privateFilesCopied };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(prepareRunner(), null, 2)); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
