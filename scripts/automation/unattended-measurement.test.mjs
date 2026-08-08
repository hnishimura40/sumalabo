import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { recordHumanEvent, recordRunOutcome } from "./night-run-contract.mjs";
import { summarizeMeasurement } from "./unattended-measurement.mjs";

test("measurement is keyed by runId and includes interventions and post-publish corrections", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-measurement-"));
  mkdirSync(path.join(root, "data", "automation"), { recursive: true });
  writeFileSync(path.join(root, "data", "automation", "measurement.json"), JSON.stringify({
    active: true,
    startAt: "2026-08-01T00:00:00+09:00",
    endAt: "2026-08-09T00:00:00+09:00",
  }));
  recordRunOutcome({ runId: "20260803T043000.000", outcome: "failed", reason: "startup", slug: null }, { root, startedAt: "2026-08-03T04:30:00+09:00" });
  recordRunOutcome({ runId: "20260804T043000.000", outcome: "success", reason: "four_point_contract_satisfied", slug: "article-a" }, { root, startedAt: "2026-08-04T04:30:00+09:00" });
  recordRunOutcome({ runId: "20260805T043000.000", outcome: "stopped", reason: "no_scout_target", slug: null }, { root, startedAt: "2026-08-05T04:30:00+09:00" });
  recordHumanEvent({ runId: "20260804T043000.000", type: "intervention", reason: "manual recovery", root });
  recordHumanEvent({ runId: "20260804T043000.000", type: "post_publish_correction", reason: "image replacement", slug: "article-a", root });

  const summary = summarizeMeasurement(root);
  assert.equal(summary.primaryKey, "runId");
  assert.equal(summary.totalRuns, 3);
  assert.equal(summary.success, 1);
  assert.equal(summary.stopped, 1);
  assert.equal(summary.failed, 1);
  assert.equal(summary.humanInterventions, 1);
  assert.equal(summary.postPublishBreakages, 1);
  assert.equal(summary.rows.find((row) => row.reason === "startup").slug, null);
});
