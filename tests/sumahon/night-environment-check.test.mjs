import test from "node:test";
import assert from "node:assert/strict";
import { CHECK_NAMES, FATAL_CHECK_NAMES, WARNING_CHECK_NAMES, evaluateEnvironmentEvidence, findFirstReadyObservation, parseDomEvidenceText } from "../../scripts/automation/night-environment-check.mjs";

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

test("fatal environment failures stop the article pipeline", () => {
  const result = evaluateEnvironmentEvidence(passing, ["github_token"]);
  assert.equal(result.canProceed, false);
  assert.equal(result.xReady, true);
  assert.deepEqual(result.fatalFailedChecks, ["github_token"]);
  assert.ok(FATAL_CHECK_NAMES.includes("repository_sha"));
});

test("X environment failures warn while allowing the article pipeline", () => {
  const result = evaluateEnvironmentEvidence(passing, ["x_login_href"]);
  assert.equal(result.canProceed, true);
  assert.equal(result.xReady, false);
  assert.deepEqual(result.warningFailedChecks, ["x_login_href"]);
  assert.ok(WARNING_CHECK_NAMES.includes("dom_read"));
});

test("cold-start account href may appear late but still passes inside the 90-second policy", () => {
  const policy = {
    retryIntervalSeconds: 5,
    maxWaitSeconds: 90,
    maxAttempts: 19,
  };
  const visibleAtSeconds = 65;
  const observations = Array.from({ length: policy.maxAttempts }, (_, index) => ({
    atSeconds: (index + 1) * policy.retryIntervalSeconds,
    hrefCount: (index + 1) * policy.retryIntervalSeconds >= visibleAtSeconds ? 1 : 0,
  }));
  const firstReady = findFirstReadyObservation(observations, policy);
  assert.ok(firstReady);
  assert.equal(firstReady.atSeconds, 65);
  assert.ok(firstReady.atSeconds <= policy.maxWaitSeconds);
});
