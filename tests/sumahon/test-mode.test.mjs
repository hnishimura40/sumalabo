// tests/sumahon/test-mode.test.mjs — testMode（本数限定全自動）の状態遷移テスト。
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isTestModeActive,
  consumeTestModeArticle,
  stopTestMode,
  checkTestModeIncidentStop,
} from "../../scripts/automation/test-mode.mjs";
import { recordIncident, loadAutonomy } from "../../scripts/automation/autonomy.mjs";

const TMP = mkdtempSync(join(tmpdir(), "testmode-"));
const FILE = join(TMP, "autonomy.json");

function writeState(testMode, extra = {}) {
  writeFileSync(
    FILE,
    JSON.stringify({
      level: 1,
      paused: false,
      vetoWindowMinutes: 30,
      xPostMethod: "browser",
      cleanCount: 1,
      promotionCount: { toL1: 1 },
      incidents: [],
      testMode,
      ...extra,
    }),
    "utf-8",
  );
}

const ACTIVE_TM = {
  enabled: true,
  articlesRemaining: 3,
  autoPick: true,
  autoPhaseB: true,
  autoPhaseC: true,
  maxPerNight: 1,
  expiresAt: "2099-01-01T00:00:00+09:00",
  enabledAt: "2026-07-05T00:00:00Z",
};

test("1. アクティブ判定: enabled+残数+期限内 → active", () => {
  writeState(ACTIVE_TM);
  const st = isTestModeActive({ filePath: FILE });
  assert.equal(st.active, true);
});

test("2. paused / 期限切れ / 残数0 は inactive", () => {
  writeState(ACTIVE_TM, { paused: true });
  assert.equal(isTestModeActive({ filePath: FILE }).reason, "autonomy_paused");
  writeState({ ...ACTIVE_TM, expiresAt: "2020-01-01T00:00:00+09:00" });
  assert.equal(isTestModeActive({ filePath: FILE }).reason, "expired");
  writeState({ ...ACTIVE_TM, articlesRemaining: 0 });
  assert.equal(isTestModeActive({ filePath: FILE }).reason, "no_articles_remaining");
});

test("3. consume: 残数減算、0で自動 enabled:false", () => {
  writeState({ ...ACTIVE_TM, articlesRemaining: 1 });
  const tm = consumeTestModeArticle({ slug: "test-slug", filePath: FILE });
  assert.equal(tm.articlesRemaining, 0);
  assert.equal(tm.enabled, false);
  assert.equal(tm.disabledReason, "articles_exhausted");
  assert.equal(tm.consumed[0].slug, "test-slug");
});

test("4. incident 2件で testMode 自動停止（enabledAt 以降のみカウント）", () => {
  writeState(ACTIVE_TM);
  recordIncident({ slug: "a", kind: "x_card_not_rendered" }, FILE);
  let r = checkTestModeIncidentStop({ filePath: FILE });
  assert.equal(r.stopped, false);
  assert.equal(r.incidentCount, 1);
  recordIncident({ slug: "b", kind: "hard_fail_rollback" }, FILE);
  r = checkTestModeIncidentStop({ filePath: FILE });
  assert.equal(r.stopped, true);
  assert.equal(isTestModeActive({ filePath: FILE }).active, false);
});

test("5. 未知キー保存: recordIncident しても testMode/xPostMethod/cleanCount が残る", () => {
  writeState(ACTIVE_TM);
  recordIncident({ slug: "keep-check", kind: "test" }, FILE);
  const raw = JSON.parse(readFileSync(FILE, "utf-8"));
  assert.equal(raw.xPostMethod, "browser");
  assert.equal(raw.cleanCount, 1);
  assert.equal(raw.testMode.enabled, true);
  const state = loadAutonomy(FILE);
  assert.equal(state.testMode.articlesRemaining, 3);
});

test("6. stopTestMode: 即時停止と理由記録", () => {
  writeState(ACTIVE_TM);
  const tm = stopTestMode({ reason: "retract(x)", filePath: FILE });
  assert.equal(tm.enabled, false);
  assert.equal(tm.disabledReason, "retract(x)");
});

test.after(() => {
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {}
});
