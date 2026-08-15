#!/usr/bin/env node
import crypto from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { verifyPendingBundle } from "./x-pending-bundle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const OUTCOMES = Object.freeze({ SUCCESS: "success", X_PENDING: "stopped_x_pending", STOPPED: "stopped", FAILED: "failed" });
export const EXIT_CODES = Object.freeze({ success: 0, stopped_x_pending: 20, stopped: 20, failed: 30 });
export const ALLOWED_STOP_REASONS = new Set([
  "no_scout_target",
  "measurement_outside_window",
  "veto_triggered",
  "duplicate_run_guard",
  "scheduled_acceptance",
]);

function readJson(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/u, "")); }
  catch { return fallback; }
}

function atomicWriteJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  renameSync(tmp, file);
}

function appendJsonl(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value)}\n`, { encoding: "utf8", flag: "a" });
}

function contractDir(root = ROOT) {
  return path.join(root, "logs", "night", "run-contract");
}

export function outcomeFile(runId, root = ROOT) {
  return path.join(contractDir(root), `${runId}.json`);
}

export function sanitizeRunId(value) {
  const runId = String(value || "").trim();
  if (!/^[0-9A-Za-z][0-9A-Za-z_.:-]{5,80}$/.test(runId)) throw new Error("invalid run id");
  return runId;
}

function parseTime(value) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new Error(`invalid timestamp: ${value}`);
  return ms;
}

function latestByDate(items, field) {
  return items
    .filter((item) => Number.isFinite(Date.parse(item?.[field])))
    .sort((a, b) => Date.parse(b[field]) - Date.parse(a[field]))[0] || null;
}

export function discoverSlugSince({ root = ROOT, startedAt }) {
  const startedMs = parseTime(startedAt);
  const x = readJson(path.join(root, "data", "social", "x-posted.json"), { posts: [] });
  const recentPost = latestByDate((x.posts || []).filter((p) => Date.parse(p.postedAt) >= startedMs), "postedAt");
  if (recentPost?.slug) return recentPost.slug;

  const ledger = readJson(path.join(root, "data", "automation", "ledger.json"), { entries: [] });
  const recentPublish = latestByDate(
    (ledger.entries || []).filter((e) => Date.parse(e.publishedAt) >= startedMs),
    "publishedAt",
  );
  if (recentPublish?.slug) return recentPublish.slug;

  const articleDir = path.join(root, "logs", "article");
  if (!existsSync(articleDir)) return null;
  const recentHandoff = readdirSync(articleDir)
    .filter((name) => name.endsWith(".publish-handoff.json"))
    .map((name) => readJson(path.join(articleDir, name)))
    .filter((handoff) => {
      if (!handoff || typeof handoff.slug !== "string" || !handoff.slug) return false;
      const timestamp = handoff.createdAt || handoff.completedAt;
      return Number.isFinite(Date.parse(timestamp)) && Date.parse(timestamp) >= startedMs;
    })
    .sort((a, b) => Date.parse(b.createdAt || b.completedAt) - Date.parse(a.createdAt || a.completedAt))[0];
  return recentHandoff?.slug || null;
}

function findArticleState(slug, root) {
  return readJson(path.join(root, "logs", "article", `${slug}.state.json`), {});
}

function findLedgerEntry(slug, root) {
  const ledger = readJson(path.join(root, "data", "automation", "ledger.json"), { entries: [] });
  return (ledger.entries || []).find((entry) => entry.slug === slug) || {};
}

function findQueueEntry(slug, root) {
  const queue = readJson(path.join(root, "data", "automation", "sumahon-queue.json"), []);
  return (Array.isArray(queue) ? queue : []).find((entry) => entry.slug === slug) || {};
}

export function findPrUrl(slug, root = ROOT) {
  const state = findArticleState(slug, root);
  const ledger = findLedgerEntry(slug, root);
  const queue = findQueueEntry(slug, root);
  const handoff = readJson(path.join(root, "logs", "article", `${slug}.publish-handoff.json`), {});
  return handoff.prUrl || ledger.prUrl || state?.steps?.commit_pr?.data?.prUrl || queue.prUrl || null;
}

export async function probeArticleHttp(url) {
  if (!url) return { ok: false, status: null, reason: "article_url_missing" };
  try {
    const response = await fetch(url, { redirect: "follow", cache: "no-store" });
    return { ok: response.status === 200, status: response.status, url: response.url };
  } catch (error) {
    return { ok: false, status: null, reason: error instanceof Error ? error.message : String(error) };
  }
}

export async function probePrMerged(prUrl, { token = process.env.GH_TOKEN, fetchImpl = fetch } = {}) {
  if (!prUrl) return { ok: false, reason: "pr_url_missing" };
  if (!token) return { ok: false, reason: "gh_token_missing" };
  const match = String(prUrl).match(/^https:\/\/github\.com\/hnishimura40\/sumalabo\/pull\/(\d+)$/);
  if (!match) return { ok: false, reason: "pr_url_invalid" };
  const response = await fetchImpl(`https://api.github.com/repos/hnishimura40/sumalabo/pulls/${match[1]}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "sumalabo-night-contract",
    },
  });
  if (!response.ok) return { ok: false, reason: `github_api_http_${response.status}` };
  try {
    const value = await response.json();
    return {
      ok: value.merged === true && Boolean(value.merged_at),
      state: value.state,
      mergedAt: value.merged_at || null,
      mergeCommit: value.merge_commit_sha || null,
      url: value.html_url || prUrl,
    };
  } catch (error) {
    return { ok: false, reason: "github_api_invalid_json", detail: error.message };
  }
}

export async function verifyPhaseBCompletion({ root = ROOT, slug, probes = {} }) {
  if (!slug) return { outcome: OUTCOMES.FAILED, reason: "phase_b_slug_missing", slug: null };
  const articleUrl = `https://sumalabo.com/articles/${slug}/`;
  const prUrl = findPrUrl(slug, root);
  const articleHttp200 = await (probes.http || probeArticleHttp)(articleUrl);
  const prMerged = await (probes.pr || ((url) => probePrMerged(url)))(prUrl);
  const failedChecks = [];
  if (articleHttp200?.ok !== true) failedChecks.push("articleHttp200");
  if (prMerged?.ok !== true) failedChecks.push("prMerged");
  return {
    outcome: failedChecks.length === 0 ? OUTCOMES.SUCCESS : OUTCOMES.FAILED,
    reason: failedChecks.length === 0 ? "phase_b_real_world_verified" : `phase_b_incomplete:${failedChecks.join(",")}`,
    slug,
    articleUrl,
    prUrl,
    evidence: { articleHttp200, prMerged },
    failedChecks,
  };
}

export function probeStrictVerify(slug, root = ROOT) {
  const file = path.join(root, "logs", "publish", `${slug}.verify.json`);
  const verify = readJson(file);
  if (!verify) return { ok: false, reason: "strict_verify_missing", file };
  const lastRound = Array.isArray(verify.rounds) ? verify.rounds.at(-1) : null;
  const hardValues = Object.values(lastRound?.hard || {});
  const softValues = Object.values(lastRound?.soft || {});
  const allHard = hardValues.length > 0 && hardValues.every((item) => item?.ok === true);
  const allSoft = softValues.every((item) => item?.ok === true);
  const noRemaining = Array.isArray(verify.softFailRemaining) && verify.softFailRemaining.length === 0;
  const productionTarget = /^https:\/\/sumalabo\.com(?:\/|$)/i.test(String(verify.baseUrl || ""));
  return {
    ok: productionTarget && verify.hardFail === false && allHard && allSoft && noRemaining,
    productionTarget,
    hardFail: verify.hardFail,
    allHard,
    allSoft,
    softFailRemaining: verify.softFailRemaining || [],
    finishedAt: verify.finishedAt || null,
    file,
  };
}

export function probeXTwoStage(slug, root = ROOT) {
  const ledger = readJson(path.join(root, "data", "social", "x-posted.json"), { posts: [] });
  const record = latestByDate((ledger.posts || []).filter((post) => post.slug === slug), "postedAt");
  if (!record) return { ok: false, reason: "x_ledger_record_missing" };
  const mainRecorded = Boolean(record.postedAt && /^https:\/\/x\.com\/[^/]+\/status\/\d+/.test(record.postUrl || ""));
  const replyRecorded = /^https:\/\/x\.com\/[^/]+\/status\/\d+/.test(record.replyUrl || "");
  return {
    ok: mainRecorded && replyRecorded,
    mainRecorded,
    replyRecorded,
    postUrl: record.postUrl || null,
    replyUrl: record.replyUrl || null,
    postedAt: record.postedAt || null,
    route: record.route || null,
  };
}

export async function evaluateSuccessContract({
  root = ROOT,
  runId,
  startedAt,
  slug = null,
  completionKind = "fresh_run",
  xPending = false,
  xWarnings = [],
  probes = {},
}) {
  const normalizedCompletionKind = completionKind === "recovery" ? "recovery" : "fresh_run";
  const resolvedSlug = slug || discoverSlugSince({ root, startedAt });
  if (!resolvedSlug) {
    return { runId, outcome: OUTCOMES.FAILED, reason: "slug_not_resolved", slug: null, evidence: null, completionKind: normalizedCompletionKind, acceptanceEligible: false };
  }
  const ledger = findLedgerEntry(resolvedSlug, root);
  const articleUrl = ledger.productionUrl || ledger.articleUrl || `https://sumalabo.com/articles/${resolvedSlug}/`;
  const prUrl = findPrUrl(resolvedSlug, root);
  const http = await (probes.http || probeArticleHttp)(articleUrl);
  const pr = await (probes.pr || ((url) => probePrMerged(url)))(prUrl);
  const strictVerify = await (probes.strictVerify || ((s) => probeStrictVerify(s, root)))(resolvedSlug);
  const xTwoStage = xPending
    ? { ok: false, pending: true, reason: "x_environment_warning" }
    : await (probes.xTwoStage || ((s) => probeXTwoStage(s, root)))(resolvedSlug);
  const startedMs = parseTime(startedAt);
  const requireFresh = (value, field, label) => {
    if (value?.ok !== true) return value;
    const actualMs = Date.parse(value?.[field]);
    if (!Number.isFinite(actualMs) || actualMs < startedMs) {
      return { ...value, ok: false, reason: `${label}_not_from_current_run` };
    }
    return value;
  };
  const freshPr = requireFresh(pr, "mergedAt", "pr_merge");
  const freshStrictVerify = requireFresh(strictVerify, "finishedAt", "strict_verify");
  const freshXTwoStage = requireFresh(xTwoStage, "postedAt", "x_ledger");
  const xPendingBundle = xPending
    ? (probes.xPendingBundle ? await probes.xPendingBundle(resolvedSlug, runId) : verifyPendingBundle({ root, slug: resolvedSlug, runId }))
    : null;
  const evidence = { articleHttp200: http, prMerged: freshPr, strictVerify: freshStrictVerify, xTwoStage: freshXTwoStage, ...(xPending ? { xPendingBundle } : {}) };
  const articleFailedChecks = [
    ["articleHttp200", http],
    ["prMerged", freshPr],
    ["strictVerify", freshStrictVerify],
  ].filter(([, value]) => value?.ok !== true).map(([key]) => key);
  if (xPending && articleFailedChecks.length === 0 && xPendingBundle?.ok === true) {
    return {
      runId,
      slug: resolvedSlug,
      outcome: OUTCOMES.X_PENDING,
      reason: `x_environment_warning:${[...new Set(xWarnings.map(String).filter(Boolean))].join(",") || "unspecified"}`,
      articleUrl,
      prUrl,
      evidence,
      failedChecks: ["xTwoStage"],
      warningChecks: [...new Set(xWarnings.map(String).filter(Boolean))],
      xPending: true,
      completionKind: normalizedCompletionKind,
      acceptanceEligible: normalizedCompletionKind === "fresh_run",
    };
  }
  if (xPending && xPendingBundle?.ok !== true) articleFailedChecks.push("xPendingBundle");
  const failedChecks = Object.entries(evidence).filter(([, value]) => value?.ok !== true).map(([key]) => key);
  return {
    runId,
    slug: resolvedSlug,
    outcome: failedChecks.length === 0 ? OUTCOMES.SUCCESS : OUTCOMES.FAILED,
    reason: failedChecks.length === 0 ? "four_point_contract_satisfied" : `contract_failed:${failedChecks.join(",")}`,
    articleUrl,
    prUrl,
    evidence,
    failedChecks: xPending ? [...new Set([...articleFailedChecks, ...failedChecks.filter((name) => name !== "xTwoStage")])] : failedChecks,
    warningChecks: xPending ? [...new Set(xWarnings.map(String).filter(Boolean))] : [],
    xPending: xPending === true,
    completionKind: normalizedCompletionKind,
    acceptanceEligible: failedChecks.length === 0 && normalizedCompletionKind === "fresh_run",
  };
}

export function makeStoppedResult({ runId, reason, detail = null }) {
  if (!ALLOWED_STOP_REASONS.has(reason)) {
    return { runId, outcome: OUTCOMES.FAILED, reason: `invalid_stop_reason:${reason || "missing"}`, detail };
  }
  return { runId, outcome: OUTCOMES.STOPPED, reason, detail };
}

export function recordRunOutcome(result, { root = ROOT, startedAt = null, finishedAt = new Date().toISOString() } = {}) {
  const runId = sanitizeRunId(result.runId);
  const record = {
    schemaVersion: 1,
    runId,
    startedAt,
    finishedAt,
    outcome: result.outcome,
    reason: result.reason,
    slug: result.slug || null,
    articleUrl: result.articleUrl || null,
    prUrl: result.prUrl || null,
    evidence: result.evidence || null,
    failedChecks: result.failedChecks || [],
    detail: result.detail || null,
    completionKind: result.completionKind || null,
    acceptanceEligible: result.acceptanceEligible === true,
    warningChecks: result.warningChecks || [],
    xPending: result.xPending === true,
  };
  if (!Object.values(OUTCOMES).includes(record.outcome)) throw new Error(`invalid outcome: ${record.outcome}`);
  atomicWriteJson(outcomeFile(runId, root), record);
  appendJsonl(path.join(contractDir(root), "run-outcomes.jsonl"), record);
  return record;
}

export async function auditRecordedOutcome(record, options = {}) {
  if (!record) return { outcome: OUTCOMES.FAILED, reason: "outcome_record_missing", mismatch: true };
  // A one-off scheduled acceptance is intentionally recorded as stopped.  It
  // must never mask a later production attempt that has not written a contract
  // record yet (for example, when the runner is externally terminated).
  const activeAttemptMs = Date.parse(options.activeAttemptAt || "");
  const recordedFinishedMs = Date.parse(record.finishedAt || record.startedAt || "");
  if (Number.isFinite(activeAttemptMs) && (!Number.isFinite(recordedFinishedMs) || activeAttemptMs > recordedFinishedMs)) {
    return {
      outcome: OUTCOMES.FAILED,
      reason: "current_attempt_missing_contract",
      mismatch: true,
      recordedOutcome: record.outcome,
      recordedRunId: record.runId,
      activeAttemptAt: options.activeAttemptAt,
    };
  }
  if (record.outcome === OUTCOMES.STOPPED) {
    const valid = ALLOWED_STOP_REASONS.has(record.reason);
    return { ...record, outcome: valid ? OUTCOMES.STOPPED : OUTCOMES.FAILED, mismatch: !valid };
  }
  if (record.outcome === OUTCOMES.FAILED) return { ...record, mismatch: false };
  if (record.outcome === OUTCOMES.X_PENDING) {
    const actual = await evaluateSuccessContract({
      ...options,
      runId: record.runId,
      startedAt: record.startedAt,
      slug: record.slug,
      completionKind: record.completionKind || "fresh_run",
      xPending: true,
      xWarnings: record.warningChecks || [],
    });
    const valid = actual.outcome === OUTCOMES.X_PENDING;
    return valid
      ? { ...actual, mismatch: false, recordedOutcome: record.outcome }
      : { ...actual, outcome: OUTCOMES.FAILED, reason: `record_actual_mismatch:${actual.reason}`, mismatch: true, recordedOutcome: record.outcome };
  }
  const actual = await evaluateSuccessContract({
    ...options,
    runId: record.runId,
    startedAt: record.startedAt,
    slug: record.slug,
    completionKind: record.completionKind || "fresh_run",
  });
  if (actual.outcome !== OUTCOMES.SUCCESS) {
    return {
      ...actual,
      outcome: OUTCOMES.FAILED,
      reason: `record_actual_mismatch:${actual.reason}`,
      mismatch: true,
      recordedOutcome: record.outcome,
    };
  }
  return { ...actual, mismatch: false, recordedOutcome: record.outcome };
}

export function latestOutcomeForDate(date, root = ROOT) {
  const dir = contractDir(root);
  if (!existsSync(dir)) return null;
  const records = readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson(path.join(dir, name)))
    .filter((record) => record?.startedAt?.slice(0, 10) === date)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  return records[0] || null;
}

export function recordHumanEvent({ runId, type, reason, actor = "Hiro", slug = null, root = ROOT }) {
  if (!['intervention', 'post_publish_correction'].includes(type)) throw new Error("invalid human event type");
  const event = {
    schemaVersion: 1,
    eventId: crypto.randomUUID(),
    runId: sanitizeRunId(runId),
    at: new Date().toISOString(),
    type,
    actor,
    reason: String(reason || "").trim(),
    slug: slug || null,
  };
  if (!event.reason) throw new Error("reason is required");
  appendJsonl(path.join(contractDir(root), "human-events.jsonl"), event);
  return event;
}

export function recordAutomationExecution({ id, scheduledAt, startedAt, finishedAt, exitCode, output, inputCount, root = ROOT }) {
  const success = Number(exitCode) === 0 && Boolean(output?.trim()) && Number.isInteger(Number(inputCount));
  const record = {
    schemaVersion: 1,
    automationId: String(id),
    scheduledAt,
    startedAt,
    finishedAt,
    outcome: success ? OUTCOMES.SUCCESS : OUTCOMES.FAILED,
    exitCode: Number(exitCode),
    inputCount: Number(inputCount),
    outputSha256: output ? crypto.createHash("sha256").update(output).digest("hex") : null,
    reason: success ? "execution_output_verified" : "execution_contract_failed",
  };
  const dir = path.join(contractDir(root), "automations");
  atomicWriteJson(path.join(dir, `${record.automationId}-${scheduledAt.replace(/[:]/g, "-")}.json`), record);
  return record;
}

export function verifyAutomationExecution({ id, scheduledAt, deadline, root = ROOT }) {
  const file = path.join(contractDir(root), "automations", `${id}-${scheduledAt.replace(/[:]/g, "-")}.json`);
  const record = readJson(file);
  if (!record && Date.now() >= Date.parse(deadline)) {
    return { outcome: OUTCOMES.FAILED, reason: "automation_not_executed", automationId: String(id), scheduledAt };
  }
  if (!record) return { outcome: OUTCOMES.STOPPED, reason: "automation_not_due", automationId: String(id), scheduledAt };
  return record;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) { args._.push(value); continue; }
    const key = value.slice(2);
    const next = argv[i + 1];
    if (next == null || next.startsWith("--")) args[key] = true;
    else { args[key] = next; i += 1; }
  }
  return args;
}

function printAndExit(value) {
  console.log(JSON.stringify(value, null, 2));
  process.exitCode = EXIT_CODES[value.outcome] ?? EXIT_CODES.failed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];
  const root = args.root ? path.resolve(args.root) : ROOT;
  if (command === "evaluate") {
    const result = await evaluateSuccessContract({
      root,
      runId: args["run-id"],
      startedAt: args["started-at"],
      slug: args.slug || null,
      completionKind: args["completion-kind"] || "fresh_run",
      xPending: args["x-pending"] === true,
      xWarnings: String(args["x-warnings"] || "").split(",").filter(Boolean),
    });
    printAndExit(recordRunOutcome(result, { root, startedAt: args["started-at"] }));
    return;
  }
  if (command === "phase-b-check") {
    printAndExit(await verifyPhaseBCompletion({ root, slug: args.slug || null }));
    return;
  }
  if (command === "stop") {
    const result = makeStoppedResult({ runId: args["run-id"], reason: args.reason, detail: args.detail || null });
    printAndExit(recordRunOutcome(result, { root, startedAt: args["started-at"] || null }));
    return;
  }
  if (command === "fail") {
    const result = { runId: args["run-id"], outcome: OUTCOMES.FAILED, reason: args.reason || "unspecified_failure", detail: args.detail || null };
    printAndExit(recordRunOutcome(result, { root, startedAt: args["started-at"] || null }));
    return;
  }
  if (command === "audit") {
    const record = args["run-id"] ? readJson(outcomeFile(args["run-id"], root)) : latestOutcomeForDate(args.date, root);
    printAndExit(await auditRecordedOutcome(record, { root, activeAttemptAt: args["active-at"] || null }));
    return;
  }
  if (command === "intervene" || command === "correction") {
    const type = command === "intervene" ? "intervention" : "post_publish_correction";
    console.log(JSON.stringify(recordHumanEvent({ runId: args["run-id"], type, reason: args.reason, actor: args.actor || "Hiro", slug: args.slug || null, root }), null, 2));
    return;
  }
  if (command === "automation-check") {
    printAndExit(verifyAutomationExecution({ id: args.id, scheduledAt: args["scheduled-at"], deadline: args.deadline, root }));
    return;
  }
  console.error("usage: evaluate|phase-b-check|stop|fail|audit|intervene|correction|automation-check");
  process.exitCode = 2;
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) main().catch((error) => { console.error(error.stack || error.message); process.exitCode = EXIT_CODES.failed; });
