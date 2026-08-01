import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isMeasurementActive, recordMeasurementRun, summarizeMeasurement } from "../../scripts/automation/unattended-measurement.mjs";

test("7日間だけ計測を有効化する", () => {
  const config = { active: true, startAt: "2026-08-01T00:00:00+09:00", endAt: "2026-08-08T00:00:00+09:00" };
  assert.equal(isMeasurementActive(config, new Date("2026-08-07T23:59:59+09:00")), true);
  assert.equal(isMeasurementActive(config, new Date("2026-08-08T00:00:00+09:00")), false);
});

test("無人完走率・介入・公開後破綻を集計する", () => {
  const root = mkdtempSync(join(tmpdir(), "measurement-"));
  mkdirSync(join(root, "data", "automation"), { recursive: true });
  writeFileSync(join(root, "data", "automation", "measurement.json"), JSON.stringify({ active: true, startAt: "2026-08-01T00:00:00Z", endAt: "2026-08-08T00:00:00Z" }));
  recordMeasurementRun({ slug: "a", recordedAt: "2026-08-02T00:00:00Z", unattendedCompleted: true, humanIntervention: false, postPublishBreakages: 0 }, root);
  recordMeasurementRun({ slug: "b", recordedAt: "2026-08-03T00:00:00Z", unattendedCompleted: false, humanIntervention: true, postPublishBreakages: 1 }, root);
  const summary = summarizeMeasurement(root);
  assert.equal(summary.totalRuns, 2);
  assert.equal(summary.unattendedCompletionRate, 0.5);
  assert.equal(summary.humanInterventions, 1);
  assert.equal(summary.postPublishBreakages, 1);
});
