import test from "node:test";
import assert from "node:assert/strict";
import { CHECK_NAMES, evaluateEnvironmentEvidence, parseDomEvidenceText } from "../../scripts/automation/night-environment-check.mjs";

const passing = Object.fromEntries(CHECK_NAMES.map((name) => [name, { ok: true, detail: "test" }]));

test("night environment contract accepts every required item", () => {
  const result = evaluateEnvironmentEvidence(passing);
  assert.equal(result.ok, true);
  assert.deepEqual(result.failedChecks, []);
});

for (const name of CHECK_NAMES) {
  test(`night environment fails closed when ${name} is missing`, () => {
    const result = evaluateEnvironmentEvidence(passing, [name]);
    assert.equal(result.ok, false);
    assert.deepEqual(result.failedChecks, [name]);
  });
}

test("DOM evidence uses the final JSON line and ignores the prompt example", () => {
  const evidence = [
    "prompt example:",
    '{"domRead":true,"url":"https://x.com/home","accountHref":"/suma_labo","hrefCount":1}',
    "runner output:",
    '{"domRead":false,"url":"https://x.com/home","accountHref":"/suma_labo","hrefCount":0}',
  ].join("\n");
  assert.deepEqual(parseDomEvidenceText(evidence), {
    domRead: false,
    url: "https://x.com/home",
    accountHref: "/suma_labo",
    hrefCount: 0,
  });
});
