#!/usr/bin/env node
// scripts/automation/test-mode.mjs — 完全自動テストモード（本数限定）の状態管理。
//
// 目的: 人間の承認ゼロで「ネタ選定→記事制作→公開→X投稿」が成立するかを
// 本数限定の実弾テストで検証する（恒久昇格ではない）。状態は
// data/automation/autonomy.json の testMode キー:
//
//   "testMode": {
//     "enabled": true,
//     "articlesRemaining": 3,
//     "autoPick": true,
//     "autoPhaseB": true,
//     "autoPhaseC": true,
//     "maxPerNight": 1,
//     "expiresAt": "2026-07-12T00:00:00+09:00"
//   }
//
// 挙動:
//   - isTestModeActive(): enabled && 残数>0 && 期限内 && paused でない
//   - consumeTestModeArticle(): 1 本完了ごとに残数を 1 減算。0 で enabled: false
//   - stopTestMode(reason): 即時停止（incident 2 件 / retract / 手動）
//   - checkTestModeIncidentStop(): testMode 有効化以降の incident が 2 件以上なら停止
//   - canRunTonight(): 1 晩 1 本ガード（logs/night/last-run.json の日付で判定）
//
// 緩めない安全装置（本モジュールの管轄外だが前提）:
//   除外カテゴリ / gate full / 画像ファクトチェック / post-publish verify+自動rollback /
//   kill switch (paused)
//
// CLI:
//   node scripts/automation/test-mode.mjs --status
//   node scripts/automation/test-mode.mjs --consume --slug <slug>
//   node scripts/automation/test-mode.mjs --stop --reason "..."
//   node scripts/automation/test-mode.mjs --enable --articles 3   (ユーザー承認済みのときだけ)
// 終了コード: --status は active なら 0 / inactive なら 10
//
// 恒久無人運転モード（2026-07-11 承認・testMode 3本完走後の後継）:
//   autonomy.json に nightRun キーがあれば testMode ではなく恒久モードとして判定する。
//   本数制限の代わりの恒久ガード:
//     - incident 2 件（enabledAt 以降）で自動停止（enabled: false。再開はユーザー宣言で enabledAt 更新）
//     - kill switch（paused: true）で即停止
//     - 1 晩 1 本（canRunTonight）
//     - weeklyCap（直近 7 日の completed run 数。既定 7 = 毎日 1 本ペース許容）
//   gate / factcheck / post-publish verify / 自動rollback は従来どおり（本モジュール管轄外）。
//   --status / --consume / --stop の CLI 互換は維持（night-run.ps1 / night_driver_prompt から変更なしで呼べる）。

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import process from "node:process";
import { loadAutonomy, saveAutonomy, autonomyPath } from "./autonomy.mjs";

const LAST_RUN_PATH = path.join("logs", "night", "last-run.json");
const RUN_HISTORY_PATH = path.join("logs", "night", "run-history.jsonl");

export const NIGHT_RUN_DEFAULT = Object.freeze({
  enabled: false,
  mode: "permanent",
  scoutMode: "auto",
  scheduleTime: "04:30",
  maxPerNight: 1,
  weeklyCap: 7,
});

export const TEST_MODE_DEFAULT = Object.freeze({
  enabled: false,
  articlesRemaining: 3,
  autoPick: true,
  autoPhaseB: true,
  autoPhaseC: true,
  maxPerNight: 1,
  expiresAt: "2026-07-12T00:00:00+09:00",
});

export function loadTestMode(filePath = autonomyPath()) {
  const state = loadAutonomy(filePath);
  const tm = state.testMode && typeof state.testMode === "object" ? state.testMode : {};
  return {
    ...TEST_MODE_DEFAULT,
    ...tm,
    enabled: tm.enabled === true,
    articlesRemaining: Number.isInteger(tm.articlesRemaining) ? tm.articlesRemaining : 0,
    _paused: state.paused === true,
    _enabledAt: tm.enabledAt || null,
  };
}

/**
 * testMode が「今、自動運転してよい状態」かを判定する。
 * @returns {{active: boolean, reason: string|null, remaining: number, expiresAt: string}}
 */
export function isTestModeActive({ now = new Date(), filePath = autonomyPath() } = {}) {
  const tm = loadTestMode(filePath);
  const base = { remaining: tm.articlesRemaining, expiresAt: tm.expiresAt };
  if (tm._paused) return { ...base, active: false, reason: "autonomy_paused" };
  if (!tm.enabled) return { ...base, active: false, reason: "test_mode_disabled" };
  if (tm.articlesRemaining <= 0) return { ...base, active: false, reason: "no_articles_remaining" };
  const exp = Date.parse(tm.expiresAt);
  if (Number.isFinite(exp) && now.getTime() >= exp) return { ...base, active: false, reason: "expired" };
  return { ...base, active: true, reason: null };
}

function writeTestMode(mutator, filePath = autonomyPath()) {
  const state = loadAutonomy(filePath);
  const tm = { ...TEST_MODE_DEFAULT, ...(state.testMode || {}) };
  mutator(tm, state);
  state.testMode = tm;
  saveAutonomy(state, filePath);
  return tm;
}

/** 1 本完了: 残数を 1 減算。0 になったら enabled: false（自動失効）。 */
export function consumeTestModeArticle({ slug = null, filePath = autonomyPath() } = {}) {
  return writeTestMode((tm) => {
    tm.articlesRemaining = Math.max(0, (tm.articlesRemaining || 0) - 1);
    tm.consumed = [...(tm.consumed || []), { slug, at: new Date().toISOString() }];
    if (tm.articlesRemaining <= 0) {
      tm.enabled = false;
      tm.disabledReason = "articles_exhausted";
      tm.disabledAt = new Date().toISOString();
    }
  }, filePath);
}

/** 即時停止（incident 累積 / retract / 手動）。 */
export function stopTestMode({ reason = "manual", filePath = autonomyPath() } = {}) {
  return writeTestMode((tm) => {
    tm.enabled = false;
    tm.disabledReason = reason;
    tm.disabledAt = new Date().toISOString();
  }, filePath);
}

/**
 * testMode 有効化（enabledAt 記録）以降の incident が 2 件以上なら testMode を停止する。
 * @returns {{stopped: boolean, incidentCount: number}}
 */
export function checkTestModeIncidentStop({ filePath = autonomyPath() } = {}) {
  const state = loadAutonomy(filePath);
  const tm = state.testMode || {};
  if (tm.enabled !== true) return { stopped: false, incidentCount: 0, reason: "not_enabled" };
  const since = tm.enabledAt ? Date.parse(tm.enabledAt) : 0;
  const count = (state.incidents || []).filter((i) => {
    const at = Date.parse(i.at || "");
    return Number.isFinite(at) && at >= since;
  }).length;
  if (count >= 2) {
    stopTestMode({ reason: `incident_threshold(${count})`, filePath });
    return { stopped: true, incidentCount: count };
  }
  return { stopped: false, incidentCount: count };
}

// ---- 恒久無人運転モード（nightRun）----

export function loadNightRun(filePath = autonomyPath()) {
  const state = loadAutonomy(filePath);
  const nr = state.nightRun && typeof state.nightRun === "object" ? state.nightRun : null;
  if (!nr) return null; // nightRun キーなし = 恒久モード未設定（testMode 判定にフォールバック）
  return {
    ...NIGHT_RUN_DEFAULT,
    ...nr,
    enabled: nr.enabled === true,
    _paused: state.paused === true,
    _incidents: Array.isArray(state.incidents) ? state.incidents : [],
  };
}

/** 直近 N 日の completed run 数（logs/night/run-history.jsonl）。ファイル無し・壊れは 0 扱い。 */
export function countRunsInLastDays({ days = 7, now = new Date(), root = process.cwd() } = {}) {
  const p = path.join(root, RUN_HISTORY_PATH);
  if (!existsSync(p)) return 0;
  const since = now.getTime() - days * 86400_000;
  try {
    return readFileSync(p, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter((e) => e && e.result === "completed" && Number.isFinite(Date.parse(e.at)) && Date.parse(e.at) >= since)
      .length;
  } catch {
    return 0;
  }
}

/** 恒久モード即時停止（incident 累積 / retract / 手動）。 */
export function stopNightRun({ reason = "manual", filePath = autonomyPath() } = {}) {
  const state = loadAutonomy(filePath);
  if (!state.nightRun || typeof state.nightRun !== "object") return null;
  state.nightRun.enabled = false;
  state.nightRun.disabledReason = reason;
  state.nightRun.disabledAt = new Date().toISOString();
  saveAutonomy(state, filePath);
  return state.nightRun;
}

/**
 * 恒久無人運転が「今、走ってよい状態」かを判定する。
 * ガード: enabled / paused / incident 2 件（enabledAt 以降・自動停止付き）/ weeklyCap。
 * 1 晩 1 本は呼び出し側で canRunTonight() を併用（--status CLI は両方見る）。
 */
export function isNightRunActive({ now = new Date(), filePath = autonomyPath(), root = process.cwd() } = {}) {
  const nr = loadNightRun(filePath);
  if (!nr) return null;
  const base = { mode: nr.mode, weeklyCap: nr.weeklyCap };
  if (nr._paused) return { ...base, active: false, reason: "autonomy_paused" };
  if (!nr.enabled) return { ...base, active: false, reason: nr.disabledReason ? `night_run_disabled(${nr.disabledReason})` : "night_run_disabled" };
  const since = nr.enabledAt ? Date.parse(nr.enabledAt) : 0;
  const incidentCount = nr._incidents.filter((i) => {
    const at = Date.parse(i.at || "");
    return Number.isFinite(at) && at >= since;
  }).length;
  if (incidentCount >= 2) {
    stopNightRun({ reason: `incident_threshold(${incidentCount})`, filePath });
    return { ...base, active: false, reason: `incident_threshold(${incidentCount})`, incidentCount };
  }
  const runsThisWeek = countRunsInLastDays({ days: 7, now, root });
  if (runsThisWeek >= nr.weeklyCap) {
    return { ...base, active: false, reason: "weekly_cap_reached", runsThisWeek };
  }
  return { ...base, active: true, reason: null, incidentCount, runsThisWeek };
}

/** 1 晩 1 本ガード: 同じ「夜」(JST の日付) にすでに 1 本走っていたら false。 */
export function canRunTonight({ now = new Date(), root = process.cwd() } = {}) {
  const p = path.join(root, LAST_RUN_PATH);
  const jstDate = (d) => new Date(d.getTime() + 9 * 3600_000).toISOString().slice(0, 10);
  if (!existsSync(p)) return { ok: true };
  try {
    const last = JSON.parse(readFileSync(p, "utf-8"));
    if (jstDate(new Date(last.at)) === jstDate(now)) {
      return { ok: false, reason: "already_ran_tonight", last };
    }
  } catch {}
  return { ok: true };
}

export function recordNightRun({ slug, result, root = process.cwd() } = {}) {
  const entry = { at: new Date().toISOString(), slug: slug || null, result: result || null };
  const p = path.join(root, LAST_RUN_PATH);
  mkdirSync(path.dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(entry, null, 2) + "\n", "utf-8");
  // weeklyCap 判定用の履歴（追記のみ）。last-run.json は従来互換のまま。
  appendFileSync(path.join(root, RUN_HISTORY_PATH), JSON.stringify(entry) + "\n", "utf-8");
}

// ---- CLI ----
async function main() {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);
  const val = (f) => {
    const i = argv.indexOf(f);
    return i >= 0 ? argv[i + 1] : null;
  };
  if (has("--status")) {
    // 恒久モード（nightRun キーあり）が testMode より優先
    const nr = isNightRunActive();
    if (nr) {
      const tonight = canRunTonight();
      console.log(JSON.stringify({ ...nr, tonight }, null, 2));
      process.exitCode = nr.active && tonight.ok ? 0 : 10;
      return;
    }
    const st = isTestModeActive();
    const tonight = canRunTonight();
    console.log(JSON.stringify({ ...st, tonight }, null, 2));
    process.exitCode = st.active && tonight.ok ? 0 : 10;
    return;
  }
  if (has("--consume")) {
    // 恒久モードでは本数減算なし（監査用に consumed へ追記のみ）
    const nrState = loadNightRun();
    if (nrState) {
      const state = loadAutonomy(autonomyPath());
      state.nightRun.consumed = [...(state.nightRun.consumed || []), { slug: val("--slug"), at: new Date().toISOString() }];
      saveAutonomy(state, autonomyPath());
      console.log(JSON.stringify({ mode: "permanent", enabled: state.nightRun.enabled, consumedCount: state.nightRun.consumed.length }, null, 2));
      return;
    }
    const tm = consumeTestModeArticle({ slug: val("--slug") });
    console.log(JSON.stringify({ remaining: tm.articlesRemaining, enabled: tm.enabled }, null, 2));
    return;
  }
  if (has("--stop")) {
    const reason = val("--reason") || "manual";
    const nrStopped = stopNightRun({ reason });
    const tm = stopTestMode({ reason });
    console.log(JSON.stringify({ enabled: tm.enabled, disabledReason: tm.disabledReason, nightRunStopped: nrStopped ? true : false }, null, 2));
    return;
  }
  if (has("--enable")) {
    const n = Number(val("--articles") || 3);
    const tm = writeTestMode((t) => {
      t.enabled = true;
      t.articlesRemaining = n;
      t.enabledAt = new Date().toISOString();
      delete t.disabledReason;
      delete t.disabledAt;
    });
    console.log(JSON.stringify(tm, null, 2));
    return;
  }
  console.error("usage: --status | --consume --slug <slug> | --stop --reason <r> | --enable --articles <n>");
  process.exitCode = 2;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((e) => {
    console.error("[test-mode fatal]", e && e.message ? e.message : e);
    process.exitCode = 1;
  });
}
