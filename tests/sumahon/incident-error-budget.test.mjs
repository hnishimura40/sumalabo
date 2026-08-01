import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  incidentConsumesErrorBudget,
  reclassifyIncidentForErrorBudget,
  maybeAutoDemote,
} from "../../scripts/automation/autonomy.mjs";

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "sumalabo-incident-budget-"));
  const file = join(dir, "autonomy.json");
  writeFileSync(file, JSON.stringify({
    level: 1,
    paused: false,
    vetoWindowMinutes: 30,
    promotionCount: { toL1: 1 },
    incidents: [
      { at: "2026-07-27T14:08:47.250Z", slug: "propagation", kind: "post_publish_hard_fail", detail: "articleHttp200,slugInHtml" },
      { at: "2026-07-28T10:00:00.000Z", slug: "real-failure", kind: "post_publish_hard_fail", detail: "hasArticleBody" },
    ],
  }), "utf8");
  return { dir, file };
}

const validEvidence = {
  recoveredAt: "2026-07-27T14:31:04.420Z",
  evidenceReport: "logs/publish/propagation.verify.json",
  failedChecks: ["articleHttp200", "slugInHtml"],
  recoveryMinutes: 22.3,
  sameContent: true,
  rollbackInvoked: false,
  retractRequired: false,
  xDeletionRequired: false,
};

test("後続pass・同一内容・無rollback等を全て満たす伝播遅延だけを非消費にできる", () => {
  const { dir, file } = fixture();
  try {
    const result = reclassifyIncidentForErrorBudget({
      slug: "propagation",
      classification: "external_propagation_delay",
      evidence: validEvidence,
      filePath: file,
      now: "2026-08-01T00:00:00.000Z",
    });
    assert.equal(result.ok, true);
    assert.equal(result.incident.errorBudget.consumes, false);
    assert.equal(incidentConsumesErrorBudget(result.incident), false);
    assert.equal(incidentConsumesErrorBudget({ slug: "real", kind: "post_publish_hard_fail" }), true);
    const state = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(state.incidents.length, 2, "監査履歴は削除しない");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("証跡不足、恒久チェック、30分超の復旧は除外を拒否する", () => {
  for (const evidence of [
    { ...validEvidence, sameContent: false },
    { ...validEvidence, failedChecks: ["hasArticleBody"] },
    { ...validEvidence, recoveryMinutes: 31 },
  ]) {
    const { dir, file } = fixture();
    try {
      const result = reclassifyIncidentForErrorBudget({ slug: "propagation", classification: "external_propagation_delay", evidence, filePath: file });
      assert.equal(result.ok, false);
      assert.equal(JSON.parse(readFileSync(file, "utf8")).incidents[0].errorBudget, undefined);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test("自動降格は非消費incidentを数えない", () => {
  const { dir, file } = fixture();
  try {
    reclassifyIncidentForErrorBudget({ slug: "propagation", classification: "external_propagation_delay", evidence: validEvidence, filePath: file });
    const result = maybeAutoDemote({ recentSlugs: ["propagation", "real-failure"], filePath: file });
    assert.equal(result.demoted, false);
    assert.deepEqual(result.incidentSlugs, ["real-failure"]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
