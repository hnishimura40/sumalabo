import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { allowedPaths, dryRun } from "../../scripts/automation/phase-a-outer-publish.mjs";

test("workspace gate keeps article checks while full alone requires committed drafts", () => {
  const gate = readFileSync(new URL("../../scripts/sumalabo-gate.mjs", import.meta.url), "utf8");
  assert.match(gate, /if \(stage === "full"\) \{\s+checkDraftsCommitted\(slug\);/);
  assert.match(gate, /if \(stage === "workspace" \|\| stage === "full"\) \{[\s\S]*?checkMdxStage[\s\S]*?checkImageStage[\s\S]*?checkAffiliate[\s\S]*?checkDistOgp[\s\S]*?checkDistRawMarkdown/);
  const prompt = readFileSync(new URL("../../docs/night_driver_prompt.md", import.meta.url), "utf8");
  assert.match(prompt, /--stage workspace/);
  assert.match(prompt, /コミット後、push前に`--stage full`/);
});

test("both outer publication paths stop on full gate failure before push", () => {
  const source = readFileSync(new URL("../../scripts/automation/phase-a-outer-publish.mjs", import.meta.url), "utf8");
  const publish = source.slice(source.indexOf("async function publish("), source.indexOf("async function resumePending("));
  const resume = source.slice(source.indexOf("async function resumePending("), source.indexOf("async function main("));
  for (const [body, reason] of [[publish, "full_article_gate_failed"], [resume, "resume_full_article_gate_failed"]]) {
    const commit = body.indexOf('["commit",');
    const gate = body.indexOf('"sumalabo-gate.mjs"');
    const push = body.indexOf('["push",');
    assert.ok(commit >= 0 && commit < gate && gate < push);
    assert.ok(body.slice(gate, push).includes(`if (r.status !== 0) throw new Error("${reason}")`));
    assert.match(body.slice(gate, push), /security:scan/);
    assert.match(body.slice(gate, push), /"--stage", "full"/);
  }
});

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
