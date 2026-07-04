// tests/sumahon/ledger.test.mjs — P3 台帳一本化のユニットテスト。
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TMP = mkdtempSync(join(tmpdir(), "ledger-test-"));
const lib = await import(pathToFileURL(join(ROOT, "scripts", "automation", "ledger.mjs")).href);

test("upsertEntry: マージ更新で既存フィールドを消さない（lossy禁止）", () => {
  const p = join(TMP, "ledger.json");
  lib.upsertEntry("a-slug", { productionUrl: "https://x/1", publishedAt: "2026-07-01" }, p);
  lib.upsertEntry("a-slug", { xPostUrl: "https://x.com/s/1" }, p); // 別フィールドだけ更新
  const l = lib.readLedger(p);
  const e = l.entries.find((x) => x.slug === "a-slug");
  assert.equal(e.productionUrl, "https://x/1", "既存フィールドが保持される");
  assert.equal(e.xPostUrl, "https://x.com/s/1");
  // undefined/null は無視される
  lib.upsertEntry("a-slug", { productionUrl: undefined, publishedAt: null }, p);
  const e2 = lib.readLedger(p).entries.find((x) => x.slug === "a-slug");
  assert.equal(e2.productionUrl, "https://x/1");
  assert.equal(e2.publishedAt, "2026-07-01");
});

test("upsertEntry: incidents は重複なしで追記される", () => {
  const p = join(TMP, "ledger2.json");
  lib.upsertEntry("b", { incidents: [{ at: "t1", kind: "k1" }] }, p);
  lib.upsertEntry("b", { incidents: [{ at: "t1", kind: "k1" }, { at: "t2", kind: "k2" }] }, p);
  const e = lib.readLedger(p).entries.find((x) => x.slug === "b");
  assert.equal(e.incidents.length, 2, "同一incidentは重複追加しない");
});

test("writeLedger: 原子的更新（tmp→rename）で正しいJSONが残る", () => {
  const p = join(TMP, "ledger3.json");
  lib.writeLedger({ version: 1, entries: [{ slug: "c" }] }, p);
  const parsed = JSON.parse(readFileSync(p, "utf-8"));
  assert.equal(parsed.entries[0].slug, "c");
  assert.ok(parsed.updatedAt);
});

test.after(() => { try { rmSync(TMP, { recursive: true, force: true }); } catch {} });
