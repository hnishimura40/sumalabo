#!/usr/bin/env node
import crypto from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inspectRunnerHygiene, readRunnerHygienePolicy } from "./runner-hygiene.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function safeRunId(value) {
  const runId = String(value || "").trim();
  if (!/^[0-9A-Za-z][0-9A-Za-z_.-]{5,80}$/.test(runId)) throw new Error("invalid hygiene recovery run id");
  return runId;
}

function safeRelativePath(value) {
  const relative = String(value || "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (!relative || path.posix.isAbsolute(relative) || /^[A-Za-z]:/.test(relative)) throw new Error(`unsafe hygiene recovery path: ${value}`);
  if (relative.split("/").some((part) => !part || part === "." || part === "..")) throw new Error(`unsafe hygiene recovery path: ${value}`);
  return relative;
}

function isAllowed(relative, prefixes) {
  return prefixes.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`));
}

function listUntracked(root) {
  const safeRoot = root.replaceAll("\\", "/");
  const result = spawnSync("git", ["-c", `safe.directory=${safeRoot}`, "-C", root, "ls-files", "--others", "--exclude-standard", "-z"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`hygiene untracked scan failed: ${String(result.stderr || result.stdout || "").trim()}`);
  return String(result.stdout || "").split("\0").filter(Boolean).map(safeRelativePath);
}

function outputRootFor(root) {
  const environment = JSON.parse(readFileSync(path.join(root, "config", "night-environment.json"), "utf8").replace(/^\uFEFF/u, ""));
  return environment?.runnerHygiene?.failureRecoveryRoot || "D:\\downloads\\sumalabo-codex";
}

function uniqueRecoveryDirectory(outputRoot, runId) {
  const date = runId.match(/^\d{8}/)?.[0] || new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const base = path.join(path.resolve(outputRoot), "runner-hygiene", date, runId);
  if (!existsSync(base)) return base;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${base}-${index}`;
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error("hygiene recovery destination collision limit exceeded");
}

function sha256(file) {
  return crypto.createHash("sha256").update(readFileSync(file)).digest("hex").toUpperCase();
}

export function recoverRunnerHygieneArtifacts({
  root = ROOT,
  runId,
  outputRoot = null,
  hygieneReader = (repoRoot) => inspectRunnerHygiene({ root: repoRoot }),
  untrackedReader = listUntracked,
} = {}) {
  const normalizedRunId = safeRunId(runId);
  const initial = hygieneReader(root);
  if (initial.ok) return { ok: true, recovered: false, reason: "runner_already_clean", movedPaths: [], hygiene: initial };

  const trackedOrModified = (initial.dangerous || []).filter((line) => !String(line).startsWith("?? "));
  if (trackedOrModified.length) {
    return { ok: false, recovered: false, reason: "tracked_or_modified_runner_paths", movedPaths: [], trackedOrModified, hygiene: initial };
  }

  const policy = readRunnerHygienePolicy(root);
  const harmlessPrefixes = (policy.harmlessUntrackedAllowlist || []).map((value) => safeRelativePath(value));
  const candidates = untrackedReader(root)
    .map(safeRelativePath)
    .filter((relative) => !isAllowed(relative, harmlessPrefixes));
  if (!candidates.length) {
    return { ok: false, recovered: false, reason: "dirty_runner_without_recoverable_untracked_paths", movedPaths: [], hygiene: initial };
  }

  const recoveryRoot = uniqueRecoveryDirectory(outputRoot || outputRootFor(root), normalizedRunId);
  const files = candidates.map((relative) => {
    const source = path.resolve(root, ...relative.split("/"));
    const relation = path.relative(root, source);
    if (!relation || relation.startsWith("..") || path.isAbsolute(relation)) throw new Error(`hygiene recovery escaped runner: ${relative}`);
    if (!existsSync(source) || !statSync(source).isFile()) throw new Error(`hygiene recovery source is not a file: ${relative}`);
    return { relative, source, length: statSync(source).size, sha256: sha256(source) };
  });

  mkdirSync(recoveryRoot, { recursive: true });
  for (const file of files) {
    const destination = path.join(recoveryRoot, ...file.relative.split("/"));
    mkdirSync(path.dirname(destination), { recursive: true });
    renameSync(file.source, destination);
    file.recoveredPath = destination;
    file.matches = statSync(destination).size === file.length && sha256(destination) === file.sha256;
  }
  if (files.some((file) => !file.matches)) throw new Error("hygiene recovery hash verification failed");

  const hygiene = hygieneReader(root);
  const manifest = {
    schemaVersion: 1,
    runId: normalizedRunId,
    recoveredAt: new Date().toISOString(),
    sourceRoot: root,
    recoveryRoot,
    movedPaths: files.map((file) => file.relative),
    fileCount: files.length,
    allHashesMatched: true,
    runnerHygiene: hygiene,
    files,
  };
  const manifestPath = path.join(recoveryRoot, "recovery-manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  if (!hygiene.ok) return { ok: false, recovered: true, reason: "runner_remains_dirty_after_hygiene_recovery", recoveryRoot, manifestPath, movedPaths: manifest.movedPaths, hygiene };
  return { ok: true, recovered: true, reason: "unexpected_untracked_files_recovered", recoveryRoot, manifestPath, movedPaths: manifest.movedPaths, fileCount: files.length, allHashesMatched: true, hygiene };
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) { args._.push(value); continue; }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else { args[key] = next; index += 1; }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args._[0] !== "recover") throw new Error("usage: recover --run-id <id> [--root <path>] [--output-root <path>]");
  const result = recoverRunnerHygieneArtifacts({
    root: args.root ? path.resolve(String(args.root)) : ROOT,
    runId: args["run-id"],
    outputRoot: typeof args["output-root"] === "string" ? args["output-root"] : null,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 30;
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  try { main(); }
  catch (error) {
    console.error(`[runner-hygiene-recovery] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 30;
  }
}
