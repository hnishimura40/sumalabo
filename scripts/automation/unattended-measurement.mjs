#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CONFIG_PATH = path.join(ROOT, "data", "automation", "measurement.json");
const RUNS_PATH = path.join(ROOT, "logs", "night", "unattended-measurement.jsonl");

export function loadMeasurement(root = ROOT) {
  const file = path.join(root, "data", "automation", "measurement.json");
  if (!existsSync(file)) return { active: false };
  return JSON.parse(readFileSync(file, "utf8"));
}

export function isMeasurementActive(config, now = new Date()) {
  return config?.active === true && Date.parse(config.startAt) <= now.getTime() && now.getTime() < Date.parse(config.endAt);
}

export function recordMeasurementRun(record, root = ROOT) {
  const config = loadMeasurement(root);
  if (!isMeasurementActive(config, new Date(record.recordedAt || Date.now()))) return { recorded: false, reason: "inactive" };
  const file = path.join(root, "logs", "night", "unattended-measurement.jsonl");
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(record) + "\n", { encoding: "utf8", flag: "a" });
  return { recorded: true, file };
}

export function summarizeMeasurement(root = ROOT) {
  const config = loadMeasurement(root);
  const file = path.join(root, "logs", "night", "unattended-measurement.jsonl");
  const rows = existsSync(file)
    ? readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line))
    : [];
  const completed = rows.filter((row) => row.unattendedCompleted === true).length;
  const interventions = rows.filter((row) => row.humanIntervention === true).length;
  const breakages = rows.reduce((sum, row) => sum + Number(row.postPublishBreakages || 0), 0);
  return {
    config, totalRuns: rows.length, unattendedCompleted: completed,
    unattendedCompletionRate: rows.length ? completed / rows.length : null,
    humanInterventions: interventions, postPublishBreakages: breakages, rows,
  };
}

async function main() {
  const summary = summarizeMeasurement(ROOT);
  console.log(JSON.stringify(summary, null, 2));
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) await main();
