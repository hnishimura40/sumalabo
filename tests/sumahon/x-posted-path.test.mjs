import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { backupXPostedLedger } from "../../scripts/automation/backup-x-posted-ledger.mjs";
import { inspectXPostedLedgerAccess, resolveXPostedLedgerPath } from "../../scripts/sumahon/x-posted-path.mjs";

function sha256(file) {
  return crypto.createHash("sha256").update(readFileSync(file)).digest("hex").toUpperCase();
}

test("X ledger resolves under USERPROFILE and never under the repository", () => {
  const profile = mkdtempSync(path.join(os.tmpdir(), "sumalabo-profile-"));
  const resolved = resolveXPostedLedgerPath({
    env: { USERPROFILE: profile },
    environment: { xPostedLedger: { pathTemplate: "%USERPROFILE%\\.sumalabo\\state\\x-posted.json" } },
  });
  assert.equal(resolved, path.join(profile, ".sumalabo", "state", "x-posted.json"));
  assert.doesNotMatch(resolved.replaceAll("\\", "/"), /data\/social/);
});

test("external ledger access rejects duplicate slugs before X posting", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sumalabo-x-ledger-"));
  const ledgerPath = path.join(dir, "x-posted.json");
  writeFileSync(ledgerPath, JSON.stringify({ version: 1, posts: [{ slug: "a" }, { slug: "a" }] }));
  assert.equal(inspectXPostedLedgerAccess(ledgerPath).reason, "x_ledger_duplicate_slug");
});

test("Watchdog backup preserves count and SHA-256", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "sumalabo-x-backup-"));
  const ledgerPath = path.join(dir, "state", "x-posted.json");
  const backupDirectory = path.join(dir, "logs", "night", "x-posted-backups");
  mkdirSync(path.dirname(ledgerPath), { recursive: true });
  writeFileSync(ledgerPath, `${JSON.stringify({ version: 1, posts: [{ slug: "a" }, { slug: "b" }] }, null, 2)}\n`);
  const result = backupXPostedLedger({ date: "2026-08-24", ledgerPath, backupDirectory });
  assert.equal(result.count, 2);
  assert.equal(result.sourceSha256, result.backupSha256);
  assert.equal(sha256(ledgerPath), sha256(result.backupPath));
});
