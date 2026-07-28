#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

export function parseCliArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) throw new Error(`unexpected argument: ${key}`);
    const value = argv[i + 1];
    if (value == null || value.startsWith("--")) throw new Error(`missing value: ${key}`);
    values[key.slice(2)] = value;
    i += 1;
  }
  for (const required of ["prompt-file", "args-file", "output-file", "state-file"]) {
    if (!values[required]) throw new Error(`missing --${required}`);
  }
  return values;
}

function readState(stateFile) {
  try { return JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { return {}; }
}

function writeState(stateFile, patch) {
  const next = { ...readState(stateFile), ...patch };
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  fs.writeFileSync(stateFile, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export async function runIsolated(options) {
  const promptFile = path.resolve(options["prompt-file"]);
  const argsFile = path.resolve(options["args-file"]);
  const outputFile = path.resolve(options["output-file"]);
  const stateFile = path.resolve(options["state-file"]);
  const claudeExe = options["claude-exe"] || "claude";
  const heartbeatMs = Number(options["heartbeat-ms"] || 15_000);
  const prompt = fs.readFileSync(promptFile, "utf8").replace(/^\uFEFF/, "");
  const claudeArgs = JSON.parse(fs.readFileSync(argsFile, "utf8").replace(/^\uFEFF/, ""));
  if (!Array.isArray(claudeArgs) || claudeArgs.some((arg) => typeof arg !== "string")) throw new Error("args-file must contain a JSON string array");

  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  const outputFd = fs.openSync(outputFile, "a");
  const startedAt = new Date().toISOString();
  let heartbeat;
  try {
    const child = spawn(claudeExe, claudeArgs, { cwd: process.cwd(), detached: true, windowsHide: true, stdio: ["pipe", outputFd, outputFd] });
    writeState(stateFile, { supervisorPid: process.pid, childPid: child.pid, childStartedAt: startedAt, heartbeatAt: startedAt, status: "running" });
    heartbeat = setInterval(() => writeState(stateFile, { heartbeatAt: new Date().toISOString(), status: "running" }), heartbeatMs);
    heartbeat.unref();
    child.stdin.end(prompt, "utf8");
    const result = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => resolve({ code: code ?? 1, signal: signal || null }));
    });
    writeState(stateFile, { heartbeatAt: new Date().toISOString(), finishedAt: new Date().toISOString(), status: result.code === 0 ? "completed" : "failed", exitCode: result.code, signal: result.signal });
    return result.code;
  } catch (error) {
    writeState(stateFile, { heartbeatAt: new Date().toISOString(), finishedAt: new Date().toISOString(), status: "launcher_failed", launcherError: error instanceof Error ? error.message : String(error) });
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
