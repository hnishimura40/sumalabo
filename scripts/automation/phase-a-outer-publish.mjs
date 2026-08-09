#!/usr/bin/env node
// Codex が workspace 内へ置いた成果物だけを、Codex終了後の信頼済みラッパーが公開する。
// Web由来の文面をコマンドとして解釈せず、slugから導出した固定パスだけをGitへ渡す。

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SLUG_RE = /^20\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function allowedPaths(slug) {
  if (!SLUG_RE.test(slug)) throw new Error("invalid_slug");
  return [
    `content/articles/${slug}.mdx`,
    `public/images/articles/${slug}`,
    `public/images/thumbnails/${slug}.webp`,
    `drafts/refinement/${slug}`,
  ];
}

function run(cmd, args, { env = process.env, inherit = false, root = ROOT } = {}) {
  return spawnSync(cmd, args, { cwd: root, env, encoding: "utf8", stdio: inherit ? "inherit" : "pipe", shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd) });
}

function readManifest(slug, root = ROOT) {
  const file = path.join(root, "logs", "article", `${slug}.publish-handoff.json`);
  if (!existsSync(file)) throw new Error("handoff_missing");
  const value = JSON.parse(readFileSync(file, "utf8"));
  const expected = allowedPaths(slug);
  if (value.schemaVersion !== 1 || value.slug !== slug || value.branch !== `preview/${slug}` || JSON.stringify(value.paths) !== JSON.stringify(expected)) {
    throw new Error("handoff_invalid");
  }
  return { file, value, expected };
}

function readySlugs() {
  const dir = path.join(ROOT, "logs", "article");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".publish-handoff.json"))
    .map((name) => name.slice(0, -".publish-handoff.json".length))
    .filter((slug) => {
      try { return readManifest(slug).value.status === "ready"; } catch { return false; }
    });
}

function requireDedicatedToken() {
  if (!process.env.GH_TOKEN) throw new Error("gh_token_missing");
}

function ensureOnlyAllowedChanges(expected, root = ROOT) {
  const status = run("git", ["status", "--porcelain", "--untracked-files=all", "--", ...expected], { root });
  if (status.status !== 0) throw new Error("git_status_failed");
  if (!(status.stdout || "").trim()) throw new Error("no_publishable_changes");
}

export function dryRun(slug, root = ROOT) {
  const { value, expected } = readManifest(slug, root);
  ensureOnlyAllowedChanges(expected, root);
  for (const rel of expected.slice(0, 3)) {
    if (!existsSync(path.join(root, rel))) throw new Error(`required_output_missing:${rel}`);
  }
  return { ok: true, slug, branch: value.branch, paths: expected, mode: "dry-run" };
}

async function publish(slug) {
  requireDedicatedToken();
  const { file, value, expected } = readManifest(slug);
  ensureOnlyAllowedChanges(expected);

  let r = run("git", ["switch", "-c", value.branch]);
  if (r.status !== 0) r = run("git", ["switch", value.branch]);
  if (r.status !== 0) throw new Error("branch_switch_failed");
  r = run("git", ["add", "--", ...expected]);
  if (r.status !== 0) throw new Error("git_add_failed");
  r = run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "security:scan"], { inherit: true });
  if (r.status !== 0) throw new Error("secret_scan_failed");
  r = run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"], { inherit: true });
  if (r.status !== 0) throw new Error("build_failed");
  r = run("git", ["commit", "-m", `feat(article): ${value.title}（夜間外側ラッパー経由）`]);
  if (r.status !== 0) throw new Error("commit_failed");
  r = run("git", ["push", "-u", "origin", value.branch]);
  if (r.status !== 0) throw new Error("push_failed");

  const childEnv = { ...process.env, GH_TOKEN: process.env.GH_TOKEN };
  r = run("gh", ["pr", "list", "--head", value.branch, "--json", "url", "--jq", ".[0].url"], { env: childEnv });
  let prUrl = (r.stdout || "").trim();
  if (!prUrl) {
    r = run("gh", ["pr", "create", "--base", "main", "--head", value.branch, "--fill"], { env: childEnv });
    if (r.status !== 0) throw new Error("pr_create_failed");
    prUrl = (r.stdout || "").trim().split(/\r?\n/).pop();
  }

  r = run(process.execPath, [path.join(ROOT, "scripts", "run", "phase-a-finalize.mjs"), "--slug", slug, "--title", value.title, "--branch", value.branch, "--prUrl", prUrl, "--thumbnail", `images/thumbnails/${slug}.webp`], { inherit: true });
  if (r.status !== 0) throw new Error("finalize_failed");
  value.status = "completed";
  value.completedAt = new Date().toISOString();
  value.prUrl = prUrl;
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
  return { ok: true, slug, branch: value.branch, prUrl };
}

async function main() {
  const argv = process.argv.slice(2);
  const slug = argv.includes("--slug") ? argv[argv.indexOf("--slug") + 1] : null;
  if (argv.includes("--decide")) {
    const slugs = readySlugs();
    console.log(slugs.length ? `対象: ${slugs[0]}` : "対象なし");
    process.exitCode = 0;
    return;
  }
  if (!slug) throw new Error("usage: --slug <slug> [--dry-run]");
  const result = argv.includes("--dry-run") ? dryRun(slug) : await publish(slug);
  console.log(JSON.stringify(result));
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) main().catch((error) => { console.error(`[outer-publish] ${error.message || error}`); process.exitCode = 41; });
