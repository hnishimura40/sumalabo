import test from "node:test";
import assert from "node:assert/strict";
import { ARTICLE_CHECK_NAMES, CHECK_NAMES, FATAL_CHECK_NAMES, WARNING_CHECK_NAMES, X_STEP_FATAL_CHECK_NAMES, environmentCheckExitCode, evaluateEnvironmentEvidence, evaluateRepositorySha, evaluateXProfileEvidence, findFirstReadyObservation, parseDomEvidenceText } from "../../scripts/automation/night-environment-check.mjs";

const passing = Object.fromEntries(CHECK_NAMES.map((name) => [name, { ok: true, detail: "test" }]));

test("night environment contract accepts every required item", () => {
  const result = evaluateEnvironmentEvidence(passing);
  assert.equal(result.ok, true);
  assert.deepEqual(result.failedChecks, []);
});

test("repository SHA health compares the runner with origin/main, not the canonical workspace", () => {
  const result = evaluateRepositorySha({
    runnerHead: { ok: true, text: "60cac6b" },
    originMainHead: { ok: true, text: "60cac6b" },
  });
  assert.deepEqual(result, {
    ok: true,
    detail: "runner=60cac6b;origin/main=60cac6b",
  });
});

test("repository SHA health fails when the runner is behind origin/main", () => {
  const result = evaluateRepositorySha({
    runnerHead: { ok: true, text: "3cc6e6c" },
    originMainHead: { ok: true, text: "60cac6b" },
  });
  assert.equal(result.ok, false);
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
  assert.equal(environmentCheckExitCode(result), 0);
});

test("article-only preflight contains no Chrome or X checks", () => {
  assert.deepEqual(ARTICLE_CHECK_NAMES, ["environment_definition", "github_token", "repository_sha", "runner_dirty"]);
  assert.ok(ARTICLE_CHECK_NAMES.every((name) => FATAL_CHECK_NAMES.includes(name)));
  assert.ok(!ARTICLE_CHECK_NAMES.some((name) => /chrome|x_|dom/.test(name)));
});

test("fatal environment failures keep exit code 30", () => {
  assert.equal(environmentCheckExitCode(evaluateEnvironmentEvidence(passing, ["runner_dirty"])), 30);
});

test("X-local profile gate is fatal to posting but independent from the main contract", () => {
  const pass = evaluateXProfileEvidence({
    profileMatched: true,
    profileDetail: "exact_user_data_and_profile_process",
    domRead: true,
    url: "https://x.com/home",
    accountHref: "/suma_labo",
    hrefCount: 2,
  });
  assert.equal(pass.ok, true);
  assert.deepEqual(pass.failedChecks, []);
  assert.deepEqual(X_STEP_FATAL_CHECK_NAMES, ["chrome_profile", "x_login_href", "dom_read"]);

  const mismatch = evaluateXProfileEvidence({
    profileMatched: true,
    domRead: true,
    url: "https://x.com/home",
    accountHref: "/personal_account",
    hrefCount: 1,
  });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.classification, "x_fatal");
  assert.deepEqual(mismatch.failedChecks, ["x_login_href"]);
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
