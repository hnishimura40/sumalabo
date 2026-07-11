#!/usr/bin/env node
// scripts/automation/retract.mjs — 記事撤回の 1 コマンド化（testMode 是正手順）。
//
// npm run retract -- --slug <slug>
//
// 実行内容（各ステップは best-effort。失敗しても次へ進み、最後に全結果を報告）:
//   1. rollback:production（CF Pages deployment rollback → last-good fallback）
//   2. キャッシュパージ（purgeForSlug。--expect-gone 相当の実フェッチ確認込み）
//   3. X 投稿削除:
//      - xPostMethod=api かつ API キーがあれば npm run x:delete に委譲
//      - それ以外（browser 運用）は投稿 URL を提示して手動削除を指示
//        （ブラウザ削除はローカル Claude セッションの操作が必要なため）
//   4. incident 記録（kind: retracted）
//   5. testMode 停止（enabled: false, reason: retract）
//   6. 通知（Web Push）
//
// 終了コード: 0=全ステップ成功 / 1=一部失敗あり（詳細は出力 JSON）

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { recordIncident, loadAutonomy } from "./autonomy.mjs";
import { stopTestMode, stopNightRun } from "./test-mode.mjs";
import { purgeForSlug, checkArticleGone } from "./cache-purge.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";
import { readLedger } from "./ledger.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: "utf-8", shell: process.platform === "win32" });
  return { status: r.status, stdout: (r.stdout || "").slice(-2000), stderr: (r.stderr || "").slice(-2000) };
}

async function main() {
  const argv = process.argv.slice(2);
  let slug = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--slug") slug = argv[++i];
    else if (argv[i].startsWith("--slug=")) slug = argv[i].slice(7);
  }
  if (!slug) {
    console.error("usage: npm run retract -- --slug <slug>");
    process.exitCode = 2;
    return;
  }

  const report = { slug, startedAt: new Date().toISOString(), steps: {} };

  // 1. rollback
  console.log(`[retract 1/6] rollback:production --slug=${slug}`);
  const rb = run("npm", ["run", "rollback:production", "--", `--slug=${slug}`, "--expect-gone"]);
  report.steps.rollback = { ok: rb.status === 0, exitCode: rb.status };
  console.log(rb.stdout || rb.stderr);

  // 2. purge + 実フェッチ確認
  console.log("[retract 2/6] cache purge");
  const purge = await purgeForSlug({ slug });
  report.steps.purge = purge;
  const gone = await checkArticleGone({ slug });
  report.steps.articleGone = gone;

  // 3. X 投稿削除
  console.log("[retract 3/6] X post deletion");
  const ledger = readLedger();
  const entry = (ledger.entries || []).find((e) => e.slug === slug);
  const xPostUrl = entry && entry.xPostUrl;
  const method = loadAutonomy().xPostMethod || "browser";
  if (!xPostUrl) {
    report.steps.xDelete = { ok: true, skipped: "no_x_post_recorded" };
  } else if (method === "api" && (process.env.X_API_KEY || "").trim()) {
    const idMatch = xPostUrl.match(/status\/(\d+)/);
    const xd = run("npm", ["run", "x:delete", "--", `--id=${idMatch ? idMatch[1] : ""}`, `--slug=${slug}`]);
    report.steps.xDelete = { ok: xd.status === 0, exitCode: xd.status };
  } else {
    report.steps.xDelete = {
      ok: false,
      manualActionRequired: true,
      note: "browser運用のためX投稿の削除は手動（またはローカルClaudeセッション）で行う",
      xPostUrl,
    };
  }

  // 4. incident 記録
  console.log("[retract 4/6] incident 記録");
  report.steps.incident = recordIncident({ slug, kind: "retracted", detail: "npm run retract による撤回" });

  // 5. testMode / 恒久無人運転 停止
  console.log("[retract 5/6] testMode / nightRun 停止");
  const tm = stopTestMode({ reason: `retract(${slug})` });
  const nr = stopNightRun({ reason: `retract(${slug})` });
  report.steps.testModeStopped = { enabled: tm.enabled, reason: tm.disabledReason, nightRunStopped: nr ? true : false };

  // 6. 通知
  console.log("[retract 6/6] 通知");
  const n = await notifyAutonomyEvent({
    slug,
    status: "retracted",
    title: `[autonomy] 記事を撤回しました: ${slug}（rollback=${report.steps.rollback.ok} / purge=${purge.ok} / X削除=${report.steps.xDelete.ok ? "済" : "要手動"}）`,
  }).catch((e) => ({ ok: false, reason: e && e.message }));
  report.steps.notify = n;

  report.finishedAt = new Date().toISOString();
  const allOk = report.steps.rollback.ok && purge.ok && report.steps.xDelete.ok !== false;
  console.log("---RETRACT REPORT---");
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = allOk ? 0 : 1;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[retract fatal]", e && e.message ? e.message : e);
    process.exitCode = 1;
  });
}
