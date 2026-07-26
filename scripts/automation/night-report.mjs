#!/usr/bin/env node
// scripts/automation/night-report.mjs — testMode 1 本ごとの完全監査レポート。
//
// 目的: 事後にユーザーが 10 分で全査できる形式で、1 本の自動運転の全記録
// （選定理由・スコア・落とした候補・各工程の結果・所要時間・リトライ）を
// logs/night/{slug}.report.md に保存し、Web Push で通知する。
//
// 入力（存在するものだけ使う。無いものは「なし」と明記）:
//   logs/scout/{date}.json                  選定候補と採点
//   logs/article/{slug}.state.json          orchestrator の全工程・attempts・時刻
//   logs/article/{slug}.factcheck.json      画像ファクトチェック結果
//   logs/preview/{slug}.finalize.json       Phase A 出口
//   logs/publish/{slug}.verify.json         post-publish verify
//   data/automation/ledger.json             公開・X投稿記録
//   data/automation/autonomy.json           testMode 残数
//
// CLI: node scripts/automation/night-report.mjs --slug <slug> [--no-notify]

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { loadAutonomy } from "./autonomy.mjs";
import { readLedger } from "./ledger.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";
import { readPhaseTimings } from "./test-mode.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function latestScoutLog() {
  const dir = path.join(ROOT, "logs", "scout");
  if (!existsSync(dir)) return null;
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  return files.length ? readJson(path.join(dir, files[files.length - 1])) : null;
}

function fmtDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "-";
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

export function buildReport(slug) {
  const scout = latestScoutLog();
  const state = readJson(path.join(ROOT, "logs", "article", `${slug}.state.json`));
  const factcheck = readJson(path.join(ROOT, "logs", "article", `${slug}.factcheck.json`));
  const handCropInspection = readJson(path.join(ROOT, "logs", "article", `${slug}.hand-crop-inspection.json`));
  const finalize = readJson(path.join(ROOT, "logs", "preview", `${slug}.finalize.json`));
  const verify = readJson(path.join(ROOT, "logs", "publish", `${slug}.verify.json`));
  const ledger = readLedger();
  const entry = (ledger.entries || []).find((e) => e.slug === slug) || {};
  const autonomy = loadAutonomy();
  const tm = autonomy.testMode || {};

  const lines = [];
  lines.push(`# 夜間自動運転 監査レポート: ${slug}`);
  lines.push("");
  lines.push(`- 生成日時: ${new Date().toISOString()}`);
  lines.push(`- autonomy: level ${autonomy.level} / paused ${autonomy.paused} / testMode 残数 ${tm.articlesRemaining ?? "-"}（enabled: ${tm.enabled === true}）`);
  lines.push("");

  // 1. 選定
  lines.push("## 1. ネタ選定（scout）");
  const picked = scout && (scout.candidates || []).length ? scout.candidates[0] : null;
  if (scout) {
    lines.push(`- 候補 ${scout.candidates?.length ?? 0} 件 / 除外 ${scout.excluded?.length ?? 0} 件（閾値 ${scout.minScore}）`);
    if (picked) {
      lines.push(`- 採用: **${picked.title}**（score ${picked.score} / ${picked.source} / ${picked.ageHours}h前）`);
      lines.push(`  - 採点内訳: 鮮度${picked.breakdown?.recency} + tier1 ${picked.breakdown?.tier1} + tier2 ${picked.breakdown?.tier2} + インパクト${picked.breakdown?.impact} + ソース${picked.breakdown?.sourceWeight}`);
      lines.push(`  - 一致キーワード: ${JSON.stringify(picked.matched || {})}`);
    }
    lines.push("- 落とした上位候補:");
    for (const c of (scout.candidates || []).slice(1, 6)) {
      lines.push(`  - [${c.score}] ${c.title}（${c.source}）`);
    }
    lines.push("- 除外サンプル:");
    for (const e of (scout.excluded || []).slice(0, 5)) {
      lines.push(`  - ${e.reason}${e.category ? `/${e.category}(${e.word})` : ""}${e.against ? `/類似: ${e.against.slice(0, 30)}` : ""}: ${e.title.slice(0, 50)}`);
    }
  } else {
    lines.push("- scout ログなし（手動テーマ指定の可能性）");
  }
  lines.push("");

  // 2. Phase A 工程
  lines.push("## 2. Phase A（記事化）工程");
  if (state) {
    const steps = Object.entries(state.steps || {});
    const t0 = Date.parse(state.createdAt);
    let prev = t0;
    for (const [name, s] of steps) {
      const done = s.doneAt ? Date.parse(s.doneAt) : null;
      const dur = done && prev ? fmtDuration(done - prev) : "-";
      if (done) prev = done;
      const retry = s.attempts > 0 ? ` / リトライ${s.attempts}回` : "";
      const err = s.lastError ? ` / lastError: ${s.lastError}` : "";
      lines.push(`- ${s.status === "done" ? "✅" : "⚠️"} ${name}: ${s.status}（${dur}${retry}${err}）`);
    }
    lines.push(`- 総所要: ${fmtDuration((prev || t0) - t0)}${state.halted ? ` / **HALTED: ${state.haltReason}**` : ""}`);
  } else {
    lines.push("- orchestrator state なし");
  }
  lines.push("");

  // 3. 画像ファクトチェック
  lines.push("## 3. 画像ファクトチェック");
  if (factcheck) {
    lines.push(`- pass: ${factcheck.pass} / 再生成: ${(factcheck.regenerated || []).length} 枚`);
    for (const r of factcheck.regenerated || []) lines.push(`  - ${r.which}: ${r.reason}`);
    if (factcheck.notes) lines.push(`- 所見: ${factcheck.notes}`);
  } else {
    lines.push("- factcheck ログなし");
  }
  const hc = handCropInspection?.verdictCounts || { ok: 0, warning: 0, needs_revision: 0 };
  const warningCrops = (handCropInspection?.images || []).filter((image) => image.verdict === "warning").map((image) => image.cropFile).filter(Boolean);
  lines.push(`- 二段検品: 実施画像 ${handCropInspection?.sourceImagesInspected ?? 0}枚（手クロップ ${handCropInspection?.cropsInspected ?? 0}件） / ok ${hc.ok ?? 0}・warning ${hc.warning ?? 0}・needs_revision ${hc.needs_revision ?? 0}${warningCrops.length ? ` / warning画像: ${warningCrops.join(", ")}` : ""}`);
  lines.push("");

  // 4. 公開（Phase B）
  lines.push("## 4. 公開（Phase B）");
  if (verify) {
    lines.push(`- post-publish verify: hardFail=${verify.hardFail} / soft残 ${(verify.softFailRemaining || []).length} 件`);
    lines.push(`- rollback発動: ${verify.rollback?.invoked === true ? "**あり**" : "なし"} / incident: ${verify.incidentRecorded === true ? "**あり**" : "なし"}`);
  } else {
    lines.push("- verify ログなし（未公開）");
  }
  if (entry.productionUrl) lines.push(`- 本番URL: ${entry.productionUrl}（publishedAt: ${entry.publishedAt || "-"}）`);
  lines.push("");

  // 5. X 投稿（Phase C）
  lines.push("## 5. X 投稿（Phase C）");
  if (entry.xPostUrl) {
    lines.push(`- 投稿URL: ${entry.xPostUrl}（xPostedAt: ${entry.xPostedAt || "-"}）`);
  } else {
    lines.push("- 未投稿");
  }
  lines.push("");

  // 5-bis. Phase 別所要時間（遅い工程の見える化・2026-07-12）
  lines.push("## 5-bis. Phase 別所要時間");
  const timings = readPhaseTimings({ slug, root: ROOT });
  if (timings.length) {
    const byPhase = {};
    for (const t of timings) byPhase[t.phase] = (byPhase[t.phase] || 0) + (t.ms || 0);
    const ordered = Object.entries(byPhase).sort((a, b) => b[1] - a[1]);
    const total = ordered.reduce((a, [, ms]) => a + ms, 0);
    for (const [phase, ms] of ordered) {
      const pct = total > 0 ? Math.round((ms / total) * 100) : 0;
      lines.push(`- ${phase}: ${fmtDuration(ms)}（${pct}%）`);
    }
    lines.push(`- 合計: ${fmtDuration(total)}`);
    const slowest = ordered[0];
    if (slowest) lines.push(`- 最も遅い工程: **${slowest[0]}**（${fmtDuration(slowest[1])}）`);
  } else {
    lines.push("- 計測なし（driver が `test-mode.mjs --phase-timing` を記録していない run）");
  }
  lines.push("");

  // 6. 判定
  const clean =
    state && !state.halted && factcheck?.pass === true && handCropInspection && (handCropInspection.verdictCounts?.needs_revision ?? 0) === 0 && verify && verify.hardFail === false && verify.rollback?.invoked !== true && verify.incidentRecorded !== true;
  lines.push("## 6. 判定");
  lines.push(`- クリーン判定: ${clean ? "✅ クリーン" : "⚠️ 要確認"}`);
  lines.push("- 10分査読チェックリスト:");
  lines.push("  - [ ] 採用テーマは妥当か（1章の採点と落とした候補を見る）");
  lines.push("  - [ ] 本番URLを開いて記事の核となる主張を確認");
  lines.push("  - [ ] サムネ・スライドに実在ロゴ/誤数値がないか（3章の再生成理由を見る）");
  lines.push("  - [ ] X投稿文とカード表示を確認");
  lines.push(`  - [ ] 問題があれば: npm run retract -- --slug ${slug}`);

  return { markdown: lines.join("\n"), clean, entry, picked };
}

async function main() {
  const argv = process.argv.slice(2);
  let slug = null;
  const noNotify = argv.includes("--no-notify");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--slug") slug = argv[++i];
    else if (argv[i].startsWith("--slug=")) slug = argv[i].slice(7);
  }
  if (!slug) {
    console.error("usage: node scripts/automation/night-report.mjs --slug <slug> [--no-notify]");
    process.exitCode = 2;
    return;
  }
  const { markdown, clean } = buildReport(slug);
  const dir = path.join(ROOT, "logs", "night");
  mkdirSync(dir, { recursive: true });
  const p = path.join(dir, `${slug}.report.md`);
  writeFileSync(p, markdown + "\n", "utf-8");
  console.log(`report: ${path.relative(ROOT, p)}`);
  console.log(markdown);
  if (!noNotify) {
    const n = await notifyAutonomyEvent({
      slug,
      status: "night_report",
      title: `[testMode] 自動運転レポート: ${slug}（${clean ? "クリーン" : "要確認"}）`,
      previewUrl: `https://sumalabo.com/articles/${slug}/`,
    }).catch((e) => ({ ok: false, reason: e && e.message }));
    console.log(`notify: ${n.ok ? "sent" : `skipped (${n.reason})`}`);
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[night-report fatal]", e && e.message ? e.message : e);
    process.exitCode = 1;
  });
}
