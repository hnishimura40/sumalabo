#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { recordAutomationExecution } from "./night-run-contract.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJson(file, fallback = null) {
  try { return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/u, "")); }
  catch { return fallback; }
}

function readJsonl(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
}

export function loadMeasurement(root = ROOT) {
  return readJson(path.join(root, "data", "automation", "measurement.json"), { active: false });
}

export function isMeasurementActive(config, now = new Date()) {
  return config?.active === true && Date.parse(config.startAt) <= now.getTime() && now.getTime() < Date.parse(config.endAt);
}

// 旧呼び出し互換。新しい計測正本はrun日時を主キーにしたrun-contractであり、
// slugだけの記録は成功判定に使わずlegacyへ隔離する。
export function recordMeasurementRun(record, root = ROOT) {
  const file = path.join(root, "logs", "night", "run-contract", "legacy-measurement.jsonl");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify({ ...record, legacy: true })}\n`, { encoding: "utf8", flag: "a" });
  return { recorded: true, legacy: true, file };
}

export function readRunOutcomes(root = ROOT) {
  const dir = path.join(root, "logs", "night", "run-contract");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJson(path.join(dir, name)))
    .filter((record) => record?.runId && record?.outcome);
}

export function summarizeMeasurement(root = ROOT) {
  const config = loadMeasurement(root);
  const start = Date.parse(config.startAt);
  const end = Date.parse(config.endAt);
  const rows = readRunOutcomes(root)
    .filter((row) => {
      const at = Date.parse(row.startedAt || row.finishedAt);
      return Number.isFinite(at) && (!Number.isFinite(start) || at >= start) && (!Number.isFinite(end) || at < end);
    })
    .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  const events = readJsonl(path.join(root, "logs", "night", "run-contract", "human-events.jsonl"))
    .filter((event) => rows.some((row) => row.runId === event.runId));
  const success = rows.filter((row) => row.outcome === "success").length;
  const stoppedXPending = rows.filter((row) => row.outcome === "stopped_x_pending").length;
  const stopped = rows.filter((row) => row.outcome === "stopped").length;
  const failed = rows.filter((row) => row.outcome === "failed").length;
  const xSecondaryFailed = rows.filter((row) => row.outcome === "success" && row.secondaryContract?.status !== "success").length;
  const interventions = events.filter((event) => event.type === "intervention");
  const corrections = events.filter((event) => event.type === "post_publish_correction");
  const intervenedRunIds = new Set(interventions.map((event) => event.runId));
  const acceptanceSuccess = rows.filter((row) =>
    ["success", "stopped_x_pending"].includes(row.outcome) &&
    row.completionKind !== "recovery" &&
    row.acceptanceEligible !== false &&
    !intervenedRunIds.has(row.runId)
  ).length;
  return {
    config,
    primaryKey: "runId",
    totalRuns: rows.length,
    success,
    stoppedXPending,
    stopped,
    failed,
    xSecondaryFailed,
    unattendedCompletionRate: rows.length ? (success + stoppedXPending) / rows.length : null,
    acceptanceSuccess,
    acceptanceCompletionRate: rows.length ? acceptanceSuccess / rows.length : null,
    humanInterventions: interventions.length,
    postPublishBreakages: corrections.length,
    rows,
    humanEvents: events,
  };
}

function localScheduledAt(config, now = new Date()) {
  const automation = config.summaryAutomation || {};
  const [hour, minute] = String(automation.scheduledLocalTime || "08:00").split(":").map(Number);
  const scheduled = new Date(now);
  scheduled.setHours(hour, minute, 0, 0);
  return scheduled.toISOString();
}

async function main() {
  const startedAt = new Date().toISOString();
  let output = "";
  let exitCode = 0;
  let inputCount = 0;
  try {
    const summary = summarizeMeasurement(ROOT);
    inputCount = summary.rows.length;
    output = JSON.stringify(summary, null, 2);
    console.log(output);
  } catch (error) {
    exitCode = 1;
    output = error instanceof Error ? error.stack || error.message : String(error);
    console.error(output);
  } finally {
    const config = loadMeasurement(ROOT);
    recordAutomationExecution({
      id: config.summaryAutomation?.id || "7",
      scheduledAt: process.env.SUMALABO_AUTOMATION_SCHEDULED_AT || localScheduledAt(config),
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode,
      output,
      inputCount,
      root: ROOT,
    });
  }
  process.exitCode = exitCode;
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) await main();
