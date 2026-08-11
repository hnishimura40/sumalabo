#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { runIsolatedShell } from "./night-run-entry.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const result = await runIsolatedShell("powershell.exe", [
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
  path.join(ROOT, "scripts", "automation", "night-watchdog.ps1"),
  ...process.argv.slice(2),
], { cwd: ROOT, env: process.env });

process.exitCode = result.status;
