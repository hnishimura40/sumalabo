// tests/sumahon/slide-driver.test.mjs
//
// PR-B driver scripts (scripts/run/slide-*.mjs) の dry-run 単体テスト。
// 実 orchestrator を呼ばず、driver を spawn して artifact が正しく書き出される
// ことだけを確認する。
//
// 検証:
//   - slide-plan-finalize: understanding + draft → slide-plan.json 出力
//   - slide-prompts-batch: slide-plan → 全 slide の prompt md 出力
//   - slide-factcheck-prompt-build: 全 slide ぶん factcheck-prompt.md 出力
//   - slide-revision-prompts-build: factcheck.json から needs_revision を読み
//                                   revision-prompts/{id}.md 出力
//
// テスト後、tmp ディレクトリは自動削除する。

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { generateArticleUnderstanding } from "../../scripts/sumahon/generate-article-understanding.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ------------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------------

const APPLE_BRIEF = {
  slug: "test-slide-driver-apple-pendant",
  articleTitle: "Apple、超小型AIペンダント開発か",
  sourceTitle: "Apple、超小型AIペンダント開発か",
  coreAngle: "Apple が AI を身につける方向へ広げるか",
  topicCategory: "AI",
  articleType: "news",
};
const APPLE_SOURCE = { title: "Apple、超小型AIペンダント開発か", keyPoints: [] };

const SHORT_ALERT_BRIEF = {
  slug: "test-slide-driver-short-alert",
  articleTitle: "速報：Foo β 配信開始",
  sourceTitle: "速報：Foo β 配信開始",
  coreAngle: "",
  topicCategory: "general",
  articleType: "news",
};
const SHORT_ALERT_SOURCE = { title: "速報：Foo β 配信開始", keyPoints: [] };

// ------------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------------

function mkTmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "slide-driver-"));
}

function writeUnderstanding(tmpDir, brief, source) {
  const u = generateArticleUnderstanding({ articleBrief: brief, source });
  const p = path.join(tmpDir, "understanding.json");
  fs.writeFileSync(p, JSON.stringify(u, null, 2), "utf-8");
  return p;
}

function runDriver(scriptRelPath, args) {
  const fullScript = path.join(projectRoot, scriptRelPath);
  const r = spawnSync(process.execPath, [fullScript, ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout.trim().split("\n").pop() || "{}");
  } catch {}
  return { exit: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

function cleanupTmp(tmpDir) {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

function ensureProjectSlideDirCleanedUp(slug) {
  const p = path.join(projectRoot, "drafts", "slides", slug);
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {}
}

// ------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------

test("slide-plan-finalize: writes slide-plan.json for Apple-like brief", () => {
  const slug = APPLE_BRIEF.slug;
  const tmp = mkTmp();
  ensureProjectSlideDirCleanedUp(slug);
  try {
    const upath = writeUnderstanding(tmp, APPLE_BRIEF, APPLE_SOURCE);
    const r = runDriver("scripts/run/slide-plan-finalize.mjs", [
      "--slug", slug,
      "--understanding", upath,
    ]);
    assert.equal(r.exit, 0, `driver exit ${r.exit} stderr=${r.stderr}`);
    assert.ok(r.json && r.json.ok, "driver should report ok");
    const planPath = path.join(projectRoot, r.json.slidePlanPath);
    assert.ok(fs.existsSync(planPath), `slide-plan.json should exist at ${planPath}`);
    const plan = JSON.parse(fs.readFileSync(planPath, "utf-8"));
    assert.equal(plan.slug, slug);
    assert.equal(plan.slideNeeded, true);
    assert.ok(plan.count >= 2 && plan.count <= 8);
    assert.ok(Array.isArray(plan.slides) && plan.slides.length === plan.count);
  } finally {
    cleanupTmp(tmp);
    ensureProjectSlideDirCleanedUp(slug);
  }
});

test("slide-plan-finalize: short alert produces slideNeeded=false, count=0", () => {
  const slug = SHORT_ALERT_BRIEF.slug;
  const tmp = mkTmp();
  ensureProjectSlideDirCleanedUp(slug);
  try {
    const upath = writeUnderstanding(tmp, SHORT_ALERT_BRIEF, SHORT_ALERT_SOURCE);
    const r = runDriver("scripts/run/slide-plan-finalize.mjs", [
      "--slug", slug,
      "--understanding", upath,
    ]);
    assert.equal(r.exit, 0, `driver exit ${r.exit}`);
    assert.ok(r.json && r.json.ok);
    const planPath = path.join(projectRoot, r.json.slidePlanPath);
    const plan = JSON.parse(fs.readFileSync(planPath, "utf-8"));
    assert.equal(plan.slideNeeded, false);
    assert.equal(plan.count, 0);
  } finally {
    cleanupTmp(tmp);
    ensureProjectSlideDirCleanedUp(slug);
  }
});

test("slide-prompts-batch: writes one prompt md per slide", () => {
  const slug = APPLE_BRIEF.slug;
  const tmp = mkTmp();
  ensureProjectSlideDirCleanedUp(slug);
  try {
    const upath = writeUnderstanding(tmp, APPLE_BRIEF, APPLE_SOURCE);
    // first generate plan
    const planRes = runDriver("scripts/run/slide-plan-finalize.mjs", [
      "--slug", slug,
      "--understanding", upath,
    ]);
    const planPath = path.join(projectRoot, planRes.json.slidePlanPath);

    // batch prompts
    const r = runDriver("scripts/run/slide-prompts-batch.mjs", [
      "--slug", slug,
      "--understanding", upath,
      "--plan", planPath,
    ]);
    assert.equal(r.exit, 0, `prompts-batch exit ${r.exit} stderr=${r.stderr}`);
    assert.ok(r.json && r.json.ok);
    const promptDir = path.join(projectRoot, r.json.slidePromptDir);
    assert.ok(fs.existsSync(promptDir));
    const files = fs.readdirSync(promptDir).filter((f) => f.endsWith(".md"));
    assert.equal(files.length, r.json.count, "one prompt md per slide");
    // verify per-prompt content has ひまり / らぼまる
    for (const f of files) {
      const txt = fs.readFileSync(path.join(promptDir, f), "utf-8");
      assert.ok(txt.includes("ひまり"), `prompt ${f} must mention ひまり`);
      assert.ok(txt.includes("らぼまる"), `prompt ${f} must mention らぼまる`);
    }
  } finally {
    cleanupTmp(tmp);
    ensureProjectSlideDirCleanedUp(slug);
  }
});

test("slide-factcheck-prompt-build: writes factcheck-prompt.md", () => {
  const slug = APPLE_BRIEF.slug;
  const tmp = mkTmp();
  ensureProjectSlideDirCleanedUp(slug);
  try {
    const upath = writeUnderstanding(tmp, APPLE_BRIEF, APPLE_SOURCE);
    const planRes = runDriver("scripts/run/slide-plan-finalize.mjs", [
      "--slug", slug,
      "--understanding", upath,
    ]);
    const planPath = path.join(projectRoot, planRes.json.slidePlanPath);

    const r = runDriver("scripts/run/slide-factcheck-prompt-build.mjs", [
      "--slug", slug,
      "--understanding", upath,
      "--plan", planPath,
    ]);
    assert.equal(r.exit, 0, `factcheck-build exit ${r.exit} stderr=${r.stderr}`);
    assert.ok(r.json && r.json.ok);
    const out = path.join(projectRoot, r.json.factcheckPromptPath);
    assert.ok(fs.existsSync(out));
    const txt = fs.readFileSync(out, "utf-8");
    // 9 check 番号があること
    for (let i = 1; i <= 9; i++) {
      assert.ok(txt.includes(`${i}.`), `factcheck prompt must mention check ${i}`);
    }
  } finally {
    cleanupTmp(tmp);
    ensureProjectSlideDirCleanedUp(slug);
  }
});

test("slide-revision-prompts-build: writes revision md only for needs_revision verdicts", () => {
  const slug = APPLE_BRIEF.slug;
  const tmp = mkTmp();
  ensureProjectSlideDirCleanedUp(slug);
  try {
    const upath = writeUnderstanding(tmp, APPLE_BRIEF, APPLE_SOURCE);
    const planRes = runDriver("scripts/run/slide-plan-finalize.mjs", [
      "--slug", slug,
      "--understanding", upath,
    ]);
    const planPath = path.join(projectRoot, planRes.json.slidePlanPath);
    const plan = JSON.parse(fs.readFileSync(planPath, "utf-8"));

    // synthesize a factcheck.json with the first slide flagged needs_revision,
    // the rest ok
    const fc = {
      slides: plan.slides.map((s, i) => ({
        id: s.id,
        verdict: i === 0 ? "needs_revision" : "ok",
        issues: i === 0 ? ["text too dense"] : [],
        revisionHint: i === 0 ? "大見出しを1つに絞る" : undefined,
      })),
    };
    const fcPath = path.join(tmp, "factcheck.json");
    fs.writeFileSync(fcPath, JSON.stringify(fc), "utf-8");

    const r = runDriver("scripts/run/slide-revision-prompts-build.mjs", [
      "--slug", slug,
      "--understanding", upath,
      "--plan", planPath,
      "--factcheck", fcPath,
    ]);
    assert.equal(r.exit, 0, `revision-build exit ${r.exit} stderr=${r.stderr}`);
    assert.ok(r.json && r.json.ok);
    assert.equal(r.json.revisionsNeeded, 1, "only one slide should require revision");
    const revDir = path.join(projectRoot, r.json.revisionPromptDir);
    const revFiles = fs.readdirSync(revDir).filter((f) => f.endsWith(".md"));
    assert.equal(revFiles.length, 1);
  } finally {
    cleanupTmp(tmp);
    ensureProjectSlideDirCleanedUp(slug);
  }
});
