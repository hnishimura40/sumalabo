#!/usr/bin/env node
import crypto from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inspectRunnerHygiene } from "./runner-hygiene.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SLUG_RE = /^20\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readJson(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/u, "")); }
  catch { return fallback; }
}

function expectedPaths(slug) {
  if (!SLUG_RE.test(String(slug || ""))) throw new Error("invalid recovery slug");
  return [
    `content/articles/${slug}.mdx`,
    `public/images/articles/${slug}`,
    `public/images/thumbnails/${slug}.webp`,
    `drafts/refinement/${slug}`,
  ];
}

function safeRunId(value) {
  const runId = String(value || "").trim();
  if (!/^[0-9A-Za-z][0-9A-Za-z_.-]{5,80}$/.test(runId)) throw new Error("invalid recovery run id");
  return runId;
}

function filesUnder(target) {
  if (!existsSync(target)) return [];
  if (!statSync(target).isDirectory()) return [target];
  const files = [];
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    files.push(...filesUnder(path.join(target, entry.name)));
  }
  return files;
}

function sha256(file) {
  return crypto.createHash("sha256").update(readFileSync(file)).digest("hex").toUpperCase();
}

function newest(items) {
  return items.sort((a, b) => Date.parse(b.createdAt || b.updatedAt || 0) - Date.parse(a.createdAt || a.updatedAt || 0))[0] || null;
}

export function normalizeHandoffFailure(handoff) {
  const original = String(handoff?.errorReason || "phase_a_handoff_failed");
  const reason = /image_(?:hand|quality|body|structure).*gate_failed|hand_gate_failed/i.test(original)
    ? "image_quality_gate_failed"
    : "phase_a_handoff_failed";
  return {
    reason,
    detail: [
      `slug=${handoff?.slug || "unknown"}`,
      `original=${original}`,
      Array.isArray(handoff?.failedChecks) && handoff.failedChecks.length ? `checks=${handoff.failedChecks.join(",")}` : null,
    ].filter(Boolean).join("; "),
  };
}

export function findFailedHandoffSince({ root = ROOT, startedAt, slug = null } = {}) {
  const startedMs = Date.parse(startedAt);
  if (!Number.isFinite(startedMs)) throw new Error(`invalid recovery startedAt: ${startedAt}`);
  const directory = path.join(root, "logs", "article");
  if (!existsSync(directory)) return null;
  const candidates = readdirSync(directory)
    .filter((name) => name.endsWith(".publish-handoff.json"))
    .map((name) => readJson(path.join(directory, name)))
    .filter((handoff) => {
      if (!handoff || handoff.status !== "failed" || !SLUG_RE.test(String(handoff.slug || ""))) return false;
      if (slug && handoff.slug !== slug) return false;
      const timestamp = Date.parse(handoff.createdAt || handoff.updatedAt || "");
      return Number.isFinite(timestamp) && timestamp >= startedMs;
    });
  return newest(candidates);
}

export function inspectFailedRun({ root = ROOT, startedAt, slug = null } = {}) {
  const handoff = findFailedHandoffSince({ root, startedAt, slug });
  if (!handoff) return { found: false, slug: null, reason: null, detail: null };
  return { found: true, slug: handoff.slug, ...normalizeHandoffFailure(handoff), handoff };
}

function gitStatusForPaths(root, relativePaths) {
  const safeRoot = root.replaceAll("\\", "/");
  const result = spawnSync("git", ["-c", `safe.directory=${safeRoot}`, "-C", root, "status", "--porcelain=v1", "--untracked-files=all", "--", ...relativePaths], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.status !== 0) throw new Error(`recovery git status failed: ${String(result.stderr || result.stdout || "").trim()}`);
  return String(result.stdout || "").split(/\r?\n/).filter(Boolean);
}

function runStaticPreflight(root) {
  const result = spawnSync(process.execPath, [path.join(root, "scripts", "automation", "night-environment-check.mjs"), "--article-only"], {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    windowsHide: true,
  });
  return {
    exitCode: result.status ?? 30,
    evidence: readJsonFromText(result.stdout),
    stderr: String(result.stderr || "").trim(),
  };
}

function readJsonFromText(text) {
  try { return JSON.parse(String(text || "").replace(/^\uFEFF/u, "").trim()); }
  catch { return null; }
}

function configuredOutputRoot(root) {
  const environment = readJson(path.join(root, "config", "night-environment.json"), {});
  return environment?.runnerHygiene?.failureRecoveryRoot || "D:\\downloads\\sumalabo-codex";
}

function uniqueRecoveryDirectory(outputRoot, slug, runId) {
  const date = (runId.match(/^\d{8}/)?.[0] || new Date().toISOString().slice(0, 10).replaceAll("-", ""));
  const stem = path.join(path.resolve(outputRoot), slug, `recovery-${date}-${runId.replace(/[^0-9A-Za-z_.-]/g, "-")}`);
  if (!existsSync(stem)) return stem;
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${stem}-${index}`;
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error("recovery destination collision limit exceeded");
}

export function recoverFailedRunArtifacts({
  root = ROOT,
  runId,
  startedAt,
  slug = null,
  outputRoot = null,
  statusReader = gitStatusForPaths,
  hygieneReader = (repoRoot) => inspectRunnerHygiene({ root: repoRoot }),
  preflightRunner = runStaticPreflight,
} = {}) {
  const normalizedRunId = safeRunId(runId);
  const inspection = inspectFailedRun({ root, startedAt, slug });
  if (!inspection.found) return { ok: true, recovered: false, reason: "no_failed_handoff_for_run", preflight: null };

  const relativePaths = expectedPaths(inspection.slug);
  const presentPaths = relativePaths.filter((relative) => existsSync(path.join(root, ...relative.split("/"))));
  if (!presentPaths.length) return { ok: true, recovered: false, reason: "failed_handoff_has_no_remaining_artifacts", slug: inspection.slug, preflight: null };

  const statusLines = statusReader(root, presentPaths);
  const unsafe = statusLines.filter((line) => !line.startsWith("?? "));
  if (unsafe.length) throw new Error(`refusing to move tracked or modified paths: ${unsafe.join(" | ")}`);

  const recoveryRoot = uniqueRecoveryDirectory(outputRoot || configuredOutputRoot(root), inspection.slug, normalizedRunId);
  const before = presentPaths.flatMap((relative) => {
    const absolute = path.join(root, ...relative.split("/"));
    return filesUnder(absolute).map((file) => ({
      relative: path.relative(root, file).replaceAll("\\", "/"),
      length: statSync(file).size,
      sha256: sha256(file),
    }));
  });

  mkdirSync(recoveryRoot, { recursive: true });
  for (const relative of presentPaths) {
    const source = path.join(root, ...relative.split("/"));
    const destination = path.join(recoveryRoot, ...relative.split("/"));
    mkdirSync(path.dirname(destination), { recursive: true });
    renameSync(source, destination);
  }

  const files = before.map((item) => {
    const destination = path.join(recoveryRoot, ...item.relative.split("/"));
    const length = statSync(destination).size;
    const digest = sha256(destination);
    return { ...item, recoveredPath: destination, matches: length === item.length && digest === item.sha256 };
  });
  if (files.some((item) => !item.matches)) throw new Error("recovery hash verification failed");

  const hygiene = hygieneReader(root);
  const preflight = preflightRunner(root);
  const manifest = {
    schemaVersion: 1,
    runId: normalizedRunId,
    slug: inspection.slug,
    failureReason: inspection.reason,
    failureDetail: inspection.detail,
    recoveredAt: new Date().toISOString(),
    sourceRoot: root,
    recoveryRoot,
    movedPaths: presentPaths,
    fileCount: files.length,
    allHashesMatched: true,
    runnerHygiene: hygiene,
    preflight,
    files,
  };
  const manifestPath = path.join(recoveryRoot, "recovery-manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  if (!hygiene.ok) throw new Error(`runner remains dirty after recovery: ${hygiene.dangerous?.join(" | ") || hygiene.reason}`);
  if (preflight.exitCode !== 0 || preflight.evidence?.canProceed !== true) throw new Error(`next preflight did not pass after recovery: exit=${preflight.exitCode}`);
  return { ok: true, recovered: true, slug: inspection.slug, recoveryRoot, manifestPath, fileCount: files.length, allHashesMatched: true, hygiene, preflight };
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
  const command = args._[0];
  const root = args.root ? path.resolve(String(args.root)) : ROOT;
  if (command === "inspect") {
    console.log(JSON.stringify(inspectFailedRun({ root, startedAt: args["started-at"], slug: typeof args.slug === "string" ? args.slug : null }), null, 2));
    return;
  }
  if (command === "recover") {
    console.log(JSON.stringify(recoverFailedRunArtifacts({
      root,
      runId: args["run-id"],
      startedAt: args["started-at"],
      slug: typeof args.slug === "string" ? args.slug : null,
      outputRoot: typeof args["output-root"] === "string" ? args["output-root"] : null,
    }), null, 2));
    return;
  }
  throw new Error("usage: inspect|recover --run-id <id> --started-at <ISO> [--slug <slug>] [--root <path>]");
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) {
  try { main(); }
  catch (error) {
    console.error(`[night-failure-recovery] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 30;
  }
}
