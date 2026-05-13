// Cloudflare Pages direct-upload (wrangler pages deploy) ヘルパー。
//
// 背景 (2026-05-12, PR #40 事故):
//   このリポジトリの Cloudflare Pages は GitHub Apps 連携を使っておらず
//   (deploy hook 経由で main のみ deploy)、PR ブランチごとの preview deploy が
//   存在しなかった。結果、notifyReviewReady が production URL を通知し、
//   購読者が SPA fallback (HTTP 200 + <title>すまラボ</title> だけ) を承認
//   しかける事故が発生した。
//
//   恒久対策として、import-generated.mjs が preview branch を push したあとに
//   wrangler を使って **そのブランチの dist を直接 Cloudflare Pages に
//   direct-upload** することで、確実に preview deploy URL を取得する。
//
// 役割:
//   - `npx wrangler pages deploy <dist> --project-name=<name> --branch=<branch>`
//     を実行
//   - 標準出力から preview URL (例: https://abc1234.<project>.pages.dev) と
//     branch alias URL (例: https://<branch-slug>.<project>.pages.dev) を抽出
//   - { ok, previewUrl, branchAliasUrl, raw, command, durationMs } を返す
//
// 環境変数:
//   CLOUDFLARE_API_TOKEN  (必須) — Pages:Edit 権限を持つ API トークン
//   CLOUDFLARE_ACCOUNT_ID (必須) — CF アカウント ID
//   CF_PAGES_PROJECT      (任意) — 既定 "sumalabo"
//
// 安全方針:
//   - --branch には必ず "main" 以外を渡す。"main" を渡すと production を
//     上書きしてしまうため、内部で main/master を弾く。
//   - 例外を投げず、{ ok: false, reason } で返す。
//   - timeout は既定 180 秒。
//
// 使い方:
//   import { deployPreviewToCloudflarePages } from "../sumahon/cloudflare-pages-deploy.mjs";
//   const result = await deployPreviewToCloudflarePages({ distDir: "dist", branch: "auto/imported-xxx" });
//   if (result.ok) console.log(result.previewUrl);

import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const DEFAULT_PROJECT = "sumalabo";
const DEFAULT_TIMEOUT_MS = 180000;
const PROTECTED_BRANCHES = new Set(["main", "master", "production", "prod"]);

// === A1: untracked content guard ===
// 本番に「git に無い」記事 / サムネ画像が wrangler 経由でリークする事故 (2026-05-13
// Galaxy S27 production deploy で発覚) を再発防止するためのガード。
//
// 監視対象パス: content/articles/ と public/images/thumbnails/。
// 該当パス配下に「??」(untracked) または「 M」(modified, unstaged) が 1 件でも
// あれば deploy を拒否する。修正・追加した記事は **必ず commit してから**
// deploy する運用に強制する。
//
// 解除方法: 環境変数 SUMALAB_ALLOW_UNTRACKED_DEPLOY=1 で明示的に bypass 可能。
// 任意の人間判断で例外を出したいケース (ex. 局所的なローカル検証) のみ使うこと。
const GUARDED_DEPLOY_PATHS = ["content/articles", "public/images/thumbnails"];

function checkUntrackedDeployContent() {
  if (process.env.SUMALAB_ALLOW_UNTRACKED_DEPLOY === "1") {
    return { ok: true, bypassed: true };
  }
  const args = ["status", "--porcelain", "--", ...GUARDED_DEPLOY_PATHS];
  const result = spawnSync("git", args, { encoding: "utf-8", shell: false });
  if (result.error || result.status !== 0) {
    return {
      ok: false,
      reason: "git_status_failed",
      evidence: { error: result.error?.message || `exit=${result.status}`, stderr: (result.stderr || "").trim() },
    };
  }
  const lines = (result.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.length > 0);
  if (lines.length === 0) {
    return { ok: true };
  }
  // Classify lines for better diagnostics (untracked=??, modified=" M", added="A " etc.)
  const summary = lines.map((l) => ({ status: l.slice(0, 2), path: l.slice(3) }));
  return {
    ok: false,
    reason: "untracked_or_uncommitted_content",
    evidence: {
      paths: GUARDED_DEPLOY_PATHS,
      lines: summary,
      hint:
        "Refusing to deploy: untracked / uncommitted files in content/articles or public/images/thumbnails would be shipped to production. " +
        "Commit, .gitignore, or remove these files before deploying. " +
        "To bypass (rare, e.g. controlled local test): set SUMALAB_ALLOW_UNTRACKED_DEPLOY=1.",
    },
  };
}

function pickPreviewUrlsFromWranglerOutput(raw) {
  const urls = [];
  const seen = new Set();
  const urlRegex = /https?:\/\/[a-z0-9-]+\.[a-z0-9-]+\.pages\.dev[^\s)\]'"]*/gi;
  const matches = raw.match(urlRegex) || [];
  for (const u of matches) {
    if (seen.has(u)) continue;
    seen.add(u);
    urls.push(u);
  }
  // ヒューリスティック: 8 hex chars で始まるものが deployment-specific
  // (https://<8hex>.<project>.pages.dev/), branch alias は branch-name で始まる。
  const deploymentSpecific = urls.find((u) => /\/\/[a-f0-9]{6,12}\./.test(u)) || null;
  const branchAlias = urls.find((u) => u !== deploymentSpecific) || null;
  return { deploymentSpecific, branchAlias, all: urls };
}

function runWrangler(args, { timeoutMs, env } = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn("npx.cmd", ["--yes", "wrangler", ...args], {
      env: { ...process.env, ...env },
      shell: false,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill("SIGKILL"); } catch {}
    }, Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS);
    child.stdout.on("data", (d) => { stdout += d.toString(); });
    child.stderr.on("data", (d) => { stderr += d.toString(); });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr, durationMs: Date.now() - started, error: String(err && err.message ? err.message : err), timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr, durationMs: Date.now() - started, timedOut });
    });
  });
}

/**
 * @param {object} args
 * @param {string} args.distDir          - 既定 "dist"
 * @param {string} args.branch           - 必須。"main" など protected branch は拒否。
 * @param {string} [args.projectName]    - 既定 process.env.CF_PAGES_PROJECT || "sumalabo"
 * @param {string} [args.commitMessage]
 * @param {string} [args.commitHash]
 * @param {number} [args.timeoutMs]
 * @returns {Promise<{ok: boolean, reason?: string, previewUrl?: string, branchAliasUrl?: string, raw?: string, command?: string, durationMs?: number, evidence?: object}>}
 */
export async function deployPreviewToCloudflarePages({
  distDir = "dist",
  branch,
  projectName,
  commitMessage,
  commitHash,
  timeoutMs,
} = {}) {
  if (!branch || typeof branch !== "string") {
    return { ok: false, reason: "missing_branch" };
  }
  if (PROTECTED_BRANCHES.has(branch.toLowerCase())) {
    return { ok: false, reason: "protected_branch", evidence: { branch } };
  }
  if (!existsSync(distDir)) {
    return { ok: false, reason: "dist_dir_missing", evidence: { distDir } };
  }
  // === A1 guard: refuse deploy if content/articles or public/images/thumbnails
  // contain untracked or unstaged-modified files. Prevents accidental shipping of
  // non-committed articles or thumbnails (see GUARDED_DEPLOY_PATHS comment above).
  const untrackedCheck = checkUntrackedDeployContent();
  if (!untrackedCheck.ok) {
    return {
      ok: false,
      reason: untrackedCheck.reason,
      evidence: untrackedCheck.evidence,
    };
  }
  const token = (process.env.CLOUDFLARE_API_TOKEN || "").trim();
  if (!token) {
    return { ok: false, reason: "missing_cloudflare_api_token", evidence: { hint: "Set CLOUDFLARE_API_TOKEN with Pages:Edit permission. See docs/preview_deploy.md Plan B." } };
  }
  const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  // accountId は wrangler.toml が無い場合に必要だが、CF Pages の project が
  // 既存なら project name から推論されるため、無くても動くことが多い。
  // 警告にとどめる。
  const effectiveProject = (projectName || process.env.CF_PAGES_PROJECT || DEFAULT_PROJECT).trim();
  const args = [
    "pages", "deploy", distDir,
    "--project-name", effectiveProject,
    "--branch", branch,
  ];
  if (commitMessage) args.push("--commit-message", commitMessage.slice(0, 200));
  if (commitHash) args.push("--commit-hash", commitHash);
  // 一部 wrangler バージョンで `--no-bundle` 不要、Pages はそもそも bundle しない

  const wranglerEnv = { CLOUDFLARE_API_TOKEN: token };
  if (accountId) wranglerEnv.CLOUDFLARE_ACCOUNT_ID = accountId;

  const command = `npx --yes wrangler ${args.join(" ")}`;
  const result = await runWrangler(args, { timeoutMs, env: wranglerEnv });
  const raw = (result.stdout + "\n" + result.stderr).trim();
  if (result.timedOut) {
    return { ok: false, reason: "timeout", command, raw, durationMs: result.durationMs };
  }
  if (result.code !== 0) {
    return {
      ok: false,
      reason: "wrangler_nonzero_exit",
      command,
      raw,
      durationMs: result.durationMs,
      evidence: { code: result.code, error: result.error || null },
    };
  }
  const { deploymentSpecific, branchAlias, all } = pickPreviewUrlsFromWranglerOutput(raw);
  if (!deploymentSpecific && !branchAlias) {
    return {
      ok: false,
      reason: "no_preview_url_in_output",
      command,
      raw,
      durationMs: result.durationMs,
    };
  }
  return {
    ok: true,
    previewUrl: deploymentSpecific || branchAlias,
    branchAliasUrl: branchAlias || null,
    deploymentSpecificUrl: deploymentSpecific || null,
    allUrls: all,
    command,
    raw,
    durationMs: result.durationMs,
  };
}
