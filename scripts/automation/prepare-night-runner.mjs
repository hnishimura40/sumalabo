#!/usr/bin/env node
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ENTRY_ROOT, RUNNER_ROOT } from "./night-environment.mjs";

const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export { ENTRY_ROOT, RUNNER_ROOT };
const PRIVATE_RUNTIME_FILES = [
  "data/automation/autonomy.json",
  "data/automation/ledger.json",
  "data/automation/scout-picked.json",
  "data/automation/sumahon-queue.json",
  "data/automation/processed-urls.json",
  "logs/night/last-run.json",
  "logs/night/run-history.jsonl",
];
const PRIVATE_TRACKED_RUNTIME_FILES = [
  "data/social/x-posted.json",
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

function preservedGeneratedPaths() {
  const handoffDir = path.join(RUNNER_ROOT, "logs", "article");
  if (!existsSync(handoffDir)) return new Set();
  const paths = new Set();
  for (const name of readdirSync(handoffDir)) {
    if (!name.endsWith(".publish-handoff.json")) continue;
    try {
      const handoff = JSON.parse(readFileSync(path.join(handoffDir, name), "utf8"));
      if (handoff.status !== "ready" || !Array.isArray(handoff.paths)) continue;
      for (const relative of handoff.paths) paths.add(relative.replace(/\\/g, "/"));
    } catch {
      // An invalid handoff is never sufficient to exempt a dirty runner.
    }
  }
  return paths;
}

function isPreservedGeneratedChange(line, allowed) {
  if (!line.startsWith("?? ")) return false;
  const changed = line.slice(3).replace(/\\/g, "/").replace(/\/$/, "");
  return [...allowed].some((relative) => changed === relative || relative.startsWith(`${changed}/`) || changed.startsWith(`${relative}/`));
}

export function prepareRunner() {
  mkdirSync(path.dirname(RUNNER_ROOT), { recursive: true });
  if (!existsSync(path.join(RUNNER_ROOT, ".git"))) {
    const remote = run("git", ["remote", "get-url", "origin"]);
    run("git", ["clone", remote, RUNNER_ROOT], path.dirname(RUNNER_ROOT));
  }
  // x-posted.json is historically tracked, but the dedicated runner owns the
  // live two-stage X ledger. Preserve it across main syncs and keep runtime
  // writes out of Git status and public article branches.
  const privateTracked = new Map();
  for (const relative of PRIVATE_TRACKED_RUNTIME_FILES) {
    const target = path.join(RUNNER_ROOT, relative);
    if (existsSync(target)) privateTracked.set(relative, readFileSync(target));
    run("git", ["update-index", "--skip-worktree", "--", relative], RUNNER_ROOT);
  }
  const dirty = run("git", ["status", "--porcelain", "--untracked-files=normal"], RUNNER_ROOT);
  const preserved = preservedGeneratedPaths();
  const blocking = dirty.split(/\r?\n/).filter(Boolean).filter((line) => !isPreservedGeneratedChange(line, preserved));
  if (blocking.length) throw new Error(`dedicated runner clone is dirty:\n${blocking.join("\n")}`);
  run("git", ["fetch", "origin", "main", "--prune"], RUNNER_ROOT);
  run("git", ["checkout", "--detach", "origin/main"], RUNNER_ROOT);
  for (const relative of PRIVATE_TRACKED_RUNTIME_FILES) {
    const target = path.join(RUNNER_ROOT, relative);
    const preserved = privateTracked.get(relative);
    if (preserved) writeFileSync(target, preserved);
    run("git", ["update-index", "--skip-worktree", "--", relative], RUNNER_ROOT);
  }
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
    // Existing runner state is newer and is the canonical unattended ledger.
    // Registration only seeds a missing file; it must never roll runtime state
    // back to an older daytime-workspace snapshot.
    if (existsSync(target)) continue;
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
    privateFilesCopied += 1;
  }

  mkdirSync(ENTRY_ROOT, { recursive: true });
  for (const name of ["night-entry.cmd", "night-watchdog-entry.cmd", "night-auth-probe-entry.cmd", "vivant-reannounce-entry.cmd"]) {
    const source = path.join(SOURCE_ROOT, "scripts", "automation", name);
    assertAscii(source);
    const target = path.join(ENTRY_ROOT, `sumalabo-${name}`);
    if (name.startsWith("night-") || name === "vivant-reannounce-entry.cmd") {
      const rendered = readFileSync(source, "ascii").replaceAll("__RUNNER_ROOT__", RUNNER_ROOT);
      if (rendered.includes("__RUNNER_ROOT__")) throw new Error(`runner entry placeholder was not resolved: ${name}`);
      writeFileSync(target, rendered, "ascii");
    } else {
      copyFileSync(source, target);
    }
  }
  return { runnerRoot: RUNNER_ROOT, entryRoot: ENTRY_ROOT, privateFilesCopied };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(prepareRunner(), null, 2)); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
