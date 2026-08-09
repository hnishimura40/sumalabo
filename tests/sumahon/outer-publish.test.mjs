import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { allowedPaths, dryRun } from "../../scripts/automation/phase-a-outer-publish.mjs";

test("outer publisher accepts only canonical article slugs", () => {
  assert.deepEqual(allowedPaths("202608-safe-article"), [
    "content/articles/202608-safe-article.mdx",
    "public/images/articles/202608-safe-article",
    "public/images/thumbnails/202608-safe-article.webp",
    "drafts/refinement/202608-safe-article",
  ]);
  for (const unsafe of ["../escape", "202608-safe;whoami", "main", "202608-UPPER"]) {
    assert.throws(() => allowedPaths(unsafe), /invalid_slug/);
  }
});

test("outer publisher dry-run accepts a fixed-path handoff without a token", () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "sumalabo-outer-publish-"));
  const slug = "202608-outer-fixture";
  spawnSync("git", ["init", "-q"], { cwd: root });
  const paths = allowedPaths(slug);
  for (const rel of [paths[0], path.join(paths[1], "slide.webp"), paths[2], path.join(paths[3], "final_article.md")]) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, "fixture\n");
  }
  const manifest = path.join(root, "logs", "article", `${slug}.publish-handoff.json`);
  mkdirSync(path.dirname(manifest), { recursive: true });
  writeFileSync(manifest, JSON.stringify({ schemaVersion: 1, slug, title: "fixture", branch: `preview/${slug}`, paths, status: "ready" }));
  assert.deepEqual(dryRun(slug, root), { ok: true, slug, branch: `preview/${slug}`, paths, mode: "dry-run" });
});
