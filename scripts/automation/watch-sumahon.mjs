#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { loadAutomationConfig } from "../sumahon/automation-config.mjs";
import {
  assertSumahonUrl,
  cleanTitle,
  decodeHtml,
  parseArgs,
  readJson,
  runCommand,
  slugifyFromUrl,
  toIsoJst,
  writeJson,
} from "../sumahon/utils.mjs";

const seenPath = "data/automation/seen-sumahon-urls.json";
const queuePath = "data/automation/sumahon-queue.json";
const jobsDir = "data/automation/jobs";
const automationLogDir = "logs/automation";
const defaultRssUrl = "https://smhn.info/feed";
const knownStatuses = [
  "queued",
  "processing",
  "prepared",
  "preview_created",
  "human_review_waiting",
  "failed",
  "skipped",
  "published",
];

function nowIso() {
  return toIsoJst(new Date());
}

function timestampForFile(date = new Date()) {
  return toIsoJst(date).replace(/[:+]/g, "").replace(/-/g, "");
}

function normalizeSeen(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.urls)) {
    return data.urls;
  }

  return [];
}

function jobFilePath(slug) {
  return path.join(jobsDir, `${slug}.json`).replaceAll("\\", "/");
}

function jobPriority(title = "") {
  if (/AI|iPhone|Android|スマホ|通信|料金|Copilot|Claude|ChatGPT|Gemini/i.test(title)) {
    return "high";
  }

  if (/ガジェット|充電|バッテリー|イヤホン|PC|アプリ/i.test(title)) {
    return "medium";
  }

  return "low";
}

function priorityWeight(priority) {
  return { high: 0, medium: 1, low: 2 }[priority] ?? 3;
}

function parseRssItems(xml) {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)];

  return itemMatches
    .map(([item]) => {
      const title = decodeHtml(item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/i)?.[1]
        || item.match(/<title>([\s\S]*?)<\/title>/i)?.[1]
        || "").trim();
      const link = decodeHtml(item.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "").trim();
      const pubDate = decodeHtml(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim();
      const description = decodeHtml(item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/i)?.[1]
        || item.match(/<description>([\s\S]*?)<\/description>/i)?.[1]
        || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

      if (!link || !link.includes("smhn.info")) {
        return null;
      }

      return {
        url: link,
        title: cleanTitle(title),
        publishedAt: pubDate,
        summary: description.slice(0, 240),
      };
    })
    .filter(Boolean);
}

async function fetchSumahonItems(rssUrl) {
  const response = await fetch(rssUrl, {
    headers: {
      "User-Agent": "sumalabo-watch/0.1 (+https://sumalabo.com)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseRssItems(xml);
}

async function readAllJobs() {
  if (!existsSync(jobsDir)) {
    return [];
  }

  const files = (await readdir(jobsDir)).filter((file) => file.endsWith(".json"));
  const jobs = [];

  for (const file of files) {
    const filePath = path.join(jobsDir, file);
    const job = await readJson(filePath, null);
    if (job) {
      jobs.push({ ...job, filePath: filePath.replaceAll("\\", "/") });
    }
  }

  return jobs;
}

function countJobsByStatus(jobs) {
  return knownStatuses.reduce((counts, status) => {
    counts[status] = jobs.filter((job) => job.status === status).length;
    return counts;
  }, {});
}

async function buildQueueSnapshot(extra = {}) {
  const jobs = (await readAllJobs()).sort((a, b) =>
    priorityWeight(a.priority) - priorityWeight(b.priority)
      || String(a.detectedAt).localeCompare(String(b.detectedAt))
      || String(a.slug).localeCompare(String(b.slug)),
  );

  return {
    updatedAt: nowIso(),
    source: "sumahon",
    lockOwner: "runner",
    lockNote: "This watcher does not create its own lock. Windows Task Scheduler runner owns duplicate-run prevention.",
    statuses: knownStatuses,
    counts: countJobsByStatus(jobs),
    total: jobs.length,
    jobs: jobs.map(({ filePath, ...job }) => ({
      ...job,
      filePath,
    })),
    ...extra,
  };
}

async function writeQueueSnapshot(extra = {}) {
  const snapshot = await buildQueueSnapshot(extra);
  await writeJson(queuePath, snapshot);
  return snapshot;
}

function makeJob(item) {
  const slug = slugifyFromUrl(item.url, "sumahon-topic");

  return {
    url: item.url,
    title: item.title,
    slug,
    source: "sumahon",
    priority: jobPriority(item.title),
    status: "queued",
    detectedAt: nowIso(),
    startedAt: null,
    finishedAt: null,
    attempts: 0,
    lastError: null,
    previewBranch: null,
    humanReviewRequired: true,
  };
}

async function writeRunLog(payload) {
  const filePath = `${automationLogDir}/${timestampForFile()}-sumahon-watch.json`;
  await writeJson(filePath, payload);
  return filePath;
}

async function enqueueNewJobs(items, options, events) {
  const seenUrls = normalizeSeen(await readJson(seenPath, []));
  const jobs = await readAllJobs();
  const knownUrls = new Set([...seenUrls, ...jobs.map((job) => job.url)]);
  const newItems = items.filter((item) => !knownUrls.has(item.url));
  const created = [];

  for (const item of newItems) {
    const job = makeJob(item);
    created.push(job);
    events.push({ type: "job_queued", at: nowIso(), url: job.url, slug: job.slug, priority: job.priority });

    if (!options.dryRun) {
      await writeJson(jobFilePath(job.slug), job);
      seenUrls.push(job.url);
    }
  }

  if (!options.dryRun) {
    await writeJson(seenPath, [...new Set(seenUrls)]);
  }

  return created;
}

async function pickQueuedJob(events, inMemoryJobs = []) {
  const jobs = [...(await readAllJobs()), ...inMemoryJobs];
  const queued = jobs
    .filter((job) => job.status === "queued")
    .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority)
      || String(a.detectedAt).localeCompare(String(b.detectedAt)));

  const job = queued[0] || null;
  events.push({ type: "picked_job", at: nowIso(), slug: job?.slug || null, queuedCount: queued.length });
  return job;
}

async function markJob(job, patch) {
  const next = { ...job, ...patch };
  await writeJson(job.filePath || jobFilePath(job.slug), next);
  return next;
}

async function processJob(job, options, events) {
  if (options.dryRun) {
    events.push({ type: "job_process_skipped", at: nowIso(), slug: job.slug, reason: "dry_run" });
    return;
  }

  let current = await markJob(job, {
    status: "processing",
    startedAt: nowIso(),
    attempts: Number(job.attempts || 0) + 1,
    lastError: null,
  });
  events.push({ type: "job_processing", at: nowIso(), slug: current.slug, url: current.url });

  if (options.enqueueOnly) {
    events.push({ type: "job_process_skipped", at: nowIso(), slug: current.slug, reason: "enqueue_only" });
    await markJob(current, { status: "queued", startedAt: null });
    return;
  }

  try {
    await runCommand("npm.cmd", ["run", "article:prepare-from-sumahon", "--", "--url", current.url]);
    current = await markJob(current, {
      status: "human_review_waiting",
      finishedAt: nowIso(),
      humanReviewRequired: true,
    });
    events.push({ type: "job_handoff_created", at: nowIso(), slug: current.slug, status: current.status });
  } catch (error) {
    await markJob(current, {
      status: "failed",
      finishedAt: nowIso(),
      lastError: error.message,
      humanReviewRequired: true,
    });
    events.push({ type: "job_failed", at: nowIso(), slug: current.slug, error: error.message });
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const config = await loadAutomationConfig();
  const watchConfig = {
    ...config.watch,
    rssUrl: args["rss-url"] || config.watch.rssUrl || defaultRssUrl,
    maxJobsPerRun: Number(args["max-jobs"] || config.watch.maxJobsPerRun || 1),
  };
  const options = {
    dryRun: Boolean(args["dry-run"]),
    enqueueOnly: Boolean(args["enqueue-only"]),
  };
  const events = [];
  let runLogPath = null;

  try {
    if (args.status) {
      const snapshot = await buildQueueSnapshot({ mode: "status" });
      console.log(JSON.stringify({
        status: "completed",
        queuePath,
        counts: snapshot.counts,
        total: snapshot.total,
      }, null, 2));
      return;
    }

    if (!watchConfig.enabled) {
      events.push({ type: "watch_disabled", at: nowIso() });
      runLogPath = await writeRunLog({ status: "skipped", events });
      console.log(JSON.stringify({ status: "skipped", reason: "watch_disabled", runLogPath }, null, 2));
      return;
    }

    events.push({
      type: "lock_delegated_to_runner",
      at: nowIso(),
      note: "Duplicate-run prevention is handled by scripts/automation/run-sumahon-queue.ps1.",
    });

    const manualUrls = []
      .concat(args.url ? [args.url] : [])
      .concat(args.urls ? String(args.urls).split(",") : [])
      .filter(Boolean)
      .map((url) => assertSumahonUrl(url, "sumahon:watch"));

    const fetchedItems = manualUrls.length > 0
      ? manualUrls.map((url) => ({ url, title: slugifyFromUrl(url), publishedAt: "", summary: "Manual URL input" }))
      : await fetchSumahonItems(watchConfig.rssUrl);

    events.push({
      type: manualUrls.length > 0 ? "manual_urls_loaded" : "rss_loaded",
      at: nowIso(),
      count: fetchedItems.length,
      rssUrl: manualUrls.length > 0 ? null : watchConfig.rssUrl,
    });

    const created = await enqueueNewJobs(fetchedItems, options, events);
    if (!options.dryRun) {
      await writeQueueSnapshot({ lastRunStartedAt: nowIso() });
    }
    const inMemoryJobs = options.dryRun ? [...created] : [];
    let processedCount = 0;

    for (let index = 0; index < watchConfig.maxJobsPerRun; index += 1) {
      const job = await pickQueuedJob(events, inMemoryJobs);
      if (!job) {
        break;
      }

      await processJob(job, options, events);
      if (options.dryRun) {
        const indexInMemory = inMemoryJobs.findIndex((candidate) => candidate.slug === job.slug);
        if (indexInMemory >= 0) {
          inMemoryJobs.splice(indexInMemory, 1);
        } else {
          job.status = "dry_run_processed";
        }
      }
      processedCount += 1;
      if (!options.dryRun) {
        await writeQueueSnapshot({ lastProcessedSlug: job.slug });
      }
    }

    const queueSnapshot = options.dryRun
      ? await buildQueueSnapshot({ dryRunPreviewCreated: created.length })
      : await writeQueueSnapshot({ lastRunFinishedAt: nowIso() });
    runLogPath = await writeRunLog({
      status: "completed",
      dryRun: options.dryRun,
      enqueueOnly: options.enqueueOnly,
      maxJobsPerRun: watchConfig.maxJobsPerRun,
      queuedCreated: created.length,
      processedCount,
      queuePath,
      queueCounts: queueSnapshot.counts,
      events,
    });

    console.log(JSON.stringify({
      status: "completed",
      dryRun: options.dryRun,
      enqueueOnly: options.enqueueOnly,
      rssUrl: watchConfig.rssUrl,
      queuedCreated: created.length,
      processedCount,
      queuePath,
      queueCounts: queueSnapshot.counts,
      runLogPath,
      note: "Each run processes at most maxJobsPerRun job(s). Default is 1.",
    }, null, 2));
  } catch (error) {
    events.push({ type: "run_failed", at: nowIso(), error: error.message });
    if (!options.dryRun) {
      await writeQueueSnapshot({ lastRunFailedAt: nowIso(), lastError: error.message });
    }
    runLogPath = await writeRunLog({ status: "failed", error: error.message, events });
    console.error(JSON.stringify({ status: "failed", error: error.message, runLogPath }, null, 2));
    process.exitCode = 1;
  }
}

main();
