import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeHandoffFailure, recoverFailedRunArtifacts } from "./night-failure-recovery.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SLUG = "202608-chatgpt-gemini-ai-bygmo-pr-times";
const STARTED_AT = "2026-08-24T19:30:02.456Z";
const RUN_ID = "20260825T043002.456";

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-night-recovery-"));
  const paths = [
    `content/articles/${SLUG}.mdx`,
    `public/images/articles/${SLUG}/slide01.webp`,
    `public/images/thumbnails/${SLUG}.webp`,
    `drafts/refinement/${SLUG}/final_article.md`,
  ];
  for (const relative of paths) {
    const file = path.join(root, ...relative.split("/"));
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, `preserve:${relative}\n`, "utf8");
  }
  const handoff = {
    schemaVersion: 1,
    slug: SLUG,
    branch: `preview/${SLUG}`,
    paths: [
      `content/articles/${SLUG}.mdx`,
      `public/images/articles/${SLUG}`,
      `public/images/thumbnails/${SLUG}.webp`,
      `drafts/refinement/${SLUG}`,
    ],
    createdAt: "2026-08-24T20:06:46.785Z",
    status: "failed",
    errorReason: "image_hand_gate_failed_after_targeted_retry; workshop_fallback_unavailable",
    failedChecks: ["thumbnail:thumbnail-hand3", "slide06:hand4"],
  };
  const handoffFile = path.join(root, "logs", "article", `${SLUG}.publish-handoff.json`);
  mkdirSync(path.dirname(handoffFile), { recursive: true });
  writeFileSync(handoffFile, JSON.stringify(handoff), "utf8");
  return { root, paths };
}

test("image hand gate failure is recorded as the real image quality failure", () => {
  const result = normalizeHandoffFailure({
    slug: SLUG,
    errorReason: "image_hand_gate_failed_after_targeted_retry; workshop_fallback_unavailable",
    failedChecks: ["thumbnail:thumbnail-hand3"],
  });
  assert.equal(result.reason, "image_quality_gate_failed");
  assert.match(result.detail, /thumbnail-hand3/);
});

test("failed run artifacts move to a unique recovery directory without hash loss", () => {
  const { root, paths } = fixture();
  const outputRoot = mkdtempSync(path.join(os.tmpdir(), "sumalabo-night-output-"));
  const result = recoverFailedRunArtifacts({
    root,
    runId: RUN_ID,
    startedAt: STARTED_AT,
    outputRoot,
    statusReader: (_root, relativePaths) => relativePaths.map((relative) => `?? ${relative}`),
    hygieneReader: () => ({ ok: true, reason: "runner_clean", dangerous: [] }),
    preflightRunner: () => ({ exitCode: 0, evidence: { canProceed: true, classification: "warning" }, stderr: "" }),
  });
  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.equal(result.fileCount, 4);
  assert.equal(result.allHashesMatched, true);
  assert.match(result.recoveryRoot, new RegExp(`${SLUG}[/\\\\]recovery-20260825-`));
  for (const relative of paths) {
    assert.equal(existsSync(path.join(root, ...relative.split("/"))), false);
    assert.equal(existsSync(path.join(result.recoveryRoot, ...relative.split("/"))), true);
  }
  const manifest = JSON.parse(readFileSync(result.manifestPath, "utf8"));
  assert.equal(manifest.allHashesMatched, true);
  assert.equal(manifest.preflight.exitCode, 0);
});

test("recovery refuses tracked or modified article paths", () => {
  const { root, paths } = fixture();
  assert.throws(() => recoverFailedRunArtifacts({
    root,
    runId: RUN_ID,
    startedAt: STARTED_AT,
    outputRoot: mkdtempSync(path.join(os.tmpdir(), "sumalabo-night-output-")),
    statusReader: () => [` M content/articles/${SLUG}.mdx`],
    hygieneReader: () => ({ ok: true, dangerous: [] }),
    preflightRunner: () => ({ exitCode: 0, evidence: { canProceed: true } }),
  }), /refusing to move tracked or modified paths/);
  for (const relative of paths) assert.equal(existsSync(path.join(root, ...relative.split("/"))), true);
});

test("night wrapper omits the slug flag until a real slug exists", () => {
  const source = readFileSync(path.join(HERE, "night-run.ps1"), "utf8");
  assert.match(source, /\$contractArgs = @\(\$ContractScript, 'evaluate', '--run-id', \$RunId, '--started-at', \$RunStartedAt\)/);
  assert.match(source, /if \(\$publishSlug\) \{ \$contractArgs \+= @\('--slug', \[string\]\$publishSlug\) \}/);
  assert.doesNotMatch(source, /'--slug', \$publishSlug\)/);
});
