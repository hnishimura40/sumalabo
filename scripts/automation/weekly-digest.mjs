#!/usr/bin/env node
// scripts/automation/weekly-digest.mjs — 週次ダイジェスト (L1 運用の監査点)。
//
// ledger と logs から直近 7 日のサマリを生成して既存通知経路（Web Push）へ送る:
//   公開記事 / gate警告 / rollback・incident / X投稿結果 / 昇格カウント状況
//
// 使い方: npm run digest [-- --days 7 --dry-run]
// スケジュール: .github/workflows/weekly-digest.yml（週1 cron）

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { readLedger } from "./ledger.mjs";
import { loadAutonomy } from "./autonomy.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function buildDigest({ days = 7, now = Date.now() } = {}) {
  const since = now - days * 86400000;
  const inWindow = (iso) => iso && new Date(iso).getTime() >= since;

  const ledger = readLedger();
  const autonomy = loadAutonomy();

  const published = ledger.entries.filter((e) => inWindow(e.publishedAt));
  const xPosted = ledger.entries.filter((e) => inWindow(e.xPostedAt));
  const incidents = (autonomy.incidents || []).filter((i) => inWindow(i.at));
  const rollbacks = incidents.filter((i) => /rollback|hard_fail/.test(i.kind || ""));

  // gate 警告: logs/publish の verify.json から soft fail 残留を拾う
  const softIssues = [];
  const pubDir = path.join(ROOT, "logs", "publish");
  if (existsSync(pubDir)) {
    for (const f of readdirSync(pubDir).filter((f) => f.endsWith(".verify.json"))) {
      try {
        const v = JSON.parse(readFileSync(path.join(pubDir, f), "utf-8"));
        if (inWindow(v.finishedAt) && (v.softFailRemaining || []).length > 0) {
          softIssues.push({ slug: v.slug, remaining: v.softFailRemaining });
        }
      } catch {}
    }
  }

  const lines = [
    `📋 すまラボ週次ダイジェスト（直近${days}日）`,
    `公開: ${published.length}件${published.length ? " — " + published.map((e) => e.slug).join(", ") : ""}`,
    `X投稿: ${xPosted.length}件`,
    `incident: ${incidents.length}件（rollback系 ${rollbacks.length}件）${incidents.length ? " — " + incidents.map((i) => i.kind).join(", ") : ""}`,
    `事後検査soft残留: ${softIssues.length}件`,
    `autonomy: level ${autonomy.level} / paused ${autonomy.paused} / L1昇格カウント ${autonomy.promotionCount?.toL1 ?? 0}/3`,
  ];
  return { summary: lines.join("\n"), published, xPosted, incidents, softIssues, level: autonomy.level };
}

async function main() {
  const argv = process.argv.slice(2);
  const dIdx = argv.indexOf("--days");
  const days = dIdx >= 0 ? Number(argv[dIdx + 1]) : 7;
  const dryRun = argv.includes("--dry-run");

  const digest = buildDigest({ days });
  console.log(digest.summary);
  if (dryRun) return;

  const n = await notifyAutonomyEvent({
    slug: "weekly-digest",
    status: "digest",
    title: digest.summary.split("\n").slice(0, 3).join(" / "),
  });
  console.log(`notify: ${n.ok ? "sent" : `skipped (${n.reason})`}`);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[digest fatal]", e && e.message ? e.message : e);
    process.exitCode = 1;
  });
}
