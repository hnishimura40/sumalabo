#!/usr/bin/env node
// Codex が workspace 内へ置いた成果物だけを、Codex終了後の信頼済みラッパーが公開する。
// Web由来の文面をコマンドとして解釈せず、slugから導出した固定パスだけをGitへ渡す。

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { probeGitHubToken } from "./github-token-probe.mjs";
import { markPendingPublishResolved } from "../sumahon/preview-publication.mjs";

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

export async function resolvePullRequest({ branch, title, token = process.env.GH_TOKEN, fetchImpl = fetch } = {}) {
  if (!token) throw new Error("gh_token_missing");
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sumalabo-night-publisher",
  };
  const head = encodeURIComponent(`hnishimura40:${branch}`);
  const list = await fetchImpl(`https://api.github.com/repos/hnishimura40/sumalabo/pulls?state=all&head=${head}`, { headers });
  if (!list.ok) throw new Error(`pr_list_http_${list.status}`);
  const existing = await list.json();
  if (existing?.[0]?.html_url) return existing[0].html_url;
  const created = await fetchImpl("https://api.github.com/repos/hnishimura40/sumalabo/pulls", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ title, head: branch, base: "main", body: "Night-run generated and verified article." }),
  });
  if (!created.ok) throw new Error(`pr_create_http_${created.status}`);
  const value = await created.json();
  if (!value?.html_url) throw new Error("pr_create_response_invalid");
  return value.html_url;
}

export function markHandoffCompleted(slug, prUrl, root = ROOT) {
  if (!/^https:\/\/github\.com\/hnishimura40\/sumalabo\/pull\/\d+$/.test(String(prUrl || ""))) throw new Error("invalid_pr_url");
  const { file, value } = readManifest(slug, root);
  value.status = "completed";
  value.completedAt = new Date().toISOString();
  value.prUrl = prUrl;
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
  return { ok: true, slug, prUrl, status: value.status };
}

export function markHandoffPending(slug, { reason, prUrl = null, commitSha = null } = {}, root = ROOT) {
  const { file, value } = readManifest(slug, root);
  value.status = "pending";
  value.pendingAt = new Date().toISOString();
  value.pendingReason = String(reason || "publish_failed");
  value.prUrl = prUrl || value.prUrl || null;
  value.commitSha = commitSha || value.commitSha || null;
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n", "utf8");
  return { ok: true, slug, status: value.status, reason: value.pendingReason };
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
  r = run(process.execPath, [path.join(ROOT, "scripts", "automation", "normalize-publish-at.mjs"), "--slug", slug], { inherit: true });
  if (r.status !== 0) throw new Error("publish_at_normalize_failed");
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

  const prUrl = await resolvePullRequest({ branch: value.branch, title: value.title });

  const commitSha = String(run("git", ["rev-parse", "HEAD"]).stdout || "").trim() || null;
  r = run(process.execPath, [path.join(ROOT, "scripts", "run", "phase-a-finalize.mjs"), "--slug", slug, "--title", value.title, "--branch", value.branch, "--prUrl", prUrl, "--thumbnail", `images/thumbnails/${slug}.webp`], { inherit: true });
  if (r.status !== 0) {
    markHandoffPending(slug, { reason: "finalize_failed", prUrl, commitSha });
    throw new Error("finalize_failed");
  }
  markHandoffCompleted(slug, prUrl);
  return { ok: true, slug, branch: value.branch, prUrl };
}

async function resumePending(slug) {
  requireDedicatedToken();
  const { value } = readManifest(slug);
  if (!["pending", "ready"].includes(value.status)) throw new Error(`handoff_not_pending:${value.status}`);

  let r = run("git", ["fetch", "origin", "main", value.branch]);
  if (r.status !== 0) throw new Error("resume_fetch_failed");
  r = run("git", ["switch", value.branch]);
  if (r.status !== 0) r = run("git", ["switch", "-c", value.branch, "--track", `origin/${value.branch}`]);
  if (r.status !== 0) throw new Error("resume_branch_switch_failed");
  r = run("git", ["merge", "--ff-only", `origin/${value.branch}`]);
  if (r.status !== 0) throw new Error("resume_remote_branch_not_fast_forward");
  r = run("git", ["merge", "--no-edit", "origin/main"]);
  if (r.status !== 0) {
    run("git", ["merge", "--abort"]);
    throw new Error("resume_main_merge_failed");
  }
  r = run(process.execPath, [path.join(ROOT, "scripts", "automation", "normalize-publish-at.mjs"), "--slug", slug], { inherit: true });
  if (r.status !== 0) throw new Error("resume_publish_at_normalize_failed");
  r = run("git", ["add", "--", `content/articles/${slug}.mdx`]);
  if (r.status !== 0) throw new Error("resume_publish_at_stage_failed");
  r = run(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "security:scan"], { inherit: true });
  if (r.status !== 0) throw new Error("resume_secret_scan_failed");
  const staged = run("git", ["diff", "--cached", "--quiet"]);
  if (staged.status === 1) {
    r = run("git", ["commit", "-m", `chore(article): normalize publishAt for ${slug} resume`]);
    if (r.status !== 0) throw new Error("resume_publish_at_commit_failed");
  } else if (staged.status !== 0) {
    throw new Error("resume_publish_at_diff_failed");
  }
  r = run("git", ["push", "origin", value.branch]);
  if (r.status !== 0) throw new Error("resume_push_failed");

  const prUrl = await resolvePullRequest({ branch: value.branch, title: value.title });
  const commitSha = String(run("git", ["rev-parse", "HEAD"]).stdout || "").trim() || null;
  r = run(process.execPath, [path.join(ROOT, "scripts", "run", "phase-a-finalize.mjs"), "--slug", slug, "--title", value.title, "--branch", value.branch, "--prUrl", prUrl, "--thumbnail", `images/thumbnails/${slug}.webp`], { inherit: true });
  if (r.status !== 0) {
    markHandoffPending(slug, { reason: "resume_finalize_failed", prUrl, commitSha });
    throw new Error("resume_finalize_failed");
  }
  markHandoffCompleted(slug, prUrl);
  try { markPendingPublishResolved({ root: ROOT, slug }); } catch {}
  return { ok: true, resumed: true, slug, branch: value.branch, commitSha, prUrl };
}

async function main() {
  const argv = process.argv.slice(2);
  const slug = argv.includes("--slug") ? argv[argv.indexOf("--slug") + 1] : null;
  const prUrl = argv.includes("--pr-url") ? argv[argv.indexOf("--pr-url") + 1] : null;
  if (argv.includes("--auth-probe")) {
    const result = await probeGitHubToken();
    console.log(JSON.stringify(result));
    process.exitCode = result.exitCode;
    return;
  }
  if (argv.includes("--decide-json")) {
    const slugs = readySlugs();
    // This crosses PowerShell's native-output decoding boundary, so keep the
    // decision handoff ASCII and machine-readable.
    console.log(JSON.stringify({ slug: slugs[0] || null }));
    process.exitCode = 0;
    return;
  }
  if (argv.includes("--decide")) {
    const slugs = readySlugs();
    console.log(slugs.length ? `対象: ${slugs[0]}` : "対象なし");
    process.exitCode = 0;
    return;
  }
  if (argv.includes("--mark-completed")) {
    console.log(JSON.stringify(markHandoffCompleted(slug, prUrl)));
    process.exitCode = 0;
    return;
  }
  if (!slug) throw new Error("usage: --slug <slug> [--dry-run|--resume-pending]");
  const result = argv.includes("--dry-run") ? dryRun(slug) : argv.includes("--resume-pending") ? await resumePending(slug) : await publish(slug);
  console.log(JSON.stringify(result));
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) main().catch((error) => { console.error(`[outer-publish] ${error.message || error}`); process.exitCode = 41; });
