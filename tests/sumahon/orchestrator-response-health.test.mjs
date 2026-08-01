import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SCRIPT = join(ROOT, "scripts", "automation", "phase-a-orchestrator.mjs");
const execFileAsync = promisify(execFile);
const ENV = { ...process.env, ORCH_STUB: "1", REVIEW_NOTIFY_SECRET: "" };

async function orch(args) {
  try {
    const result = await execFileAsync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env: ENV });
    return { status: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return { status: error.code ?? 1, stdout: error.stdout || "", stderr: error.stderr || "" };
  }
}

function paths(slug) {
  return {
    state: join(ROOT, "logs", "article", `${slug}.state.json`),
    report: join(ROOT, "logs", "article", `${slug}.chatgpt_turn1_research.health.json`),
    dir: join(ROOT, "drafts", "refinement", slug),
  };
}

function cleanup(slug) {
  const p = paths(slug);
  rmSync(p.state, { force: true });
  rmSync(p.report, { force: true });
  rmSync(p.dir, { recursive: true, force: true });
}

test("healthy report と成果物が揃った場合だけ ChatGPT 工程を advance する", async () => {
  const slug = "orch-health-pass-not-real";
  cleanup(slug);
  try {
    await orch(["--theme", "health pass", "--slug", slug]);
    const p = paths(slug);
    mkdirSync(p.dir, { recursive: true });
    writeFileSync(join(p.dir, "research_report.md"), "# report\n\n## facts\n\n十分な本文", "utf8");
    writeFileSync(p.report, JSON.stringify({
      step: "chatgpt_turn1_research",
      attempt: 1,
      healthy: true,
      metrics: { proseChars: 1200, bodyBlocks: 8 },
      extraction: { source: "current_node_parent_chain" },
    }), "utf8");
    const result = await orch(["--slug", slug, "--advance", "chatgpt_turn1_research", "--result", p.report]);
    assert.equal(result.status, 10, result.stderr);
    const state = JSON.parse(readFileSync(p.state, "utf8"));
    assert.equal(state.steps.chatgpt_turn1_research.status, "done");
    assert.equal(state.steps.chatgpt_turn1_research.data.extractionSource, "current_node_parent_chain");
  } finally {
    cleanup(slug);
  }
});

test("構造化リトライ後も不健全なら即時 halt する", async () => {
  const slug = "orch-health-halt-not-real";
  cleanup(slug);
  try {
    await orch(["--theme", "health halt", "--slug", slug]);
    const p = paths(slug);
    writeFileSync(p.report, JSON.stringify({
      step: "chatgpt_turn1_research",
      attempt: 2,
      healthy: false,
      reasons: ["prose_chars_too_few:0<600"],
    }), "utf8");
    const result = await orch(["--slug", slug, "--advance", "chatgpt_turn1_research", "--result", p.report]);
    assert.equal(result.status, 20);
    const state = JSON.parse(readFileSync(p.state, "utf8"));
    assert.equal(state.halted, true);
    assert.match(state.haltReason, /unhealthy_after_structured_retry/);
  } finally {
    cleanup(slug);
  }
});
