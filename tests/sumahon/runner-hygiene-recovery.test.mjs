import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { recoverRunnerHygieneArtifacts } from "../../scripts/automation/runner-hygiene-recovery.mjs";

function fixture() {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-hygiene-root-"));
  const outputRoot = mkdtempSync(path.join(os.tmpdir(), "sumalabo-hygiene-output-"));
  mkdirSync(path.join(root, "config"), { recursive: true });
  writeFileSync(path.join(root, "config", "night-environment.json"), JSON.stringify({
    runnerHygiene: {
      failureRecoveryRoot: outputRoot,
      harmlessUntrackedAllowlist: ["drafts/refinement/"],
    },
  }));
  return { root, outputRoot };
}

test("unexpected runner-root image is moved outside the repository with hash verification", () => {
  const { root, outputRoot } = fixture();
  const relative = ".codex-image-contact.png";
  const source = path.join(root, relative);
  writeFileSync(source, "contact-sheet-binary-placeholder\n");
  const hygieneReader = () => existsSync(source)
    ? { ok: false, reason: "runner_clone_dirty", harmless: [], dangerous: [`?? ${relative}`] }
    : { ok: true, reason: "runner_clean", harmless: [], dangerous: [] };
  const result = recoverRunnerHygieneArtifacts({
    root,
    outputRoot,
    runId: "20260828T043001.675",
    hygieneReader,
    untrackedReader: () => [relative],
  });
  assert.equal(result.ok, true);
  assert.equal(result.recovered, true);
  assert.equal(result.allHashesMatched, true);
  assert.deepEqual(result.movedPaths, [relative]);
  assert.equal(existsSync(source), false);
  assert.equal(existsSync(path.join(result.recoveryRoot, relative)), true);
  const manifest = JSON.parse(readFileSync(result.manifestPath, "utf8"));
  assert.equal(manifest.files[0].matches, true);
  assert.match(result.recoveryRoot, /runner-hygiene[/\\]20260828[/\\]20260828T043001\.675/);
});

test("tracked or modified runner paths are never moved automatically", () => {
  const { root, outputRoot } = fixture();
  const tracked = path.join(root, "scripts", "automation", "night-run.ps1");
  mkdirSync(path.dirname(tracked), { recursive: true });
  writeFileSync(tracked, "preserve\n");
  const result = recoverRunnerHygieneArtifacts({
    root,
    outputRoot,
    runId: "20260828T043001.675",
    hygieneReader: () => ({ ok: false, reason: "runner_clone_dirty", harmless: [], dangerous: [" M scripts/automation/night-run.ps1"] }),
    untrackedReader: () => [],
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "tracked_or_modified_runner_paths");
  assert.equal(readFileSync(tracked, "utf8"), "preserve\n");
});
