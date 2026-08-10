import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  EXIT_CODES,
  OUTCOMES,
  auditRecordedOutcome,
  evaluateSuccessContract,
  makeStoppedResult,
  probePrMerged,
  recordRunOutcome,
  verifyAutomationExecution,
} from "./night-run-contract.mjs";

const RUN_ID = "20260808T043000.000";
const REGRESSION_RUN_ID = "20260810T043002.254";
const STARTED_AT = "2026-08-08T04:30:00+09:00";
const SLUG = "202608-contract-test";

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-night-contract-"));
  mkdirSync(path.join(root, "data", "automation"), { recursive: true });
  mkdirSync(path.join(root, "data", "social"), { recursive: true });
  mkdirSync(path.join(root, "logs", "article"), { recursive: true });
  writeFileSync(path.join(root, "data", "automation", "ledger.json"), JSON.stringify({ entries: [{ slug: SLUG, productionUrl: `https://sumalabo.com/articles/${SLUG}/`, prUrl: "https://github.com/example/repo/pull/1" }] }));
  return root;
}

function probes(overrides = {}) {
  return {
    http: async () => ({ ok: true, status: 200 }),
    pr: async () => ({ ok: true, state: "MERGED", mergedAt: "2026-08-08T05:00:00Z" }),
    strictVerify: async () => ({ ok: true, allHard: true, allSoft: true, softFailRemaining: [], finishedAt: "2026-08-08T05:05:00Z" }),
    xTwoStage: async () => ({ ok: true, mainRecorded: true, replyRecorded: true, postedAt: "2026-08-08T05:10:00Z" }),
    ...overrides,
  };
}

test("success requires all four real-world checks", async () => {
  const result = await evaluateSuccessContract({ root: fixture(), runId: RUN_ID, startedAt: STARTED_AT, slug: SLUG, probes: probes() });
  assert.equal(result.outcome, OUTCOMES.SUCCESS);
  assert.deepEqual(result.failedChecks, []);
  assert.equal(EXIT_CODES[result.outcome], 0);
});

test("stale evidence from a prior run cannot satisfy success", async () => {
  const result = await evaluateSuccessContract({
    root: fixture(), runId: RUN_ID, startedAt: STARTED_AT, slug: SLUG,
    probes: probes({ xTwoStage: async () => ({ ok: true, mainRecorded: true, replyRecorded: true, postedAt: "2026-08-07T05:10:00Z" }) }),
  });
  assert.equal(result.outcome, OUTCOMES.FAILED);
  assert.equal(result.evidence.xTwoStage.reason, "x_ledger_not_from_current_run");
});

test("8/10 regression ID is preserved when no slug can be resolved", async () => {
  const root = fixture();
  const result = await evaluateSuccessContract({ root, runId: REGRESSION_RUN_ID, startedAt: STARTED_AT, probes: probes() });
  assert.equal(result.outcome, OUTCOMES.FAILED);
  assert.equal(result.reason, "slug_not_resolved");
  assert.equal(result.runId, REGRESSION_RUN_ID);
  const recorded = recordRunOutcome(result, { root, startedAt: STARTED_AT });
  assert.equal(recorded.runId, REGRESSION_RUN_ID);
  assert.equal(recorded.reason, "slug_not_resolved");
});

test("PR merge evidence uses REST and survives GraphQL exhaustion", async () => {
  const result = await probePrMerged("https://github.com/hnishimura40/sumalabo/pull/284", {
    token: "test-token",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        state: "closed",
        merged: true,
        merged_at: "2026-08-10T03:16:58Z",
        merge_commit_sha: "a1d98be",
        html_url: "https://github.com/hnishimura40/sumalabo/pull/284",
      }),
    }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.mergedAt, "2026-08-10T03:16:58Z");
});

for (const [name, override] of [
  ["articleHttp200", { http: async () => ({ ok: false, status: 404 }) }],
  ["prMerged", { pr: async () => ({ ok: false, state: "OPEN" }) }],
  ["strictVerify", { strictVerify: async () => ({ ok: false, hardFail: true }) }],
  ["xTwoStage", { xTwoStage: async () => ({ ok: false, mainRecorded: true, replyRecorded: false }) }],
]) {
  test(`forced ${name} failure is failed`, async () => {
    const result = await evaluateSuccessContract({ root: fixture(), runId: RUN_ID, startedAt: STARTED_AT, slug: SLUG, probes: probes(override) });
    assert.equal(result.outcome, OUTCOMES.FAILED);
    assert.ok(result.failedChecks.includes(name));
    assert.equal(EXIT_CODES[result.outcome], 30);
  });
}

test("intentional no-target stop uses stopped and nonzero scheduler code", () => {
  const result = makeStoppedResult({ runId: RUN_ID, reason: "no_scout_target" });
  assert.equal(result.outcome, OUTCOMES.STOPPED);
  assert.equal(EXIT_CODES[result.outcome], 20);
});

test("unknown logical stop is failed instead of being rounded to success", () => {
  const result = makeStoppedResult({ runId: RUN_ID, reason: "unexpected_branch" });
  assert.equal(result.outcome, OUTCOMES.FAILED);
  assert.equal(EXIT_CODES[result.outcome], 30);
});

test("8/6-type veto-wait fake success is detected", async () => {
  const root = fixture();
  const claimed = recordRunOutcome({ runId: RUN_ID, outcome: "success", reason: "wrapper_exited", slug: SLUG }, { root, startedAt: STARTED_AT });
  const actual = await auditRecordedOutcome(claimed, {
    root, probes: probes({ xTwoStage: async () => ({ ok: false, reason: "veto_wait_no_x_record" }) }),
  });
  assert.equal(actual.outcome, OUTCOMES.FAILED);
  assert.equal(actual.mismatch, true);
  assert.deepEqual(actual.failedChecks, ["xTwoStage"]);
});

test("8/7-type Phase B omission is detected", async () => {
  const root = fixture();
  const claimed = recordRunOutcome({ runId: RUN_ID, outcome: "success", reason: "claude_exit_0", slug: SLUG }, { root, startedAt: STARTED_AT });
  const actual = await auditRecordedOutcome(claimed, {
    root,
    probes: probes({
      http: async () => ({ ok: false, status: 404 }),
      pr: async () => ({ ok: false, state: "OPEN" }),
      strictVerify: async () => ({ ok: false, reason: "missing" }),
      xTwoStage: async () => ({ ok: false, reason: "missing" }),
    }),
  });
  assert.equal(actual.outcome, OUTCOMES.FAILED);
  assert.equal(actual.mismatch, true);
  assert.equal(actual.failedChecks.length, 4);
});

test("8/8-type preflight stop without a permitted stop record is detected", async () => {
  const root = fixture();
  const claimed = recordRunOutcome({ runId: RUN_ID, outcome: "success", reason: "preflight_exit_0", slug: null }, { root, startedAt: STARTED_AT });
  const actual = await auditRecordedOutcome(claimed, { root, probes: probes() });
  assert.equal(actual.outcome, OUTCOMES.FAILED);
  assert.equal(actual.mismatch, true);
  assert.match(actual.reason, /slug_not_resolved/);
});

test("a scheduled-acceptance stop cannot mask a later run without a contract", async () => {
  const root = fixture();
  const stopped = recordRunOutcome({ runId: RUN_ID, outcome: OUTCOMES.STOPPED, reason: "scheduled_acceptance" }, {
    root,
    startedAt: "2026-08-08T01:01:30.000Z",
    finishedAt: "2026-08-08T01:01:32.000Z",
  });
  const audit = await auditRecordedOutcome(stopped, { root, activeAttemptAt: "2026-08-08T01:25:28.000Z" });
  assert.equal(audit.outcome, OUTCOMES.FAILED);
  assert.equal(audit.reason, "current_attempt_missing_contract");
  assert.equal(audit.mismatch, true);
  assert.equal(EXIT_CODES[audit.outcome], 30);
});

test("watchdog audit rejects a recorded success when the actual contract disagrees", async () => {
  const root = fixture();
  const claimed = recordRunOutcome({ runId: RUN_ID, outcome: OUTCOMES.SUCCESS, reason: "four_point_contract_satisfied", slug: SLUG }, { root, startedAt: STARTED_AT });
  const audit = await auditRecordedOutcome(claimed, {
    root,
    probes: probes({ pr: async () => ({ ok: false, state: "OPEN" }) }),
  });
  assert.equal(audit.outcome, OUTCOMES.FAILED);
  assert.equal(audit.mismatch, true);
  assert.match(audit.reason, /^record_actual_mismatch:/);
});

test("missing aggregation automation is failed after its deadline", () => {
  const root = fixture();
  const result = verifyAutomationExecution({ id: "7", scheduledAt: "2026-08-08T08:00:00+09:00", deadline: "2020-01-01T00:00:00Z", root });
  assert.equal(result.outcome, OUTCOMES.FAILED);
  assert.equal(result.reason, "automation_not_executed");
});
