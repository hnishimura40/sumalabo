#!/usr/bin/env node
// scripts/automation/register-night-task.mjs — 夜間自動運転のタスクスケジューラ登録。
//
// npm run schedule:auto-run [-- --time 04:30] [--remove]
//
// 登録内容:
//   タスク名: "Sumalabo Night Driver"
//   起動: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/automation/night-run.ps1
//   スケジュール: 毎日 04:30 JST（--time で変更可）
//   /IT なし（バックグラウンド）。wake timers はタスク側では設定できないため
//   docs/night_run_setup.md の手順で電源設定を確認すること。
//
// 注意: schtasks はカレントユーザー権限で登録する（管理者不要）。

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TASK_NAME = "Sumalabo Night Driver";

function main() {
  const argv = process.argv.slice(2);
  const timeIdx = argv.indexOf("--time");
  const time = timeIdx >= 0 ? argv[timeIdx + 1] : "04:30";
  const remove = argv.includes("--remove");

  if (remove) {
    const r = spawnSync("schtasks", ["/delete", "/tn", TASK_NAME, "/f"], { encoding: "utf-8" });
    console.log(r.stdout || r.stderr);
    process.exitCode = r.status ?? 1;
    return;
  }

  if (!/^\d{2}:\d{2}$/.test(time)) {
    console.error("--time は HH:MM 形式（例: 04:30）");
    process.exitCode = 2;
    return;
  }

  const ps1 = path.join(ROOT, "scripts", "automation", "night-run.ps1");
  const tr = `powershell.exe -NoProfile -ExecutionPolicy Bypass -File \"${ps1}\"`;
  const r = spawnSync("schtasks", ["/create", "/tn", TASK_NAME, "/tr", tr, "/sc", "daily", "/st", time, "/f"], {
    encoding: "utf-8",
  });
  console.log(r.stdout || r.stderr);
  if (r.status === 0) {
    console.log(`登録完了: "${TASK_NAME}" 毎日 ${time}（ログ: logs/night/{date}.log）`);
    const q = spawnSync("schtasks", ["/query", "/tn", TASK_NAME, "/fo", "list"], { encoding: "utf-8" });
    console.log(q.stdout);
  }
  process.exitCode = r.status ?? 1;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) main();
