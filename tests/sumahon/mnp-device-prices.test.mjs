
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateCatalog, reconcilePrices } from "../../src/lib/mnp-device-prices.mjs";

const catalog = JSON.parse(readFileSync(new URL("../../data/mnp-device-prices.json", import.meta.url), "utf8"));
const base = { schemaVersion: 1, rows: [catalog.rows[0]] };
const row = base.rows[0];
const now = new Date(Date.parse(row.checkedAt) + 3600_000).toISOString();
const observation = (overrides = {}) => ({
  id: row.id, outcome: "verified", checkedAt: now,
  evidenceUrl: row.officialUrl, evidenceNote: "オンラインMNPと支払方法の各画面を確認",
  values: { ...row, ...overrides },
});
const reconcile = (...observations) => reconcilePrices(base, { observations }, { now });

test("要求された五社の公式価格と返却条件が有効", () => {
  assert.equal(new Set(validateCatalog(catalog).rows.map(r => r.carrier)).size, 5);
  assert.throws(() => reconcilePrices({ ...base, rows: [{ ...row, mnpYen: 0 }] }, { observations: [] }));
  assert.throws(() => reconcilePrices({ ...base, rows: [{ ...row, normalYen: 0 }] }, { observations: [] }));
});

test("未取得・ゼロ円・非公式の参照先では前回の額と確認日時を保持", () => {
  for (const result of [
    reconcile(),
    reconcile(observation({ mnpYen: 0 })),
    reconcile(observation({ officialUrl: "https://example.org/" })),
  ]) {
    assert.deepEqual(result.catalog.rows[0], { ...row, status: "checking" });
    assert.equal(result.issues.length, 1);
  }
});

test("大幅変動は一度確認中にし、正確に一致する別の確認結果でのみ切り替える", () => {
  const obs = observation({ mnpYen: row.mnpYen - 11_000 });
  const first = reconcile(obs);
  const proof = {
    id: row.id, status: "confirmed", checkedAt: now, url: row.termsUrl,
    note: "条件ページと端末価格画面を再照合",
    prices: { normalYen: row.normalYen, mnpYen: obs.values.mnpYen, realYen: row.real.yen },
  };
  assert.equal(first.catalog.rows[0].mnpYen, row.mnpYen);
  assert.equal(reconcilePrices(base, { observations: [obs] }, { now, confirmedLarge: [proof] }).catalog.rows[0].status, "checking");
  const confirmed = reconcilePrices(first.catalog, { observations: [obs] }, { now, confirmedLarge: [proof] });
  assert.equal(confirmed.catalog.rows[0].mnpYen, obs.values.mnpYen);
  assert.equal(confirmed.catalog.rows[0].status, "verified");
});

test("確認済みの小幅変更を反映しても、他の行は消さない", () => {
  const result = reconcilePrices(catalog, { observations: [observation({ mnpYen: row.mnpYen - 650 })] }, { now });
  assert.equal(result.catalog.rows.length, catalog.rows.length);
  assert.equal(result.catalog.rows[0].mnpYen, row.mnpYen - 650);
  assert.equal(result.catalog.rows[1].status, "checking");
});

test("日付の戻りと無効な終了証拠を許可しない", () => {
  const bad = { ...observation(), outcome: "ended", evidenceUrl: "https://example.org/", checkedAt: row.checkedAt };
  assert.equal(reconcile(bad).catalog.rows[0].status, "checking");
  const good = { ...bad, evidenceUrl: row.officialUrl };
  assert.equal(reconcile(good).catalog.rows[0].status, "ended");
});
