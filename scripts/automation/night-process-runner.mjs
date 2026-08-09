#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_RETRY_DELAY_MS = 30 * 60 * 1000;
const TRANSIENT_PATTERNS = [
  ["overloaded", /\boverload(?:ed|ing)?\b|529\b/i],
  ["rate_limit", /rate[\s_-]*limit|too many requests|\b429\b/i],
  ["timeout", /\btimeout\b|timed out|etimedout|socket hang up/i],
  ["temporary_unavailable", /temporar(?:ily|y) unavailable|service unavailable|\b503\b|try again later/i],
];

export function parseCliArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error("unexpected argument: " + key);
    const value = argv[i + 1];
    if (value == null || value.startsWith("--")) throw new Error("missing value: " + key);
    values[key.slice(2)] = value;
    i += 1;
  }
  for (const required of ["prompt-file", "args-file", "output-file", "state-file"]) {
    if (!values[required]) throw new Error("missing --" + required);
  }
  return values;
}

export function classifyTransientFailure(output) {
  const text = String(output || "").slice(-128000);
  for (const [kind, pattern] of TRANSIENT_PATTERNS) {
    if (pattern.test(text)) return { transient: true, kind };
  }
  return { transient: false, kind: null };
}

function readState(stateFile) {
  try { return JSON.parse(fs.readFileSync(stateFile, "utf8").replace(/^\uFEFF/, "")); } catch { return {}; }
}

function writeState(stateFile, patch) {
  const next = { ...readState(stateFile), ...patch };
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readOutputTail(outputFile) {
  try { return fs.readFileSync(outputFile, "utf8").slice(-128000); }
  catch { return ""; }
}

async function runChild({ agentExe, agentArgs, prompt, outputFd, stateFile, attempt }) {
  const startedAt = new Date().toISOString();
  const child = spawn(agentExe, agentArgs, {
    cwd: process.cwd(), detached: true, windowsHide: true,
    stdio: ["pipe", outputFd, outputFd],
  });
  writeState(stateFile, {
    childPid: child.pid, childStartedAt: startedAt, heartbeatAt: startedAt,
    status: "running", attempt,
  });
  child.stdin.end(prompt, "utf8");
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code: code ?? 1, signal: signal || null }));
  });
}

export async function runIsolated(options) {
  const promptFile = path.resolve(options["prompt-file"]);
  const argsFile = path.resolve(options["args-file"]);
  const outputFile = path.resolve(options["output-file"]);
  const stateFile = path.resolve(options["state-file"]);
  const agentExe = options["agent-exe"] || options["claude-exe"] || "codex.cmd";
  const heartbeatMs = Number(options["heartbeat-ms"] || 15000);
  const retryDelayMs = Math.max(0, Number(options["retry-delay-ms"] ?? DEFAULT_RETRY_DELAY_MS));
  const prompt = fs.readFileSync(promptFile, "utf8").replace(/^\uFEFF/, "");
  const agentArgs = JSON.parse(fs.readFileSync(argsFile, "utf8").replace(/^\uFEFF/, ""));
  if (!Array.isArray(agentArgs) || agentArgs.some((arg) => typeof arg !== "string")) {
    throw new Error("args-file must contain a JSON string array");
  }

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  const outputFd = fs.openSync(outputFile, "a");
  let heartbeat;
  let heartbeatStatus = "running";
  try {
    writeState(stateFile, {
      supervisorPid: process.pid, heartbeatAt: new Date().toISOString(),
      status: "running", retriesUsed: 0, maxRetries: 1,
    });
    heartbeat = setInterval(() => {
      writeState(stateFile, { heartbeatAt: new Date().toISOString(), status: heartbeatStatus });
    }, heartbeatMs);
    heartbeat.unref();

    let result = await runChild({ agentExe, agentArgs, prompt, outputFd, stateFile, attempt: 1 });
    let retriesUsed = 0;
    const classification = result.code === 0
      ? { transient: false, kind: null }
      : classifyTransientFailure(readOutputTail(outputFile));

    if (result.code !== 0 && classification.transient) {
      retriesUsed = 1;
      heartbeatStatus = "retry_wait";
      writeState(stateFile, {
        heartbeatAt: new Date().toISOString(), status: "retry_wait", retriesUsed,
        retryReason: classification.kind,
        nextRetryAt: new Date(Date.now() + retryDelayMs).toISOString(),
        firstExitCode: result.code,
      });
      await delay(retryDelayMs);
      heartbeatStatus = "running";
      fs.writeSync(outputFd, "\n[night-runner] transient retry 1/1 reason=" + classification.kind + "\n", null, "utf8");
      result = await runChild({ agentExe, agentArgs, prompt, outputFd, stateFile, attempt: 2 });
    }

    heartbeatStatus = result.code === 0 ? "completed" : "failed";
    writeState(stateFile, {
      heartbeatAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      status: heartbeatStatus, exitCode: result.code, signal: result.signal,
      retriesUsed,
      finalFailureClass: result.code === 0 ? null : classifyTransientFailure(readOutputTail(outputFile)).kind,
    });
    return result.code;
  } catch (error) {
    heartbeatStatus = "launcher_failed";
    writeState(stateFile, {
      heartbeatAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
      status: "launcher_failed",
      launcherError: error instanceof Error ? error.message : String(error),
    });
    throw error;
  } finally {
    if (heartbeat) clearInterval(heartbeat);
    fs.closeSync(outputFd);
  }
}

async function main() {
  try { process.exitCode = await runIsolated(parseCliArgs(process.argv.slice(2))); }
  catch (error) { console.error(error instanceof Error ? error.stack || error.message : String(error)); process.exitCode = 1; }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) await main();
