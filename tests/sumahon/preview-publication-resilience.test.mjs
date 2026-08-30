import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { waitForCloudflarePagesDeployment } from "../../scripts/sumahon/cloudflare-pages-deploy.mjs";
import {
  previewBuildNowFromMdx,
  recordPendingPublish,
  waitForPreviewUrl,
} from "../../scripts/sumahon/preview-publication.mjs";
import { finalizeRunnerState } from "../../scripts/automation/runner-hygiene-recovery.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("preview build clock includes a target whose publishAt is still in the future", () => {
  const now = new Date("2026-08-29T20:08:00.000Z");
  const mdx = `---\npublishAt: "2026-08-30T13:30:00+09:00"\n---\n`;
  assert.equal(previewBuildNowFromMdx(mdx, now), "2026-08-30T04:30:01.000Z");
  assert.equal(previewBuildNowFromMdx("---\npublishAt: 2026-08-29T04:30:00Z\n---", now), now.toISOString());
});

test("preview HTTP verification uses an elapsed-time budget instead of a fixed attempt count", async () => {
  let clock = 0;
  let calls = 0;
  const result = await waitForPreviewUrl({
    verify: async () => (++calls === 4 ? { ok: true, status: 200 } : { ok: false, status: 404, reason: "http_404" }),
    url: "https://abc12345.sumalabo.pages.dev/articles/202608-resilience/",
    slug: "202608-resilience",
    intervalMs: 15_000,
    maxWaitMs: 600_000,
    now: () => clock,
    sleep: async (ms) => { clock += ms; },
  });
  assert.equal(result.ok, true);
  assert.equal(result.attempts, 4);
  assert.equal(result.elapsedMs, 45_000);
});

test("Cloudflare deployment polling binds the URL to deployment ID, branch, commit, and success status", async () => {
  const deployment = {
    id: "623a051f-3cdb-4785-b9eb-ce5a44251d2b",
    short_id: "623a051f",
    url: "https://623a051f.sumalabo.pages.dev",
    environment: "preview",
    created_on: "2026-08-29T20:08:28.706879Z",
    modified_on: "2026-08-29T20:08:30.721413Z",
    latest_stage: { name: "deploy", status: "success", ended_on: "2026-08-29T20:08:30.721413Z" },
    deployment_trigger: { metadata: { branch: "preview/202608-20-his-esim-mvno", commit_hash: "2b0873a" } },
  };
  const fetchImpl = async (url) => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, result: String(url).includes("deployments?") ? [deployment] : deployment }),
  });
  const result = await waitForCloudflarePagesDeployment({
    previewUrl: deployment.url,
    branch: "preview/202608-20-his-esim-mvno",
    commitHash: "2b0873a",
    accountId: "account",
    token: "token",
    fetchImpl,
  });
  assert.equal(result.ok, true);
  assert.equal(result.deployment.id, deployment.id);
  assert.equal(result.deployment.status, "success");
  assert.equal(result.deployment.branch, "preview/202608-20-his-esim-mvno");
});

test("failed preview verification writes a resumable pending record outside the repository", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "sumalabo-pending-publish-"));
  const stateFile = path.join(directory, "pending-publish.json");
  const slug = "202608-pending-resilience";
  const result = recordPendingPublish({
    root: ROOT,
    stateFile,
    slug,
    branch: `preview/${slug}`,
    commitSha: "abcdef",
    reason: "http_404",
    status: 404,
    deployment: { id: "deployment-id", status: "success" },
  });
  const saved = JSON.parse(readFileSync(result.stateFile, "utf8"));
  assert.equal(saved.items[slug].state, "pending");
  assert.equal(saved.items[slug].preview.deploymentId, "deployment-id");
  assert.match(saved.items[slug].resumeCommand, /--resume-pending --slug 202608-pending-resilience$/);
  assert.deepEqual(saved.items[slug].artifactPaths, [
    `content/articles/${slug}.mdx`,
    `public/images/articles/${slug}`,
    `public/images/thumbnails/${slug}.webp`,
    `drafts/refinement/${slug}`,
  ]);
});

test("runner finalization always performs branch restoration after hygiene", () => {
  const result = finalizeRunnerState({
    root: "X:\\fixture",
    runId: "20260830T043001.790",
    hygieneRecovery: () => ({ ok: true, recovered: false, reason: "runner_already_clean", hygiene: { ok: true } }),
    branchRestorer: () => ({ ok: true, reason: "runner_clean_origin_main_detached", detached: true, head: "abc", originMain: "abc", hygiene: { ok: true } }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.branchRestoration.detached, true);
  assert.equal(result.branchRestoration.head, result.branchRestoration.originMain);
});

test("night configuration declares the 10-minute HTTP budget and deployment polling", () => {
  const environment = JSON.parse(readFileSync(path.join(ROOT, "config", "night-environment.json"), "utf8"));
  assert.deepEqual(environment.previewVerification, {
    deploymentPollIntervalSeconds: 5,
    deploymentMaxWaitSeconds: 180,
    httpRetryIntervalSeconds: 15,
    httpMaxWaitSeconds: 600,
  });
  assert.equal(environment.pendingPublish.pathTemplate, "%USERPROFILE%\\.sumalabo\\state\\pending-publish.json");
});
