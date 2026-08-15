import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordRunOutcome } from "../../scripts/automation/night-run-contract.mjs";
import { isMeasurementActive, summarizeMeasurement } from "../../scripts/automation/unattended-measurement.mjs";

test("7日間だけ計測を有効化する", () => {
  const config = { active: true, startAt: "2026-08-01T00:00:00+09:00", endAt: "2026-08-08T00:00:00+09:00" };
  assert.equal(isMeasurementActive(config, new Date("2026-08-07T23:59:59+09:00")), true);
  assert.equal(isMeasurementActive(config, new Date("2026-08-08T00:00:00+09:00")), false);
});

test("無人完走率・介入・公開後破綻を集計する", () => {
  const root = mkdtempSync(join(tmpdir(), "measurement-"));
  mkdirSync(join(root, "data", "automation"), { recursive: true });
  writeFileSync(join(root, "data", "automation", "measurement.json"), JSON.stringify({ active: true, startAt: "2026-08-01T00:00:00Z", endAt: "2026-08-08T00:00:00Z" }));
  recordRunOutcome({ runId: "20260802T000000.000", outcome: "success", reason: "four_point_contract_satisfied", slug: "a" }, { root, startedAt: "2026-08-02T00:00:00Z" });
  recordRunOutcome({ runId: "20260803T000000.000", outcome: "failed", reason: "post_publish_breakage", slug: "b" }, { root, startedAt: "2026-08-03T00:00:00Z" });
  mkdirSync(join(root, "logs", "night", "run-contract"), { recursive: true });
  writeFileSync(join(root, "logs", "night", "run-contract", "human-events.jsonl"), [
    JSON.stringify({ runId: "20260803T000000.000", type: "intervention", reason: "manual recovery" }),
    JSON.stringify({ runId: "20260803T000000.000", type: "post_publish_correction", reason: "repair" }),
  ].join("\n") + "\n");
  const summary = summarizeMeasurement(root);
  assert.equal(summary.totalRuns, 2);
  assert.equal(summary.unattendedCompletionRate, 0.5);
  assert.equal(summary.humanInterventions, 1);
  assert.equal(summary.postPublishBreakages, 1);
});

test("stopped_x_pending counts as unattended acceptance while recovery does not", () => {
  const root = mkdtempSync(join(tmpdir(), "measurement-x-pending-"));
  mkdirSync(join(root, "data", "automation"), { recursive: true });
  writeFileSync(join(root, "data", "automation", "measurement.json"), JSON.stringify({ active: true, startAt: "2026-08-01T00:00:00Z", endAt: "2026-08-08T00:00:00Z" }));
  recordRunOutcome({
    runId: "20260804T000000.000",
    outcome: "stopped_x_pending",
    reason: "article_three_point_contract_satisfied_x_pending",
    slug: "fresh",
    acceptanceEligible: true,
  }, { root, startedAt: "2026-08-04T00:00:00Z" });
  recordRunOutcome({
    runId: "20260805T000000.000",
    outcome: "success",
    reason: "four_point_contract_satisfied",
    slug: "recovery",
    completionKind: "recovery",
    acceptanceEligible: false,
  }, { root, startedAt: "2026-08-05T00:00:00Z" });

  const summary = summarizeMeasurement(root);
  assert.equal(summary.stoppedXPending, 1);
  assert.equal(summary.unattendedCompletionRate, 1);
  assert.equal(summary.acceptanceSuccess, 1);
});

test("stopped_x_pending counts as unattended acceptance while recovery does not", () => {
  const root = mkdtempSync(join(tmpdir(), "measurement-x-pending-"));
  mkdirSync(join(root, "data", "automation"), { recursive: true });
  writeFileSync(join(root, "data", "automation", "measurement.json"), JSON.stringify({ active: true, startAt: "2026-08-01T00:00:00Z", endAt: "2026-08-08T00:00:00Z" }));
  recordRunOutcome({
    runId: "20260804T000000.000",
    outcome: "stopped_x_pending",
    reason: "article_three_point_contract_satisfied_x_pending",
    slug: "fresh",
    acceptanceEligible: true,
  }, { root, startedAt: "2026-08-04T00:00:00Z" });
  recordRunOutcome({
    runId: "20260805T000000.000",
    outcome: "success",
    reason: "four_point_contract_satisfied",
    slug: "recovery",
    completionKind: "recovery",
    acceptanceEligible: false,
  }, { root, startedAt: "2026-08-05T00:00:00Z" });

  const summary = summarizeMeasurement(root);
  assert.equal(summary.stoppedXPending, 1);
  assert.equal(summary.unattendedCompletionRate, 1);
  assert.equal(summary.acceptanceSuccess, 1);
});
