#!/usr/bin/env node
// scripts/automation/register-night-task.mjs — 夜間自動運転のタスクスケジューラ登録。

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const TASK_NAME = "Sumalabo Night Driver";
export const WATCHDOG_TASK_NAME = "Sumalabo Night Watchdog";
export const FORBIDDEN_PRODUCTION_FLAGS = /-(?:RunnerSelfTest|BrowserCheckOnly|DryRun|TestMode)\b/i;

export function buildNightTaskCommand(root = ROOT) {
  const ps1 = path.join(root, "scripts", "automation", "night-run.ps1");
  return `powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"${ps1}\"`;
}

export function validateNightTaskXml(xml, root = ROOT) {
  const text = String(xml || "");
  const expectedScript = path.join(root, "scripts", "automation", "night-run.ps1");
  const problems = [];
  if (!/<Command>powershell\.exe<\/Command>/i.test(text)) problems.push("powershell_command_missing");
  if (!text.includes(expectedScript)) problems.push("night_run_script_path_missing");
  if (FORBIDDEN_PRODUCTION_FLAGS.test(text)) problems.push("test_flag_present");
  return { ok: problems.length === 0, problems, expectedScript };
}

function queryAndValidateRegistration() {
  const query = spawnSync("schtasks", ["/query", "/tn", TASK_NAME, "/xml"], { encoding: "utf-8" });
  if (query.status !== 0) return { ok: false, problems: ["task_query_failed"], detail: query.stderr || query.stdout };
  return { ...validateNightTaskXml(query.stdout), xml: query.stdout };
}

function main() {
  const argv = process.argv.slice(2);
  const timeIdx = argv.indexOf("--time");
  const time = timeIdx >= 0 ? argv[timeIdx + 1] : "04:30";
  const remove = argv.includes("--remove");
  const validateOnly = argv.includes("--validate-registration");

  if (validateOnly) {
    const result = queryAndValidateRegistration();
    console.log(JSON.stringify({ ok: result.ok, taskName: TASK_NAME, problems: result.problems, expectedScript: result.expectedScript }, null, 2));
    process.exitCode = result.ok ? 0 : 1;
    return;
  }
  if (remove) {
    let status = 0;
    for (const taskName of [TASK_NAME, WATCHDOG_TASK_NAME]) {
      const r = spawnSync("schtasks", ["/delete", "/tn", taskName, "/f"], { encoding: "utf-8" });
      console.log(r.stdout || r.stderr);
      if (r.status !== 0) status = r.status ?? 1;
    }
    process.exitCode = status;
    return;
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    console.error("--time は HH:MM 形式（例: 04:30）");
    process.exitCode = 2;
    return;
  }

  const taskCommand = buildNightTaskCommand();
  const r = spawnSync("schtasks", ["/create", "/tn", TASK_NAME, "/tr", taskCommand, "/sc", "daily", "/st", time, "/f"], { encoding: "utf-8" });
  console.log(r.stdout || r.stderr);
  if (r.status === 0) {
    const watchdog = path.join(ROOT, "scripts", "automation", "night-watchdog.ps1");
    const watchdogTr = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"${watchdog}\"`;
    const w = spawnSync("schtasks", ["/create", "/tn", WATCHDOG_TASK_NAME, "/tr", watchdogTr, "/sc", "daily", "/st", "05:30", "/f"], { encoding: "utf-8" });
    console.log(w.stdout || w.stderr);
    if (w.status !== 0) { process.exitCode = w.status ?? 1; return; }
    const harden = spawnSync("powershell.exe", ["-NoProfile", "-Command", [
      `$names=@('${TASK_NAME}','${WATCHDOG_TASK_NAME}')`,
      "foreach($name in $names){$settings=New-ScheduledTaskSettingsSet -WakeToRun -StartWhenAvailable -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 12); Set-ScheduledTask -TaskName $name -Settings $settings | Out-Null}",
    ].join("; ")], { encoding: "utf-8" });
    if (harden.status !== 0) console.warn(`警告: 復帰・取りこぼし設定の反映に失敗: ${harden.stderr || harden.stdout}`);
    const registration = queryAndValidateRegistration();
    if (!registration.ok) {
      console.error(`本番タスク登録検査に失敗: ${registration.problems.join(", ")}`);
      process.exitCode = 1;
      return;
    }
    console.log(`登録完了: "${TASK_NAME}" 毎日 ${time} / "${WATCHDOG_TASK_NAME}" 毎日 05:30`);
    const q = spawnSync("schtasks", ["/query", "/tn", TASK_NAME, "/v", "/fo", "list"], { encoding: "utf-8" });
    console.log(q.stdout);
  }
  process.exitCode = r.status ?? 1;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) main();
