#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { assertAscii, prepareRunner } from "./prepare-night-runner.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const TASK_NAME = "Sumalabo VIVANT Reannounce";
export const ENTRY = "D:\\work\\sumalabo-vivant-reannounce-entry.cmd";

export function taskCommand() { return `cmd.exe /d /c ${ENTRY}`; }

export function validateTaskXml(xml) {
  const text = String(xml || "");
  const problems = [];
  if (!/<Command>(?:[^<]*\\)?cmd\.exe<\/Command>/i.test(text)) problems.push("ascii_cmd_command_missing");
  if (!text.includes(ENTRY)) problems.push("vivant_entry_path_missing");
  if (!/<DaysOfWeek>[\s\S]*<Sunday\s*\/>[\s\S]*<\/DaysOfWeek>/i.test(text)) problems.push("sunday_schedule_missing");
  return { ok: problems.length === 0, problems };
}

function run(command, args) { return spawnSync(command, args, { encoding: "utf8", windowsHide: true }); }

function main() {
  if (process.argv.includes("--remove")) {
    const result = run("schtasks", ["/delete", "/tn", TASK_NAME, "/f"]);
    console.log(result.stdout || result.stderr);
    process.exitCode = result.status ?? 1;
    return;
  }
  prepareRunner();
  const entry = path.join(ROOT, "scripts", "automation", "vivant-reannounce-entry.cmd");
  assertAscii(entry);
  const create = run("schtasks", ["/create", "/tn", TASK_NAME, "/tr", taskCommand(), "/sc", "weekly", "/d", "SUN", "/st", "20:45", "/f"]);
  console.log(create.stdout || create.stderr);
  if (create.status !== 0) { process.exitCode = create.status ?? 1; return; }
  const xml = run("schtasks", ["/query", "/tn", TASK_NAME, "/xml"]);
  const validation = xml.status === 0 ? validateTaskXml(xml.stdout) : { ok: false, problems: ["task_query_failed"] };
  console.log(JSON.stringify({ taskName: TASK_NAME, schedule: "weekly Sunday 20:45", ...validation }, null, 2));
  process.exitCode = validation.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
