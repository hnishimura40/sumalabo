import test from "node:test";
import assert from "node:assert/strict";
import { parseCliArgs } from "../../scripts/automation/night-process-runner.mjs";

test("night process runner parses required file arguments", () => {
  const parsed = parseCliArgs(["--prompt-file", "prompt.md", "--args-file", "args.json", "--output-file", "out.log", "--state-file", "run.lock"]);
  assert.equal(parsed["prompt-file"], "prompt.md");
  assert.equal(parsed["state-file"], "run.lock");
});

test("night process runner rejects missing required arguments", () => {
  assert.throws(() => parseCliArgs(["--prompt-file", "prompt.md"]), /missing --args-file/);
});
