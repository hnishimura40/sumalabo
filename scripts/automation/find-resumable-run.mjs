#!/usr/bin/env node
// scripts/automation/find-resumable-run.mjs
//
// 夜間 run が transient エラー（例: "tool call could not be parsed"）で異常終了したとき、
// **中途まで進んでいた記事**を検出して、その slug を stdout に1行で出す（無ければ空出力）。
// night-run.ps1 が claude -p の非ゼロ終了後に呼び、返った slug を1回だけ resume する。
//
// resumable の条件（すべて満たす）:
//   - logs/article/{slug}.state.json が存在
//   - halted !== true（品質・安全ブロックで意図的に止めたものは resume しない）
//   - steps.finalize.status !== 'done'（未完了。完了済みは Phase B/C 側の話で resume 対象外）
//   - 少なくとも chatgpt_turn1_research が done（init/freshness だけの空 run は resume しない）
//   - updatedAt が直近 windowMin 分以内（今夜の run の残骸だけを対象にする。前日以前の
//     放置 state を誤って蒸し返さない）
//
// CLI: node scripts/automation/find-resumable-run.mjs [--window-min 60] [--json]
//   --window-min: updatedAt の許容鮮度（分）。既定 60。
//   --json      : デバッグ用に候補一覧を JSON で出す（通常は使わない）
//
// 正常時: resumable な slug を1行 print（複数あれば最も新しく更新されたもの1件）。
// 無ければ何も print しない（exit 0）。

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const out = { windowMin: 60, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--window-min") out.windowMin = Number(argv[++i]) || 60;
    else if (argv[i] === "--json") out.json = true;
  }
  return out;
}

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

export function findResumable({ windowMin = 60, now = null } = {}) {
  const dir = path.join(ROOT, "logs", "article");
  if (!existsSync(dir)) return { slug: null, candidates: [] };
  const nowMs = now == null ? nowMsSafe() : now;
  const cutoff = nowMs - windowMin * 60 * 1000;
  const candidates = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".state.json")) continue;
    const state = readJson(path.join(dir, f));
    if (!state || !state.steps) continue;
    const slug = state.slug || f.replace(/\.state\.json$/, "");
    const steps = state.steps;
    const finalizeDone = steps.finalize && steps.finalize.status === "done";
    const researchDone = steps.chatgpt_turn1_research && steps.chatgpt_turn1_research.status === "done";
    const halted = state.halted === true;
    const updatedMs = Date.parse(state.updatedAt || state.createdAt || 0);
    const fresh = Number.isFinite(updatedMs) && updatedMs >= cutoff;
    if (halted || finalizeDone || !researchDone || !fresh) continue;
    candidates.push({ slug, updatedMs, updatedAt: state.updatedAt });
  }
  candidates.sort((a, b) => b.updatedMs - a.updatedMs);
  return { slug: candidates.length ? candidates[0].slug : null, candidates };
}

// Date.now() は night-run 常時稼働なので許容（この repo の他スクリプトでも直接 new Date を使用）。
function nowMsSafe() {
  return Date.now();
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const args = parseArgs(process.argv.slice(2));
  const res = findResumable({ windowMin: args.windowMin });
  if (args.json) {
    process.stdout.write(JSON.stringify(res, null, 2) + "\n");
  } else if (res.slug) {
    process.stdout.write(res.slug + "\n");
  }
  process.exitCode = 0;
}
