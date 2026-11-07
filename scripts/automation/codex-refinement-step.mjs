#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { NIGHT_ENVIRONMENT, SOURCE_ROOT } from "./night-environment.mjs";
import { CHATGPT_OUTPUTS, currentStep } from "./phase-a-orchestrator.mjs";

function main() {
  const { values } = parseArgs({
    options: {
      slug: { type: "string" },
      step: { type: "string" },
      prompt: { type: "string" },
      attempt: { type: "string", default: "1" },
    },
  });
  const { slug, step, prompt, attempt } = values;
  const runId = process.env.SUMALABO_NIGHT_RUN_ID || "";
  if (!/^20\d{6}T\d{6}\.\d{3}$/.test(runId) || !/^20\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || "")
      || !Object.hasOwn(CHATGPT_OUTPUTS, step) || !prompt || !["1", "2"].includes(attempt)) {
    throw new Error("night_refinement_run_slug_step_prompt_or_attempt_invalid");
  }

  const logBase = path.join(SOURCE_ROOT, "logs", "article", slug);
  const state = JSON.parse(readFileSync(`${logBase}.state.json`, "utf8"));
  const pending = currentStep(state);
  if (state.slug !== slug || state.halted || pending?.name !== step) throw new Error("night_refinement_step_not_pending");

  const runBase = `${logBase}.${step}.${runId}`;
  const report = `${runBase}.health.json`;
  if (attempt === "2") {
    const previous = JSON.parse(readFileSync(report, "utf8"));
    if (previous.healthy !== false || previous.attempt !== 1 || previous.step !== step) {
      throw new Error("night_refinement_retry_not_eligible");
    }
  }

  const promptText = readFileSync(prompt, "utf8").replace(/^\uFEFF/, "").trim();
  if (!promptText) throw new Error("night_refinement_prompt_empty");
  const events = `${runBase}.attempt${attempt}.codex.jsonl`;
  writeFileSync(events, "", { encoding: "utf8", flag: "wx" });
  const args = [
    "--ask-for-approval", "never", "exec", "--ephemeral", "--json", "--sandbox", "read-only",
    "--skip-git-repo-check", "--color", "never", "--model", "gpt-6.1-sol",
    "-c", 'model_reasoning_effort="high"', "-C", SOURCE_ROOT, "-",
  ];
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) =>
    !/^(?:GH_TOKEN(?:_EXPIRES_AT)?|GITHUB_TOKEN)$/i.test(name)));
  const result = spawnSync(NIGHT_ENVIRONMENT.codex.executable, args, {
    cwd: SOURCE_ROOT,
    env,
    input: promptText,
    encoding: "utf8",
    timeout: 300_000,
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  writeFileSync(events, result.stdout || "", "utf8");
  if (result.error || result.status !== 0) {
    throw new Error(`night_refinement_codex_failed:${result.error?.code || result.status}`);
  }

  const output = path.join(SOURCE_ROOT, "drafts", "refinement", slug, CHATGPT_OUTPUTS[step]);
  const health = spawnSync(process.execPath, [
    path.join(SOURCE_ROOT, "scripts", "automation", "chatgpt-response-health.mjs"),
    "--input", events, "--codex-jsonl", "--output", output, "--report", report, "--step", step,
    "--attempt", attempt, "--original-prompt", path.resolve(prompt), "--retry-prompt", `${runBase}.retry.md`,
  ], { cwd: SOURCE_ROOT, env, stdio: "inherit", windowsHide: true });
  if (health.status === 0) console.log(`次へ進むには --advance ${step} --result "${report}"`);
  process.exitCode = health.status ?? 1;
}

try {
  main();
} catch (error) {
  console.error(`[codex-refinement-step] ${error.message}`);
  process.exitCode = 1;
}
