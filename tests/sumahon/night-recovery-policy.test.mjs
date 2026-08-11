import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { evaluateSuccessContract, recordRunOutcome } from "../../scripts/automation/night-run-contract.mjs";
import { summarizeMeasurement } from "../../scripts/automation/unattended-measurement.mjs";

const startedAt = "2026-08-11T00:00:00.000Z";
const probes = {
  http: async () => ({ ok: true, status: 200 }),
  pr: async () => ({ ok: true, mergedAt: "2026-08-11T00:01:00.000Z" }),
  strictVerify: async () => ({ ok: true, finishedAt: "2026-08-11T00:02:00.000Z" }),
  xTwoStage: async () => ({ ok: true, postedAt: "2026-08-11T00:03:00.000Z" }),
};

test("recovered artifacts may complete successfully but never count as acceptance", async () => {
  const result = await evaluateSuccessContract({
    runId: "20260811T000000.001",
    startedAt,
    slug: "202608-recovered-article",
    completionKind: "recovery",
    probes,
  });
  assert.equal(result.outcome, "success");
  assert.equal(result.completionKind, "recovery");
  assert.equal(result.acceptanceEligible, false);
});

test("measurement separates recovery completion from fresh-run acceptance", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-recovery-policy-"));
  recordRunOutcome({ runId: "20260811T000000.001", outcome: "success", reason: "four_point_contract_satisfied", completionKind: "recovery", acceptanceEligible: false }, { root, startedAt });
  recordRunOutcome({ runId: "20260811T010000.001", outcome: "success", reason: "four_point_contract_satisfied", completionKind: "fresh_run", acceptanceEligible: true }, { root, startedAt: "2026-08-11T01:00:00.000Z" });
  const summary = summarizeMeasurement(root);
  assert.equal(summary.success, 2);
  assert.equal(summary.acceptanceSuccess, 1);
  assert.equal(summary.acceptanceCompletionRate, 0.5);
});

test("permanent policy explicitly separates recovery from acceptance", () => {
  const policy = readFileSync(new URL("../../docs/night_failure_artifact_policy.md", import.meta.url), "utf8");
  const resume = readFileSync(new URL("../../docs/night_driver_resume_prompt.md", import.meta.url), "utf8");
  assert.match(policy, /成果物は途中から回収/);
  assert.match(policy, /構成検証は必ず最初から/);
  assert.match(policy, /acceptanceEligible=false/);
  assert.match(resume, /--completion-kind recovery/);
  assert.match(resume, /受入実績に数えてはいけません/);
});
