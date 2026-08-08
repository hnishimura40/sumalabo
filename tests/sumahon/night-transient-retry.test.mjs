import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifyTransientFailure, runIsolated } from "../../scripts/automation/night-process-runner.mjs";

test("一過性だけを再試行対象に分類する", () => {
  assert.deepEqual(classifyTransientFailure("API overloaded (529)"), { transient: true, kind: "overloaded" });
  assert.deepEqual(classifyTransientFailure("rate limit exceeded"), { transient: true, kind: "rate_limit" });
  assert.deepEqual(classifyTransientFailure("request timed out"), { transient: true, kind: "timeout" });
  assert.equal(classifyTransientFailure("quality gate failed").transient, false);
});

test("一過性失敗は待機後1回だけ再試行して成功する", async () => {
  const dir = mkdtempSync(join(tmpdir(), "night-retry-"));
  const prompt = join(dir, "prompt.md");
  const args = join(dir, "args.json");
  const output = join(dir, "out.log");
  const state = join(dir, "state.json");
  const helper = join(dir, "helper.mjs");
  const count = join(dir, "count.txt");
  writeFileSync(prompt, "test");
  writeFileSync(args, JSON.stringify([helper, count]));
  writeFileSync(helper, [
    'import fs from "node:fs";',
    'const p=process.argv[2];',
    'const n=fs.existsSync(p)?Number(fs.readFileSync(p,"utf8")):0;',
    'fs.writeFileSync(p,String(n+1));',
    'if(n===0){console.error("API overloaded 529");process.exit(1)}',
    'console.log("ok");',
  ].join("\n"));
  const code = await runIsolated({
    "prompt-file": prompt, "args-file": args, "output-file": output,
    "state-file": state, "agent-exe": process.execPath,
    "heartbeat-ms": "5", "retry-delay-ms": "0",
  });
  assert.equal(code, 0);
  assert.equal(readFileSync(count, "utf8"), "2");
  const final = JSON.parse(readFileSync(state, "utf8"));
  assert.equal(final.status, "completed");
  assert.equal(final.retriesUsed, 1);
});

test("恒久エラーは再試行しない", async () => {
  const dir = mkdtempSync(join(tmpdir(), "night-no-retry-"));
  const prompt = join(dir, "prompt.md");
  const args = join(dir, "args.json");
  const output = join(dir, "out.log");
  const state = join(dir, "state.json");
  const helper = join(dir, "helper.mjs");
  const count = join(dir, "count.txt");
  writeFileSync(prompt, "test");
  writeFileSync(args, JSON.stringify([helper, count]));
  writeFileSync(helper, 'import fs from "node:fs";const p=process.argv[2];fs.writeFileSync(p,"1");console.error("quality gate failed");process.exit(1)');
  const code = await runIsolated({
    "prompt-file": prompt, "args-file": args, "output-file": output,
    "state-file": state, "agent-exe": process.execPath,
    "heartbeat-ms": "5", "retry-delay-ms": "0",
  });
  assert.equal(code, 1);
  assert.equal(readFileSync(count, "utf8"), "1");
  assert.equal(JSON.parse(readFileSync(state, "utf8")).retriesUsed, 0);
});
