#!/usr/bin/env node
import process from "node:process";
import { reclassifyIncidentForErrorBudget } from "./autonomy.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    const key = argv[i].slice(2);
    const value = argv[i + 1];
    if (value == null || value.startsWith("--")) out[key] = true;
    else { out[key] = value; i += 1; }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.slug || !args["recovered-at"] || !args["evidence-report"]) {
  console.error("usage: node scripts/automation/incident-reclassify.mjs --slug <slug> --classification external_propagation_delay|external_api_overload|verification_false_positive --recovered-at <ISO> --evidence-report <path> --failed-checks <comma-separated> --recovery-minutes <n> --same-content --no-rollback --no-retract --no-x-delete");
  process.exitCode = 2;
} else {
  const result = reclassifyIncidentForErrorBudget({
    slug: args.slug,
    classification: args.classification || "external_propagation_delay",
    evidence: {
      recoveredAt: args["recovered-at"],
      evidenceReport: args["evidence-report"],
      failedChecks: String(args["failed-checks"] || "").split(",").map((x) => x.trim()).filter(Boolean),
      recoveryMinutes: Number(args["recovery-minutes"]),
      sameContent: args["same-content"] === true,
      rollbackInvoked: args["no-rollback"] === true ? false : null,
      retractRequired: args["no-retract"] === true ? false : null,
      xDeletionRequired: args["no-x-delete"] === true ? false : null,
    },
  });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 3;
}
