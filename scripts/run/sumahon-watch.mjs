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
import { fetchSumahonFeed } from "../sumahon/sumahon-feed.mjs";
import {
  enqueueIfNew,
  pickNextQueued,
  updateStatus,
  readQueue,
  summarizeQueue,
  PATHS,
} from "../sumahon/queue-store.mjs";
import { runCommand, toIsoJst } from "../sumahon/utils.mjs";

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
  // 既存実装に委譲: create-from-sumahon が source fetch → MDX 作成 → Preview ブランチ push → PR 作成 → processed-urls 追記 までやる
  // X 投稿は呼ばない（create-from-sumahon に X 投稿ステップは含まれない、本 watch でも呼ばない）
  try {
    await runCommand(process.execPath, [
      "scripts/run/create-from-sumahon.mjs",
      "--url",
      entry.url,
    ]);
    return { ok: true };
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
        });
        processedCount++;
        events.push({ type: "job_completed", url: entry.url, status: "preview_created" });
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
