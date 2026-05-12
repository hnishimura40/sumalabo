#!/usr/bin/env node
// すまほん watch CLI
//
// 役割:
//   1. すまほん RSS / HTML から新着 URL を取得
//   2. data/automation/processed-urls.json と data/automation/sumahon-queue.json で既処理/既キューを除外
//   3. 残りをキューに追加 (status=queued)
//   4. 1 回の起動で最大 --max-jobs 件まで処理（既定 1）
//   5. 処理は scripts/run/create-from-sumahon.mjs に委譲（Preview ブランチ push + PR 作成 + processed-urls 更新まで既存実装）
//   6. 失敗時は status=failed + errorReason、記事公開は破壊しない
//   7. ログは logs/automation/{stamp}-sumahon-watch.json
//
// CLI:
//   --dry-run            : 新着検知 + キュー化のみ、処理しない
//   --max-jobs N         : 1 起動あたりの最大処理数（既定 1）
//   --rss-url URL        : RSS の URL を上書き
//   --no-rss             : RSS フェッチをスキップ（manual のみ）
//   --manual-only        : RSS / HTML フェッチをスキップ
//   --manual-urls-file P : 追加 URL を行ごとに含むテキストファイル（既定 data/automation/manual-queue.txt）
//
// 既存 npm スクリプトとの連携:
//   scripts/automation/run-sumahon-queue.ps1 が呼ぶことを想定。
//   sumahon:watch が走らないと runner 側は safe-stop する設計だが、本ファイルで満たす。
//
// 安全方針:
//   - mainへ直接 push しない（create-from-sumahon が新規 Preview ブランチを作る前提）
//   - 既存記事を破壊しない
//   - X 投稿は呼ばない（CLAUDE.md ポリシー）
//   - 失敗時もキュー全体は壊さない（status=failed で個別エントリだけマーク）

import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fetchSumahonFeed } from "../sumahon/sumahon-feed.mjs";
import {
  enqueueIfNew,
  pickNextQueued,
  updateStatus,
  readQueue,
  summarizeQueue,
  PATHS,
} from "../sumahon/queue-store.mjs";
import { toIsoJst } from "../sumahon/utils.mjs";
import { notifyReviewReady } from "../sumahon/notify-review-ready.mjs";

// node.exe (process.execPath) を直接 spawn する。shell: true だとパスに含まれる
// スペース ("C:\Program Files\nodejs\node.exe") で 'C:\Program' is not recognized
// エラーになるため、明示的に shell: false にする。.exe ファイルは Node 24+ でも
// shell なしで spawn できる (CVE-2024-27980 の制約は .cmd / .bat に限定)。
//
// stdout は capture もする (create-from-sumahon が末尾に JSON で結果を出力する。
// slug / branchName / mdxPath を後段の notify で使うため)。stderr は parent の
// stderr へ inherit して runner のログに残す。
function spawnNode(scriptPath, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: ["ignore", "pipe", "inherit"],
      shell: false,
    });
    let stdoutBuf = "";
    child.stdout.on("data", (chunk) => {
      const s = chunk.toString();
      stdoutBuf += s;
      process.stdout.write(s); // ログにも残す
    });
    child.on("exit", (code) => {
      if (code === 0) resolve({ stdout: stdoutBuf });
      else reject(new Error(`${process.execPath} ${scriptPath} ${args.join(" ")} failed with exit code ${code}`));
    });
    child.on("error", reject);
  });
}

// create-from-sumahon が末尾に出力する JSON.stringify(...) を後ろから走査して
// パース。複数行に渡るかもしれないので、最終 `{}` ブロックを抽出する。
function extractTrailingJson(stdout) {
  if (!stdout) return null;
  const trimmed = stdout.trim();
  const lastBrace = trimmed.lastIndexOf("}");
  if (lastBrace < 0) return null;
  // 最後の { から最後の } までを取り出してパースを試みる
  let depth = 0;
  let start = -1;
  for (let i = lastBrace; i >= 0; i--) {
    const c = trimmed[i];
    if (c === "}") depth++;
    else if (c === "{") {
      depth--;
      if (depth === 0) {
        start = i;
        break;
      }
    }
  }
  if (start < 0) return null;
  try {
    return JSON.parse(trimmed.slice(start, lastBrace + 1));
  } catch {
    return null;
  }
}

function parseArgs(argv) {
  const args = { maxJobs: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--no-rss") args.noRss = true;
    else if (a === "--manual-only") args.manualOnly = true;
    else if (a === "--max-jobs") {
      args.maxJobs = parseInt(argv[++i], 10) || 1;
    } else if (a === "--rss-url") {
      args.rssUrl = argv[++i];
    } else if (a === "--manual-urls-file") {
      args.manualUrlsFile = argv[++i];
    }
  }
  return args;
}

async function readManualUrls(filePath) {
  if (!filePath) return [];
  if (!existsSync(filePath)) return [];
  const raw = await readFile(filePath, "utf-8");
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((url) => ({ url, title: "", publishedAt: null, source: "manual" }));
}

async function appendLog(events, status, summary, logPath) {
  const dir = path.dirname(logPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  await writeFile(
    logPath,
    JSON.stringify({ status, ...summary, events }, null, 2) + "\n",
    "utf-8",
  );
}

async function processOne(entry, { dryRun }) {
  if (dryRun) {
    return { ok: true, dryRun: true, note: "dry-run, would call create-from-sumahon" };
  }
  // 既存実装に委譲: create-from-sumahon が source fetch → MDX 作成 → Preview ブランチ push まで。
  // 完了後、stdout 末尾の JSON から slug/branch を取り出して notify-review-ready を呼ぶ。
  // X 投稿は呼ばない (CLAUDE.md ポリシー準拠)。
  try {
    const { stdout } = await spawnNode("scripts/run/create-from-sumahon.mjs", ["--url", entry.url]);
    const trail = extractTrailingJson(stdout) || {};
    // create-from-sumahon の最終 JSON には slug が直接含まれないので、
    // mdxPath ("content/articles/{slug}.mdx") から派生させる。
    // 将来 create-from-sumahon が slug を出力するようになれば trail.slug を優先する。
    let slug = typeof trail.slug === "string" ? trail.slug : null;
    if (!slug && typeof trail.mdxPath === "string") {
      const m = trail.mdxPath.match(/[\\/]([^\\/]+)\.mdx$/);
      if (m) slug = m[1];
    }
    const branch = typeof trail.branchName === "string" ? trail.branchName : null;
    const title = typeof trail.generatedTitle === "string" ? trail.generatedTitle : entry.title;

    let notifyResult = null;
    if (slug && branch) {
      // Cloudflare Pages の branch preview URL は branch 名から派生する規約。
      // 厳密な URL は PR コメントで取得するのが安全だが、ここでは候補として渡す。
      const branchSlug = branch.replace(/\//g, "-").slice(0, 60);
      const previewUrlHint = `https://${branchSlug}.sumalabo.pages.dev`;
      try {
        notifyResult = await notifyReviewReady({
          item: {
            slug,
            title,
            branch,
            previewUrl: previewUrlHint,
            status: "review",
            createdAt: new Date().toISOString(),
          },
        });
      } catch (notifyErr) {
        notifyResult = { ok: false, error: notifyErr.message || String(notifyErr) };
      }
    }

    return { ok: true, slug, branch, title, notifyResult };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const events = [];
  const startedAt = new Date();
  const stamp = startedAt.toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const logPath = path.join("logs", "automation", `${stamp}-sumahon-watch.json`);

  events.push({
    type: "started",
    at: toIsoJst(startedAt),
    args: {
      dryRun: Boolean(args.dryRun),
      maxJobs: args.maxJobs,
      noRss: Boolean(args.noRss),
      manualOnly: Boolean(args.manualOnly),
      rssUrl: args.rssUrl || null,
      manualUrlsFile: args.manualUrlsFile || "data/automation/manual-queue.txt (default if exists)",
    },
  });

  // 1) 新着取得
  const candidates = [];

  // manual URLs (常に load を試みる、空でも OK)
  const manualFile = args.manualUrlsFile || "data/automation/manual-queue.txt";
  const manualUrls = await readManualUrls(manualFile);
  if (manualUrls.length > 0) {
    events.push({ type: "manual_urls_loaded", count: manualUrls.length, file: manualFile });
    candidates.push(...manualUrls);
  }

  // RSS / HTML fetch
  if (!args.manualOnly && !args.noRss) {
    try {
      const feed = await fetchSumahonFeed({ rssUrl: args.rssUrl });
      events.push(...feed.events);
      candidates.push(...feed.items);
    } catch (e) {
      events.push({ type: "feed_fetch_error", error: e.message });
    }
  } else {
    events.push({ type: "feed_fetch_skipped", reason: args.manualOnly ? "manual_only" : "no_rss" });
  }

  // 2) 重複除外 → エンキュー
  let enqueuedCount = 0;
  for (const c of candidates) {
    try {
      const added = await enqueueIfNew(c);
      if (added) {
        enqueuedCount++;
        events.push({
          type: "job_queued",
          url: added.url,
          title: added.title?.slice(0, 80) || null,
          publishedAt: added.publishedAt,
          source: added.source,
        });
      }
    } catch (e) {
      events.push({ type: "enqueue_error", url: c.url, error: e.message });
    }
  }
  events.push({ type: "enqueue_summary", scannedCandidates: candidates.length, enqueuedCount });

  // 3) 処理（最大 maxJobs 件）
  let processedCount = 0;
  let failedCount = 0;
  if (args.dryRun) {
    events.push({ type: "dry_run_skip_processing", note: "dry-run mode: not processing any queued items" });
  } else {
    for (let i = 0; i < args.maxJobs; i++) {
      const entry = await pickNextQueued();
      if (!entry) {
        events.push({ type: "queue_empty", pickedIdx: i });
        break;
      }
      events.push({ type: "picked_job", url: entry.url, attempt: entry.attempts });
      const result = await processOne(entry, { dryRun: false });
      if (result.ok) {
        await updateStatus(entry.url, {
          status: "preview_created",
          completedAt: new Date().toISOString(),
          slug: result.slug || null,
          branch: result.branch || null,
          notifySent: Boolean(result.notifyResult?.ok),
          notifySkippedReason: result.notifyResult?.reason || null,
        });
        processedCount++;
        events.push({
          type: "job_completed",
          url: entry.url,
          status: "preview_created",
          slug: result.slug,
          branch: result.branch,
          notifyOk: Boolean(result.notifyResult?.ok),
          notifySkippedReason: result.notifyResult?.reason || null,
        });
      } else {
        await updateStatus(entry.url, {
          status: "failed",
          errorReason: result.error?.slice(0, 800) || "unknown",
          failedAt: new Date().toISOString(),
        });
        failedCount++;
        events.push({ type: "job_failed", url: entry.url, error: result.error });
        // 1 件失敗で停止（後続まとめて壊さない）
        break;
      }
    }
  }

  // 4) サマリ
  const finalQueue = await readQueue();
  const queueSummary = summarizeQueue(finalQueue);
  const summary = {
    dryRun: Boolean(args.dryRun),
    maxJobsPerRun: args.maxJobs,
    scannedCandidates: candidates.length,
    enqueuedCount,
    processedCount,
    failedCount,
    queueSummary,
    queuePath: PATHS.QUEUE_PATH,
    processedUrlsPath: PATHS.PROCESSED_PATH,
  };
  events.push({ type: "completed", at: toIsoJst(new Date()), summary });
  await appendLog(events, "completed", summary, logPath);

  console.log(JSON.stringify({ logPath, ...summary }, null, 2));
  process.exit(0);
}

main().catch(async (e) => {
  console.error("fatal:", e.message);
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const logPath = path.join("logs", "automation", `${stamp}-sumahon-watch.json`);
  await appendLog(
    [{ type: "fatal", error: e.message, at: toIsoJst(new Date()) }],
    "fatal",
    {},
    logPath,
  ).catch(() => {});
  process.exit(1);
});
