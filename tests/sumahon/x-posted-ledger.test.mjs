import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { recordPost, recordReply, verifyTwoStage } from "../../scripts/sumahon/x-posted-ledger.mjs";

test("recordPost adds the Codex route without changing the version-1 ledger shape", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sumalabo-x-ledger-"));
  const ledgerPath = path.join(dir, "x-posted.json");
  try {
    const record = await recordPost({
      slug: "route-test",
      articleUrl: "https://sumalabo.com/articles/route-test/",
      postText: "test",
      postUrl: "https://x.com/suma_labo/status/1",
      method: "chrome",
      route: "codex",
      ledgerPath,
    });
    const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
    assert.equal(ledger.version, 1);
    assert.equal(record.method, "chrome");
    assert.equal(record.route, "codex");
    assert.equal(ledger.posts[0].route, "codex");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("recordPost keeps legacy callers valid when route is omitted", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sumalabo-x-ledger-"));
  const ledgerPath = path.join(dir, "x-posted.json");
  try {
    const record = await recordPost({ slug: "legacy-route-test", ledgerPath });
    assert.equal(record.route, null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("recordReply performs the second-stage update without adding another post", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sumalabo-x-ledger-"));
  const ledgerPath = path.join(dir, "x-posted.json");
  try {
    await recordPost({
      slug: "two-stage-test",
      postUrl: "https://x.com/suma_labo/status/10",
      route: "codex",
      replyUrl: null,
      ledgerPath,
    });
    const updated = await recordReply({
      slug: "two-stage-test",
      replyUrl: "https://x.com/suma_labo/status/11",
      route: "codex",
      ledgerPath,
    });
    const ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
    assert.equal(ledger.version, 1);
    assert.equal(ledger.posts.length, 1);
    assert.equal(updated.replyUrl, "https://x.com/suma_labo/status/11");
    assert.equal(ledger.posts[0].route, "codex");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("recordReply refuses to update before the main-post record exists", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sumalabo-x-ledger-"));
  const ledgerPath = path.join(dir, "x-posted.json");
  try {
    await assert.rejects(
      recordReply({ slug: "missing-main", replyUrl: "https://x.com/suma_labo/status/20", ledgerPath }),
      /本投稿レコードがありません/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("verifyTwoStage rejects a main-only record and accepts the completed reply stage", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "sumalabo-x-ledger-"));
  const ledgerPath = path.join(dir, "x-posted.json");
  try {
    await recordPost({
      slug: "verify-two-stage",
      postUrl: "https://x.com/suma_labo/status/30",
      ledgerPath,
    });
    assert.deepEqual(await verifyTwoStage("missing", ledgerPath), {
      ok: false,
      reason: "x_ledger_record_missing",
      slug: "missing",
    });
    assert.equal((await verifyTwoStage("verify-two-stage", ledgerPath)).reason, "x_reply_evidence_invalid");
    await recordReply({
      slug: "verify-two-stage",
      replyUrl: "https://x.com/suma_labo/status/31",
      ledgerPath,
    });
    const complete = await verifyTwoStage("verify-two-stage", ledgerPath);
    assert.equal(complete.ok, true);
    assert.equal(complete.reason, "x_two_stage_satisfied");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
