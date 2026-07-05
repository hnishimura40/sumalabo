// scripts/automation/autonomy.mjs — Autonomy Ladder の状態管理ライブラリ (L1 基盤)。
//
// 状態ファイル: data/automation/autonomy.json
//   { level, paused, vetoWindowMinutes, promotionCount, incidents }
//
// 役割:
//   - loadAutonomy / saveAutonomy: 状態の読み書き（壊れたファイルは安全側 = L0/paused扱い）
//   - gate: finalize / Phase B / Phase C の入口判定。
//       * paused: true → どのフェーズも自動実行不可（kill switch）
//       * trigger "manual"（ユーザー明示指示）は level に関係なく許可
//       * trigger "auto_after_veto" は phase の最低 level を要求
//         （finalize=0 / phase_b=1 / phase_c=2。L0 では自動 Phase B は走らない）
//   - recordIncident: 事故記録（日時・slug・種別）を incidents に追記
//   - maybeAutoDemote: 直近 10 記事のうち incidents が 2 件以上なら level を 1 下げる
//
// テスト用 override:
//   - 環境変数 AUTONOMY_FILE で状態ファイルパスを差し替え可能
//   - maybeAutoDemote の recentSlugs / queuePath は引数で注入可能
//
// 安全側の原則: 状態が読めない・壊れている場合は「自動実行しない」に倒す。

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

export const DEFAULT_AUTONOMY_PATH = path.join("data", "automation", "autonomy.json");
const QUEUE_PATH = path.join("data", "automation", "sumahon-queue.json");

export const DEFAULT_STATE = Object.freeze({
  level: 0,
  paused: false,
  vetoWindowMinutes: 30,
  promotionCount: { toL1: 0 },
  incidents: [],
});

// フェーズごとの「自動実行 (auto_after_veto)」に必要な最低 level。
// manual（ユーザー明示了承済み）の実行は level に関係なく許可される。
export const PHASE_MIN_AUTO_LEVEL = Object.freeze({
  finalize: 0,
  phase_b: 1,
  phase_c: 2,
});

export function autonomyPath() {
  const override = (process.env.AUTONOMY_FILE || "").trim();
  return override || DEFAULT_AUTONOMY_PATH;
}

export function loadAutonomy(filePath = autonomyPath()) {
  if (!existsSync(filePath)) {
    // ファイルが無い = L0 相当（自動実行しない）。paused ではないので手動運用は可能。
    return { ...DEFAULT_STATE, promotionCount: { ...DEFAULT_STATE.promotionCount }, incidents: [], _missing: true };
  }
  let raw;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    // 壊れたファイルは安全側: paused 扱い（自動実行を全停止し、人間に直させる）
    return { ...DEFAULT_STATE, paused: true, incidents: [], _corrupt: true };
  }
  // 未知キー（xPostMethod / cleanCount / testMode 等）は素通しで保持する。
  // 従来は既知キーのみに正規化していたため、recordIncident 等の read-modify-write で
  // 追加フィールドが消える潜在バグがあった（2026-07-05 修正）。
  const state = {
    ...raw,
    level: Number.isInteger(raw.level) && raw.level >= 0 ? raw.level : 0,
    paused: raw.paused === true,
    vetoWindowMinutes:
      Number.isFinite(raw.vetoWindowMinutes) && raw.vetoWindowMinutes > 0
        ? raw.vetoWindowMinutes
        : DEFAULT_STATE.vetoWindowMinutes,
    promotionCount:
      raw.promotionCount && typeof raw.promotionCount === "object"
        ? { toL1: Number.isInteger(raw.promotionCount.toL1) ? raw.promotionCount.toL1 : 0 }
        : { toL1: 0 },
    incidents: Array.isArray(raw.incidents) ? raw.incidents : [],
  };
  return state;
}

export function saveAutonomy(state, filePath = autonomyPath()) {
  const clean = {
    ...state,
    level: state.level,
    paused: state.paused === true,
    vetoWindowMinutes: state.vetoWindowMinutes,
    promotionCount: state.promotionCount || { toL1: 0 },
    incidents: Array.isArray(state.incidents) ? state.incidents : [],
  };
  delete clean._missing;
  delete clean._corrupt;
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filePath, JSON.stringify(clean, null, 2) + "\n", "utf-8");
  return clean;
}

/**
 * フェーズ入口の判定。
 * @param {object} opts
 * @param {"finalize"|"phase_b"|"phase_c"} opts.phase
 * @param {"manual"|"auto_after_veto"} [opts.trigger="manual"]
 * @param {object} [opts.state] 省略時は loadAutonomy()
 * @returns {{allowed: boolean, paused: boolean, level: number, trigger: string, reason: string|null}}
 */
export function gate({ phase, trigger = "manual", state = null }) {
  const s = state || loadAutonomy();
  const base = { paused: s.paused === true, level: s.level, trigger };
  if (s.paused === true) {
    return { ...base, allowed: false, reason: "autonomy_paused" };
  }
  if (trigger === "auto_after_veto") {
    const minLevel = PHASE_MIN_AUTO_LEVEL[phase];
    if (minLevel === undefined) {
      return { ...base, allowed: false, reason: "unknown_phase" };
    }
    if (s.level < minLevel) {
      return { ...base, allowed: false, reason: "autonomy_level_insufficient" };
    }
  }
  return { ...base, allowed: true, reason: null };
}

/**
 * 事故記録を追記して保存する。demote 判定は maybeAutoDemote で別途行う。
 * @param {{slug: string, kind: string, at?: string, detail?: string}} incident
 */
export function recordIncident(incident, filePath = autonomyPath()) {
  const state = loadAutonomy(filePath);
  const entry = {
    at: incident.at || new Date().toISOString(),
    slug: incident.slug || null,
    kind: incident.kind || "unknown",
    ...(incident.detail ? { detail: incident.detail } : {}),
  };
  state.incidents.push(entry);
  saveAutonomy(state, filePath);
  return entry;
}

/**
 * queue から「直近 10 記事」(published / x_posted を publishedAt 降順) の slug を返す。
 * queue が読めない場合は null（呼び出し側で demote 判定をスキップ）。
 */
export function getRecentArticleSlugs(count = 10, queuePath = QUEUE_PATH) {
  if (!existsSync(queuePath)) return null;
  let queue;
  try {
    queue = JSON.parse(readFileSync(queuePath, "utf-8"));
  } catch {
    return null;
  }
  if (!Array.isArray(queue)) return null;
  return queue
    .filter((e) => e && typeof e.slug === "string" && ["published", "x_posted"].includes(e.status))
    .sort((a, b) => String(b.publishedAt || b.statusUpdatedAt || "").localeCompare(String(a.publishedAt || a.statusUpdatedAt || "")))
    .slice(0, count)
    .map((e) => e.slug);
}

/**
 * 自動降格判定: 直近 10 記事のうち incidents に記録された slug が 2 件以上
 * （重複 slug は 1 記事 1 カウント）なら level を 1 下げて保存する。
 * @param {object} [opts]
 * @param {string[]|null} [opts.recentSlugs] テスト注入用。省略時は queue から取得
 * @param {string} [opts.queuePath]
 * @param {string} [opts.filePath]
 * @returns {{demoted: boolean, from?: number, to?: number, incidentSlugs?: string[], reason?: string}}
 */
export function maybeAutoDemote({ recentSlugs = null, queuePath = QUEUE_PATH, filePath = autonomyPath() } = {}) {
  const state = loadAutonomy(filePath);
  if (state.level <= 0) return { demoted: false, reason: "already_level_0" };
  const recent = recentSlugs ?? getRecentArticleSlugs(10, queuePath);
  if (!recent) return { demoted: false, reason: "queue_unavailable" };
  const incidentSlugs = new Set(
    state.incidents.filter((i) => i && i.slug && recent.includes(i.slug)).map((i) => i.slug),
  );
  if (incidentSlugs.size < 2) return { demoted: false, reason: "below_threshold", incidentSlugs: [...incidentSlugs] };
  const from = state.level;
  state.level = from - 1;
  state.incidents.push({
    at: new Date().toISOString(),
    slug: null,
    kind: "auto_demotion",
    detail: `直近10記事で事故${incidentSlugs.size}件のため level ${from} → ${state.level}`,
  });
  saveAutonomy(state, filePath);
  return { demoted: true, from, to: state.level, incidentSlugs: [...incidentSlugs] };
}

/** veto 期限を計算して ISO 文字列と JST 表示文字列を返す。 */
export function computeVetoDeadline(fromDate = new Date(), state = null) {
  const s = state || loadAutonomy();
  const deadline = new Date(fromDate.getTime() + s.vetoWindowMinutes * 60_000);
  return {
    previewReadyAt: fromDate.toISOString(),
    vetoDeadline: deadline.toISOString(),
    vetoDeadlineJst: formatJst(deadline),
    vetoWindowMinutes: s.vetoWindowMinutes,
  };
}

export function formatJst(date) {
  const jst = new Date(date.getTime() + 9 * 60 * 60_000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())} ${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())} JST`;
}
