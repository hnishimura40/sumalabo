import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  LEDGER_FILE,
  archiveAfterSuccessfulDeploy,
  markAdopted,
  markGenerated,
  markInspection,
  pruneExpiredArchives,
} from "./image-output-lifecycle.mjs";

function fixture(slug) {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-image-lifecycle-"));
  const source = path.join(root, slug);
  const adopted = path.join(root, "repo-assets", `${slug}.webp`);
  mkdirSync(source, { recursive: true });
  mkdirSync(path.dirname(adopted), { recursive: true });
  const png = path.join(source, "thumbnail.png");
  writeFileSync(png, "generated-png");
  writeFileSync(adopted, "adopted-webp");
  return { root, source, adopted, png };
}

test("generated -> inspected -> adopted -> deployed moves output and records deletion", () => {
  const slug = "202607-lifecycle-standing-test";
  const f = fixture(slug);
  markGenerated(slug, [{ id: "thumbnail", path: f.png, width: 1600, height: 900, sha256: "abc", bytes: 13 }], { root: f.root });
  markInspection(slug, { pass: true, source: "standing-test" }, { root: f.root });
  markAdopted(slug, [f.adopted], { root: f.root });

  const archived = archiveAfterSuccessfulDeploy({
    slug,
    root: f.root,
    now: new Date("2026-07-20T00:00:00.000Z"),
    deploymentProof: { ok: true, verifyStatus: "ok", postPublishStatus: "ok" },
  });
  assert.equal(archived.status, "archived");
  assert.equal(existsSync(f.source), false);
  assert.equal(existsSync(archived.destination), true);

  const pruned = pruneExpiredArchives({ root: f.root, now: new Date("2026-08-20T00:00:01.000Z") });
  assert.equal(pruned.deleted.length, 1);
  assert.equal(existsSync(archived.destination), false);
  const actions = readFileSync(path.join(f.root, LEDGER_FILE), "utf8");
  assert.match(actions, /archive_moved/);
  assert.match(actions, /archive_expired_deleted/);
});

test("failed inspection or unverified deploy leaves the working folder untouched", () => {
  const slug = "202607-lifecycle-safety-test";
  const f = fixture(slug);
  markGenerated(slug, [{ id: "thumbnail", path: f.png, width: 1600, height: 900, sha256: "abc", bytes: 13 }], { root: f.root });
  markInspection(slug, { pass: false, source: "standing-test" }, { root: f.root });
  markAdopted(slug, [f.adopted], { root: f.root });
  const failedInspection = archiveAfterSuccessfulDeploy({
    slug,
    root: f.root,
    deploymentProof: { ok: true, verifyStatus: "ok", postPublishStatus: "ok" },
  });
  assert.equal(failedInspection.reason, "inspection_not_passed");
  assert.equal(existsSync(f.source), true);

  markInspection(slug, { pass: true, source: "standing-test" }, { root: f.root });
  const failedDeploy = archiveAfterSuccessfulDeploy({
    slug,
    root: f.root,
    deploymentProof: { ok: false, verifyStatus: "failed" },
  });
  assert.equal(failedDeploy.reason, "deployment_not_verified");
  assert.equal(existsSync(f.source), true);
});

