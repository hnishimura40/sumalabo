#!/usr/bin/env node
import { existsSync, readFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function normalizedRelativePolicyPath(value) {
  const normalized = String(value || "").trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
  if (!normalized || normalized === "." || path.posix.isAbsolute(normalized) || /^[A-Za-z]:/.test(normalized)) throw new Error(`unsafe runner policy path: ${value}`);
  if (normalized.split("/").some((part) => !part || part === "." || part === "..")) throw new Error(`unsafe runner policy path: ${value}`);
  if (/[*?\[\]{}]/.test(normalized)) throw new Error(`runner policy paths must be exact prefixes: ${value}`);
  return normalized;
}

export function cleanupAllowlistedPaths(root, entries, remove = rmSync) {
  const removed = [];
  for (const entry of entries || []) {
    const relative = normalizedRelativePolicyPath(entry);
    const target = path.resolve(root, ...relative.split("/"));
    const relation = path.relative(root, target);
    if (!relation || relation.startsWith("..") || path.isAbsolute(relation)) throw new Error(`runner cleanup escaped root: ${entry}`);
    if (!existsSync(target)) continue;
    remove(target, { recursive: true, force: true, maxRetries: 2 });
    removed.push(`${relative}/`);
  }
  return removed;
}

export function classifyRunnerStatus(statusText, harmlessAllowlist = []) {
  const harmlessPrefixes = (harmlessAllowlist || []).map(normalizedRelativePolicyPath);
  const harmless = [];
  const dangerous = [];
  for (const line of String(statusText || "").split(/\r?\n/).filter(Boolean)) {
    if (!line.startsWith("?? ")) {
      dangerous.push(line);
      continue;
    }
    const relative = line.slice(3).replaceAll("\\", "/").replace(/\/+$/, "");
    const allowed = harmlessPrefixes.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`));
    (allowed ? harmless : dangerous).push(line);
  }
  return { harmless, dangerous };
}

export function readRunnerHygienePolicy(root = ROOT, environmentFile = path.join(root, "config", "night-environment.json")) {
  const environment = JSON.parse(readFileSync(environmentFile, "utf8").replace(/^\uFEFF/u, ""));
  return {
    cleanupAllowlist: environment?.runnerHygiene?.cleanupAllowlist || [],
    harmlessUntrackedAllowlist: environment?.runnerHygiene?.harmlessUntrackedAllowlist || [],
  };
}

export function inspectRunnerHygiene({
  root = ROOT,
  environmentFile = path.join(root, "config", "night-environment.json"),
  cleanup = false,
  statusText,
} = {}) {
  const policy = readRunnerHygienePolicy(root, environmentFile);
  const removed = cleanup ? cleanupAllowlistedPaths(root, policy.cleanupAllowlist) : [];
  let gitStatus = 0;
  let gitError = "";
  let actualStatus = statusText;
  if (actualStatus === undefined) {
    const safeRoot = root.replaceAll("\\", "/");
    const result = spawnSync("git", ["-c", `safe.directory=${safeRoot}`, "-C", root, "status", "--porcelain=v1", "--untracked-files=all"], {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
    });
    gitStatus = result.status ?? 1;
    actualStatus = String(result.stdout || "");
    gitError = String(result.stderr || "").trim();
  }
  const classified = classifyRunnerStatus(actualStatus, policy.harmlessUntrackedAllowlist);
  return {
    ok: gitStatus === 0 && classified.dangerous.length === 0,
    reason: gitStatus !== 0 ? "runner_clone_status_failed" : classified.dangerous.length ? "runner_clone_dirty" : "runner_clean",
    removed,
    harmless: classified.harmless,
    dangerous: classified.dangerous,
    gitStatus,
    gitError,
  };
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) args[key] = true;
    else { args[key] = next; index += 1; }
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = args.root ? path.resolve(String(args.root)) : ROOT;
  const result = inspectRunnerHygiene({
    root,
    environmentFile: args["environment-file"] ? path.resolve(String(args["environment-file"])) : path.join(root, "config", "night-environment.json"),
    cleanup: args.cleanup === true,
  });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : 30;
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  try { main(); }
  catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 30;
  }
}
