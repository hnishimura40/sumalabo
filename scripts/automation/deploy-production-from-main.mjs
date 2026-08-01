#!/usr/bin/env node
// scripts/automation/deploy-production-from-main.mjs
//
// 役割:
//   Phase B（ユーザー承認後）の **本番反映の正規手順**（P1 で一本化）。
//   承認ボタン → /api/approve-preview で PR merge 後、本スクリプトで
//   ローカルの main HEAD から `npm run build` → `wrangler pages deploy` を実行して
//   本番反映する。呼び出しは `npm run deploy:production -- --slug=<slug>`。
//
//   経緯: Cloudflare Pages の Git 連携 auto-deploy は GitHub App の clone 失敗
//   （Repository not found）が常態化しており、Deploy Hook も同じ Git ビルドを起動する
//   ため機能しない。実績のある wrangler(Direct Upload) を正規ルートに昇格した（P1）。
//
//   - main への直接 push はしない (main は既に approve-preview で merge 済み)
//   - 記事生成は行わない
//   - X 投稿はしない
//   - queue.json は触らない (verify-publication が published 更新する想定)
//   - secret / token / Deploy Hook URL は表示しない
//
// 使い方:
//   node scripts/automation/deploy-production-from-main.mjs --slug=<slug>
//   node scripts/automation/deploy-production-from-main.mjs --slug=<slug> --dry-run
//   node scripts/automation/deploy-production-from-main.mjs --slug=<slug> --skip-build
//
// オプション:
//   --slug=<slug>     必須。dist/articles/{slug}/index.html の存在チェック対象。
//   --dry-run         wrangler pages deploy を **実行しない**。前段 (git sync /
//                     build / dist 検査) だけ行い、最終 result JSON を出力する。
//   --skip-build      `npm run build` をスキップ (既に dist がある時のテスト用)。
//   --skip-git-sync   `git fetch && git status` をスキップ (CI 等で main 上にいる想定)。
//   --verify-url=URL  本番反映確認に使う verify-publication endpoint。default は
//                     "https://sumalabo.com/api/verify-publication?slug=<slug>"。
//   --no-verify       deploy 後の verify polling をスキップ (dry-run 検証用)。
//   --verify-timeout-ms=N  verify polling の合計タイムアウト (default: 360000=6min)。
//   --output=PATH     最終 result JSON の保存先 (default は stdout のみ)。
//
// 終了コード:
//   0 = success (verify pass, または dry-run の事前検査成功)
//   1 = build / dist 不備 / verify failure / wrangler error
//   2 = 引数エラー
//
// セキュリティ:
//   - 環境変数 CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID は wrangler が読む。
//     値そのものを stdout / result JSON / ログに **絶対に出さない**。
//   - 設定 hint だけは表示する (存在チェック true/false のみ)。
//   - Deploy Hook は使わない (P1 で廃止。wrangler が正規経路)。

import { spawnSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { gate, loadAutonomy } from "./autonomy.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";
// 2026-07-04 の「verify 直後の無言終了 (0xC0000409)」の根本原因は fs.cpSync の
// 再帰コピー（日本語を含むパス配下の dist で Node v24.14.1 がクラッシュ）だった。
// 対策1: dist のコピーは robocopy / cp に置換（copyDirReliable）。
// 対策2: 防御として本スクリプトの HTTP も undici(fetch) を避け node:http/https に統一。
import http from "node:http";
import https from "node:https";
import { archiveAfterSuccessfulDeploy } from "./image-output-lifecycle.mjs";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..");

// undici(fetch) を使わない HTTP GET (JSON)。keep-alive を持たず、リクエスト完了で
// ソケットを閉じるためプロセスの自然終了を妨げない。
function httpGetJson(url, { headers = {}, timeoutMs = 15000 } = {}) {
  return new Promise((resolvePromise) => {
    const lib = url.startsWith("https:") ? https : http;
    const req = lib.get(url, { headers: { ...headers, Connection: "close" }, timeout: timeoutMs }, (res) => {
      let data = "";
      res.setEncoding("utf-8");
      res.on("data", (d) => (data += d));
      res.on("end", () => {
        let json = null;
        try { json = JSON.parse(data); } catch {}
        resolvePromise({ status: res.statusCode, json });
      });
    });
    req.on("timeout", () => { req.destroy(); resolvePromise({ status: 0, json: null, error: "timeout" }); });
    req.on("error", (e) => resolvePromise({ status: 0, json: null, error: e && e.message }));
  });
}

// ----- arg parsing -----
function parseArgs(argv) {
  const out = {
    slug: null,
    dryRun: false,
    skipBuild: false,
    skipGitSync: false,
    verifyUrl: null,
    noVerify: false,
    verifyTimeoutMs: 6 * 60 * 1000,
    output: null,
    trigger: "manual",
    runMode: null,
    skipPostVerify: false,
    skipWrangler: false,
  };
  for (const a of argv) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--skip-build") out.skipBuild = true;
    else if (a === "--skip-git-sync") out.skipGitSync = true;
    else if (a === "--no-verify") out.noVerify = true;
    else if (a === "--skip-post-verify") out.skipPostVerify = true;
    else if (a === "--skip-wrangler") out.skipWrangler = true; // テスト専用: deploy を行わず後続工程の完走を検証する
    else if (a.startsWith("--trigger=")) out.trigger = a.slice("--trigger=".length).trim() || "manual";
    else if (a.startsWith("--run-mode=")) out.runMode = a.slice("--run-mode=".length).trim();
    else if (a.startsWith("--slug=")) out.slug = a.slice("--slug=".length).trim();
    else if (a.startsWith("--verify-url=")) out.verifyUrl = a.slice("--verify-url=".length).trim();
    else if (a.startsWith("--verify-timeout-ms=")) {
      const n = Number(a.slice("--verify-timeout-ms=".length));
      if (Number.isFinite(n) && n > 0) out.verifyTimeoutMs = Math.min(Math.max(n, 30_000), 30 * 60_000);
    } else if (a.startsWith("--output=")) out.output = a.slice("--output=".length).trim();
  }
  out.runMode ||= out.trigger === "manual" ? "attended" : "automation";
  return out;
}

function isValidSlug(s) {
  return typeof s === "string" && /^[a-z0-9][a-z0-9-]*$/i.test(s);
}

// ----- result builder -----
function makeResult() {
  return {
    ok: false,
    slug: null,
    dryRun: false,
    trigger: "manual",
    runMode: null,
    autonomyLevel: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    steps: {
      autonomyGate: { status: "skipped" },
      prepublishHumanReview: { status: "removed", policy: "machine_qa_only" },
      gitSync: { status: "skipped" },
      build: { status: "skipped" },
      distCheck: { status: "skipped" },
      wrangler: { status: "skipped" },
      verify: { status: "skipped" },
      lastGoodSnapshot: { status: "skipped" },
      postPublishVerify: { status: "skipped" },
      imageOutputCleanup: { status: "skipped" },
    },
    productionUrl: null,
    errorReason: null,
  };
}

// ----- step helpers -----
// Windows で .cmd / .bat (npm.cmd / npx.cmd) を spawnSync する場合、
// Node.js 20.12+ のセキュリティ対策で shell:true なしだと EINVAL を返す。
// platform==='win32' のときだけ shell:true を有効にする。Linux/macOS では
// shell の意味論が変わるため引数のエスケープを避けて従来通り shell:false。
function isWindowsShellCommand(cmd) {
  if (process.platform !== "win32") return false;
  const lower = (cmd || "").toLowerCase();
  return lower.endsWith(".cmd") || lower.endsWith(".bat");
}

function runSync(cmd, args, opts = {}) {
  const useShell = isWindowsShellCommand(cmd);
  // shell:true のときは引数の空白を保護するためにダブルクォートで包む。
  // ここで扱う引数は build / wrangler の固定値で、ユーザー入力 (--slug 等) を
  // 含まない。slug は main 関数側で /^[a-z0-9][a-z0-9-]*$/i で検証済み。
  const safeArgs = useShell
    ? args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a))
    : args;
  return spawnSync(cmd, safeArgs, {
    cwd: ROOT,
    stdio: opts.captureOutput ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env,
    shell: useShell || Boolean(opts.spawnOpts && opts.spawnOpts.shell),
    ...opts.spawnOpts,
  });
}

// fs.cpSync(recursive) は Windows + 日本語パスで 0xC0000409 の無言クラッシュを
// 起こすことを実測（2026-07-04）。OS のコピーコマンドで確実にコピーする。
function copyDirReliable(src, dst) {
  if (process.platform === "win32") {
    // robocopy: exit 0-7 = 成功系（1 = コピー実行）
    const r = spawnSync("robocopy", [src, dst, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/NP"], { stdio: "ignore" });
    return r.status !== null && r.status < 8;
  }
  const r = spawnSync("cp", ["-r", `${src}/.`, dst], { stdio: "ignore" });
  return r.status === 0;
}

function stepGitSync(result, skipGitSync) {
  if (skipGitSync) {
    result.steps.gitSync = { status: "skipped", reason: "--skip-git-sync" };
    return true;
  }
  console.log("[1/5] git fetch origin main && check main HEAD up-to-date");
  const fetch = runSync("git", ["fetch", "origin", "main"]);
  if (fetch.status !== 0) {
    result.steps.gitSync = { status: "failed", reason: "git_fetch_failed", code: fetch.status };
    return false;
  }
  const branch = runSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { captureOutput: true });
  const localHead = runSync("git", ["rev-parse", "HEAD"], { captureOutput: true });
  const originMain = runSync("git", ["rev-parse", "origin/main"], { captureOutput: true });
  const branchName = (branch.stdout || "").toString().trim();
  const localSha = (localHead.stdout || "").toString().trim();
  const originSha = (originMain.stdout || "").toString().trim();
  const upToDate = localSha === originSha;
  result.steps.gitSync = {
    status: upToDate ? "ok" : "stale_local",
    branch: branchName,
    localHead: localSha,
    originMain: originSha,
  };
  if (!upToDate) {
    console.warn(
      `  [warn] ローカル HEAD (${localSha.slice(0, 7)}) と origin/main (${originSha.slice(0, 7)}) が一致しません。`
    );
    console.warn(
      "         このスクリプトは main 直 push をしません。fast-forward が必要なら手動で:"
    );
    console.warn("         git switch main && git pull --ff-only origin main");
    // 致命にはしない。dist が origin/main 由来なら deploy 可能なので続行は許可。
  }
  return true;
}

// 環境ヘルスチェック（2026-07-19・node_modules 消失事故の恒久対策）。
// Codex 画像工程などがビルド前に node_modules を壊すケースに備え、build 直前に
// astro が解決できるか確認し、できなければ自動復旧（npm ci → 失敗時 npm install）する。
// 完走型を保つため、復旧できた場合は中断せず続行。復旧してもなお解決できない場合のみ中断する。
function ensureNodeModulesForBuild(result) {
  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  const astroPkg = join(ROOT, "node_modules", "astro", "package.json");
  const astroBin = join(ROOT, "node_modules", ".bin", process.platform === "win32" ? "astro.cmd" : "astro");
  const resolvable = () => existsSync(astroPkg) && existsSync(astroBin);

  if (resolvable()) {
    result.steps.envHealth = { status: "ok" };
    return true;
  }

  // runSync は既定で stdio:"inherit"（=npm の進捗がそのまま流れる）。
  console.warn("[env] astro が解決できません（node_modules 破損の可能性）。自動復旧を試みます: npm ci");
  let method = "npm ci";
  let r = runSync(npmCmd, ["ci"]);
  if (r.status !== 0 || !resolvable()) {
    console.warn("[env] npm ci で未復旧。npm install を試します");
    method = "npm install";
    r = runSync(npmCmd, ["install"]);
  }

  if (resolvable()) {
    console.log(`[env] node_modules を自動復旧しました（${method}）。ビルドを続行します。`);
    result.steps.envHealth = { status: "recovered", method };
    return true;
  }

  // 復旧してもなお解決不能 = 真のブロッキング。ここでのみ中断する。
  console.error("[env] node_modules を復旧できませんでした。ビルドを中止します。");
  result.steps.envHealth = { status: "failed", reason: "node_modules_unrecoverable", method };
  return false;
}

function stepBuild(result, skipBuild) {
  if (skipBuild) {
    result.steps.build = { status: "skipped", reason: "--skip-build" };
    return true;
  }
  if (!ensureNodeModulesForBuild(result)) {
    result.steps.build = { status: "failed", reason: "env_health_unrecoverable" };
    return false;
  }
  console.log("[2/5] npm run build");
  const r = runSync(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "build"]);
  if (r.status !== 0) {
    result.steps.build = { status: "failed", reason: "npm_run_build_failed", code: r.status };
    return false;
  }
  result.steps.build = { status: "ok" };
  return true;
}

function stepDistCheck(result, slug) {
  const articleIndex = join(ROOT, "dist", "articles", slug, "index.html");
  const articlesIndex = join(ROOT, "dist", "articles", "index.html");
  const homeIndex = join(ROOT, "dist", "index.html");
  const articleHtmlExists = existsSync(articleIndex);
  const articlesListExists = existsSync(articlesIndex);
  const homeExists = existsSync(homeIndex);

  // thumbnail / fig 画像のいずれかが dist にあるか
  const thumbDir = join(ROOT, "dist", "images", "thumbnails");
  const figDir = join(ROOT, "dist", "images");
  let thumbnailFound = false;
  if (existsSync(thumbDir)) {
    try {
      thumbnailFound = readdirSync(thumbDir).some((f) => f.startsWith(slug + "."));
    } catch {
      thumbnailFound = false;
    }
  }
  let figFound = false;
  if (existsSync(figDir)) {
    // 画像系拡張子のいずれかが dist/images 配下にあれば OK
    try {
      const entries = readdirSync(figDir);
      figFound = entries.length > 0;
    } catch {
      figFound = false;
    }
  }

  result.steps.distCheck = {
    status:
      articleHtmlExists && articlesListExists && homeExists && thumbnailFound
        ? "ok"
        : "failed",
    articleHtml: articleHtmlExists,
    articlesIndex: articlesListExists,
    homeIndex: homeExists,
    thumbnailFound,
    figFound,
  };
  if (!articleHtmlExists) {
    result.errorReason = "dist_article_html_missing";
    console.error(`  [error] dist/articles/${slug}/index.html が見つかりません。先に build してください。`);
    return false;
  }
  if (!articlesListExists) {
    result.errorReason = "dist_articles_index_missing";
    console.error("  [error] dist/articles/index.html が見つかりません。一覧ページ未生成です。");
    return false;
  }
  if (!homeExists) {
    result.errorReason = "dist_home_index_missing";
    console.error("  [error] dist/index.html が見つかりません。サイト全体が未 build です。");
    return false;
  }
  if (!thumbnailFound) {
    result.errorReason = "dist_thumbnail_missing";
    console.error(`  [error] dist/images/thumbnails/ に ${slug}.* が見つかりません。`);
    return false;
  }
  console.log("[3/5] dist 整合性 OK");
  return true;
}

function stepWranglerDeploy(result, dryRun, skipWrangler = false) {
  const hasToken = Boolean(process.env.CLOUDFLARE_API_TOKEN);
  const hasAccount = Boolean(process.env.CLOUDFLARE_ACCOUNT_ID);
  if (skipWrangler) {
    result.steps.wrangler = { status: "skipped_test", note: "--skip-wrangler（テスト専用。deploy せず後続工程を検証）" };
    console.log("[4/5] wrangler pages deploy: skipped (--skip-wrangler, test only)");
    return true;
  }
  if (dryRun) {
    result.steps.wrangler = {
      status: "dry_run",
      command:
        "wrangler pages deploy dist --project-name=sumalabo --branch=main",
      hasCloudflareApiToken: hasToken,
      hasCloudflareAccountId: hasAccount,
      note: "実行はスキップしました (--dry-run)。",
    };
    console.log("[4/5] wrangler pages deploy: dry-run (実行スキップ)");
    return true;
  }
  if (!hasToken) {
    result.steps.wrangler = { status: "failed", reason: "missing_CLOUDFLARE_API_TOKEN" };
    result.errorReason = "missing_CLOUDFLARE_API_TOKEN";
    console.error("  [error] CLOUDFLARE_API_TOKEN 環境変数が未設定です。値は表示しません。");
    return false;
  }
  console.log("[4/5] wrangler pages deploy dist --project-name=sumalabo --branch=main");
  const r = runSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "wrangler",
      "pages",
      "deploy",
      "dist",
      "--project-name=sumalabo",
      "--branch=main",
      "--commit-dirty=true",
    ],
  );
  if (r.status !== 0) {
    result.steps.wrangler = { status: "failed", reason: "wrangler_deploy_failed", code: r.status };
    result.errorReason = "wrangler_deploy_failed";
    return false;
  }
  result.steps.wrangler = {
    status: "ok",
    command: "wrangler pages deploy dist --project-name=sumalabo --branch=main",
    hasCloudflareApiToken: true,
    hasCloudflareAccountId: hasAccount,
  };
  return true;
}

async function stepVerify(result, slug, verifyUrl, timeoutMs, noVerify) {
  if (noVerify) {
    result.steps.verify = { status: "skipped", reason: "--no-verify" };
    return true;
  }
  const url = verifyUrl || `https://sumalabo.com/api/verify-publication?slug=${encodeURIComponent(slug)}`;
  const deadline = Date.now() + timeoutMs;
  const intervalMs = 10_000;
  let attempts = 0;
  let lastBody = null;
  console.log(`[5/5] verify-publication polling: ${url} (timeout ${timeoutMs}ms)`);
  while (Date.now() < deadline) {
    attempts++;
    const res = await httpGetJson(url);
    if (res.status === 0) {
      // network error — retry
      await new Promise((r) => setTimeout(r, intervalMs));
      continue;
    }
    const body = res.json;
    lastBody = body;
    if (body && body.status === "published") {
      result.steps.verify = {
        status: "ok",
        attempts,
        productionUrl: body.productionUrl,
      };
      result.productionUrl = body.productionUrl || null;
      console.log(`  verify: published (${attempts} attempts)`);
      return true;
    }
    if (body && body.status === "failed") {
      result.steps.verify = {
        status: "failed",
        attempts,
        failedChecks: body.failedChecks || [],
      };
      result.errorReason = "verify_failed";
      return false;
    }
    // awaiting_production_deploy (CDN反映待ち) → retry
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  result.steps.verify = {
    status: "timeout",
    attempts,
    lastStatus: lastBody && lastBody.status,
    lastFailedChecks: (lastBody && lastBody.failedChecks) || [],
  };
  result.errorReason = "verify_timeout";
  return false;
}

// ----- main -----
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = makeResult();
  result.dryRun = args.dryRun;
  result.slug = args.slug;
  result.trigger = args.trigger;
  result.runMode = args.runMode;

  if (!isValidSlug(args.slug) || !["attended", "night", "automation", "maintenance"].includes(args.runMode)) {
    result.errorReason = "missing_or_invalid_slug";
    console.error("usage: node scripts/automation/deploy-production-from-main.mjs --slug=<slug> [--dry-run] [--skip-build] [--no-verify] [--trigger=manual|auto_after_veto] [--run-mode=attended|night|automation|maintenance]");
    finalize(result, args, /*exitCode*/ 2);
    return;
  }

  // Phase B 入口の autonomy ゲート（L1 基盤）:
  //   - paused: true → kill switch。手動/自動を問わず停止
  //   - trigger=auto_after_veto は level>=1 が必要（L0 では自動 Phase B は走らない）
  //   - trigger=manual（ユーザー明示了承済み）は level に関係なく通す
  const g = gate({ phase: "phase_b", trigger: args.trigger });
  result.autonomyLevel = g.level;
  result.steps.autonomyGate = { status: g.allowed ? "ok" : "blocked", level: g.level, trigger: args.trigger, reason: g.reason };
  if (!g.allowed) {
    result.errorReason = g.reason;
    console.error(`[autonomy] BLOCK: ${g.reason} (level=${g.level}, trigger=${args.trigger}, paused=${g.paused})`);
    if (g.paused) {
      await notifyAutonomyEvent({ slug: args.slug, status: "autonomy_blocked", title: `[autonomy] Phase B停止: ${g.reason} (${args.slug})` }).catch(() => {});
    }
    finalize(result, args, 1);
    return;
  }

  // 2026-08-01: 公開前に人の応答を待つゲートを全廃。runMode は監査用の経路名として残すが、公開可否は機械検品だけで決める。
  result.steps.prepublishHumanReview = { status: "removed", runMode: args.runMode, policy: "machine_qa_only" };

  console.log(`Wrangler production deploy for slug=${args.slug}${args.dryRun ? " (DRY RUN)" : ""} (trigger=${args.trigger}, autonomyLevel=${g.level})`);

  if (!stepGitSync(result, args.skipGitSync)) {
    finalize(result, args, 1);
    return;
  }
  if (!stepBuild(result, args.skipBuild)) {
    finalize(result, args, 1);
    return;
  }
  if (!stepDistCheck(result, args.slug)) {
    finalize(result, args, 1);
    return;
  }
  if (!stepWranglerDeploy(result, args.dryRun, args.skipWrangler)) {
    finalize(result, args, 1);
    return;
  }
  // deploy 直後の個別キャッシュパージ（記事 / トップ / 一覧 / sitemap / サムネ）。
  // 公開直後の反映遅延と「旧ビルド配信」誤検知を減らす（L1 仕上げで追加）。
  // パージ権限が無ければ skip 記録のみで deploy は成功扱い（非致命）。
  if (!args.dryRun && !args.skipWrangler) {
    // cache-purge は fetch(undici) を使うため子プロセスで実行する（本体プロセスに
    // undici ハンドルを残さない = 無言クラッシュ対策）
    const purgeScript = join(ROOT, "scripts", "automation", "cache-purge.mjs");
    const pr = spawnSync(process.execPath, [purgeScript, `--slug=${args.slug}`], { cwd: ROOT, stdio: "pipe", env: process.env, encoding: "utf-8" });
    const purgeOk = pr.status === 0;
    result.steps.cachePurge = { status: purgeOk ? "ok" : "skipped", exitCode: pr.status };
    if (purgeOk) console.log("[post] cache purge ok");
    else console.warn("[post] cache purge 不可（権限未設定なら想定内。Zone → Cache Purge 権限で有効化）");
  }

  // verify は dry-run のときも --no-verify でない限り polling を試みる場合があるが、
  // dry-run なら deploy していないので verify はスキップする (デフォルト動作)。
  const effectiveNoVerify = args.noVerify || args.dryRun;
  if (!(await stepVerify(result, args.slug, args.verifyUrl, args.verifyTimeoutMs, effectiveNoVerify))) {
    if (!args.dryRun) {
      finalize(result, args, 1);
      return;
    }
  }

  // verify 成功後: 正常ビルド成果物を builds/last-good/ へ退避（rollback の第2候補用）
  if (!args.dryRun) {
    await stepLastGoodSnapshot(result, args.slug);
  }

  // 公開直後の事後検査（L1 基盤）: hard fail なら post-publish-verify 側が
  // rollback + incident 記録 + 通知まで行う。
  if (!args.dryRun && !args.skipPostVerify) {
    await stepPostPublishVerify(result, args);
  }

  result.ok = result.errorReason === null;
  if (result.ok && !args.dryRun) {
    try {
      const cleanup = archiveAfterSuccessfulDeploy({
        slug: args.slug,
        deploymentProof: {
          ok: true,
          verifyStatus: result.steps.verify.status,
          postPublishStatus: result.steps.postPublishVerify.status,
          productionUrl: result.productionUrl,
          deploymentId: result.steps.lastGoodSnapshot?.deploymentId || null,
          verifiedAt: new Date().toISOString(),
        },
      });
      result.steps.imageOutputCleanup = cleanup;
      if (cleanup.status === "archived") console.log(`[post] Codex画像原本をarchiveへ移動: ${cleanup.destination}`);
      else if (cleanup.status === "skipped") console.warn(`[post] Codex画像原本は作業中のまま維持: ${cleanup.reason}`);
    } catch (error) {
      // 後片付け失敗で公開済みdeployを失敗扱いにはしない。原本は移動されず安全側に残る。
      result.steps.imageOutputCleanup = { status: "failed", reason: error.message || String(error) };
      console.warn(`[post] Codex画像後片付け失敗（原本は維持）: ${error.message || error}`);
    }
  }
  finalize(result, args, result.ok ? 0 : 1);
}

// dist を builds/last-good/ にコピーし、canonical deployment id を記録する。
// 失敗しても deploy 自体は成功扱い（rollback 第1候補の API 方式が別にあるため warning のみ）。
async function stepLastGoodSnapshot(result, slug) {
  const lastGoodDir = join(ROOT, "builds", "last-good");
  const distDir = join(ROOT, "dist");
  try {
    rmSync(join(lastGoodDir, "dist"), { recursive: true, force: true });
    mkdirSync(join(lastGoodDir, "dist"), { recursive: true });
    if (!copyDirReliable(distDir, join(lastGoodDir, "dist"))) {
      throw new Error("copyDirReliable failed");
    }
    writeFileSync(
      join(lastGoodDir, "last-good.json"),
      JSON.stringify({ slug, at: new Date().toISOString(), deploymentId: null }, null, 2) + "\n",
      "utf-8",
    );
    result.steps.lastGoodSnapshot = { status: "ok" };
  } catch (e) {
    result.steps.lastGoodSnapshot = { status: "failed", reason: e && e.message };
    console.warn("  [warn] last-good snapshot 失敗（rollback は API 方式が第1候補なので続行）");
    return;
  }
  // canonical deployment id を best effort で記録（API rollback の対象特定に使う）
  try {
    const id = await recordCanonicalDeploymentId(lastGoodDir);
    if (id) result.steps.lastGoodSnapshot.deploymentId = id.slice(0, 8);
  } catch {}
}

async function recordCanonicalDeploymentId(lastGoodDir) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !account) return null;
  try {
    const res = await httpGetJson(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/sumalabo`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const id = res.json?.result?.canonical_deployment?.id || null;
    if (id) {
      const metaPath = join(lastGoodDir, "last-good.json");
      const meta = JSON.parse(readFileSync(metaPath, "utf-8"));
      meta.deploymentId = id;
      writeFileSync(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf-8");
    }
    return id;
  } catch {
    return null;
  }
}

async function stepPostPublishVerify(result, args) {
  const script = join(ROOT, "scripts", "automation", "post-publish-verify.mjs");
  console.log("[post] post-publish verify (hard fail なら自動 rollback)...");
  const extraArgs = (process.env.DEPLOY_POST_VERIFY_EXTRA_ARGS || "").split(/\s+/).filter(Boolean);
  const r = spawnSync(
    process.execPath,
    [script, `--slug=${args.slug}`, `--trigger=${args.trigger}`, ...extraArgs],
    { cwd: ROOT, stdio: "inherit", env: process.env },
  );
  result.steps.postPublishVerify = {
    status: r.status === 0 ? "ok" : "hard_fail",
    exitCode: r.status,
    log: `logs/publish/${args.slug}.verify.json`,
  };
  if (r.status !== 0) {
    result.errorReason = "post_publish_verify_hard_fail";
  }
}

function finalize(result, args, exitCode) {
  result.finishedAt = new Date().toISOString();
  const json = JSON.stringify(result, null, 2);
  if (args.output) {
    try {
      mkdirSync(dirname(args.output), { recursive: true });
    } catch {}
    try {
      writeFileSync(args.output, json + "\n", "utf-8");
    } catch (e) {
      console.error("  [warn] result の保存に失敗:", e && e.message ? e.message : e);
    }
  }
  console.log("---RESULT JSON---");
  console.log(json);
  // fetch ハンドル残存時の process.exit() は Windows Node でクラッシュするため自然終了
  process.exitCode = exitCode;
}

main().catch((err) => {
  console.error("[fatal]", err && err.message ? err.message : err);
  process.exitCode = 1;
});
