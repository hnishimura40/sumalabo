// tests/sumahon/orchestrator.test.mjs — Phase A オーケストレータの状態機械テスト。
//
// ChatGPT 操作部は stub 化した dry-run（ORCH_STUB=1）で全遷移を検証する:
//   1. 新規 → script ステップ自動実行 → 最初の assisted で exit 10
//   2. --advance で assisted を進めると次のステップへ（チェックポイント再開）
//   3. 全ステップ完了で exit 0 / COMPLETE
//   4. --fail 2 回でリトライ上限 → exit 20 + halted 保存（無理に進まない）
//   5. factcheck の pass:false は advance 拒否
//   6. 中断→再実行で途中から再開できる（state 永続）

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const SCRIPT = join(ROOT, "scripts", "automation", "phase-a-orchestrator.mjs");
const SLUG = "orch-test-slug-not-real";
const STATE = join(ROOT, "logs", "article", `${SLUG}.state.json`);
const execFileAsync = promisify(execFile);

const ENV = { ...process.env, ORCH_STUB: "1", REVIEW_NOTIFY_SECRET: "" };

async function orch(args) {
  try {
    const r = await execFileAsync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env: ENV, maxBuffer: 10 * 1024 * 1024 });
    return { status: 0, stdout: r.stdout, stderr: r.stderr };
  } catch (e) {
    return { status: e.code ?? 1, stdout: e.stdout || "", stderr: e.stderr || "" };
  }
}

function cleanup() {
  rmSync(STATE, { force: true });
  rmSync(join(ROOT, "logs", "article", `${SLUG}.images.json`), { force: true });
  rmSync(join(ROOT, "logs", "article", `${SLUG}.factcheck.json`), { force: true });
}

test.before(cleanup);
test.after(cleanup);

test("1. 新規開始: script ステップを自動実行し、最初の assisted (Turn1) で exit 10", async () => {
  const r = await orch(["--theme", "テスト用テーマ", "--slug", SLUG]);
  assert.equal(r.status, 10, `stderr=${r.stderr}`);
  assert.match(r.stdout, /init ✓/);
  assert.match(r.stdout, /freshness_check ✓/);
  assert.match(r.stdout, /NEXT ACTION \[chatgpt_turn1_research\]/);
  assert.match(r.stdout, /頑丈化チェックリスト/, "頑丈化チェックリストが指示に含まれる");
  const state = JSON.parse(readFileSync(STATE, "utf-8"));
  assert.equal(state.steps.init.status, "done");
  assert.equal(state.steps.chatgpt_turn1_research.status, "pending");
});

test("2. advance で Turn1→Turn6 を順に進められる（チェックポイント）", async () => {
  for (const step of ["chatgpt_turn1_research", "chatgpt_turn2_selection", "chatgpt_turn3_draft", "chatgpt_turn4_review", "chatgpt_turn5_final"]) {
    const r = await orch(["--slug", SLUG, "--advance", step]);
    assert.equal(r.status, 10, `${step} 後は次の assisted 待ちで 10。stderr=${r.stderr}`);
  }
  const state = JSON.parse(readFileSync(STATE, "utf-8"));
  assert.equal(state.steps.chatgpt_turn5_final.status, "done");
  assert.equal(state.steps.chatgpt_turn6_slideplan.status, "pending");
});

test("3. 中断→再実行は同じ待ちステップから再開する（--status も一致）", async () => {
  const r = await orch(["--slug", SLUG]);
  assert.equal(r.status, 10);
  assert.match(r.stdout, /NEXT ACTION \[chatgpt_turn6_slideplan\]/);
  const st = await orch(["--slug", SLUG, "--status"]);
  assert.equal(st.status, 0);
  const parsed = JSON.parse(st.stdout);
  assert.equal(parsed.steps.chatgpt_turn6_slideplan, "pending");
});

test("4. factcheck: pass=false の result は advance 拒否", async () => {
  await orch(["--slug", SLUG, "--advance", "chatgpt_turn6_slideplan"]); // → save_drafts(stub)/gate(stub) → generate_images 待ち
  await orch(["--slug", SLUG, "--advance", "generate_images"]);
  const fc = join(ROOT, "logs", "article", `${SLUG}.factcheck.json`);
  writeFileSync(fc, JSON.stringify({ pass: false, regenerate: [{ which: "slide06", reason: "数値誤り" }] }), "utf-8");
  const r = await orch(["--slug", SLUG, "--advance", "factcheck_images", "--result", fc]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /factcheck_not_passed/);
  // pass=true なら通り、images.json が生成される
  writeFileSync(fc, JSON.stringify({ pass: true, slides: [{ src: "D:/x/a.png", name: "slide01-a.webp" }], thumbnail: { src: "D:/x/t.png" } }), "utf-8");
  const r2 = await orch(["--slug", SLUG, "--advance", "factcheck_images", "--result", fc]);
  assert.equal(r2.status, 10, `stderr=${r2.stderr}`); // → webp(stub) → write_mdx 待ち
  assert.ok(existsSync(join(ROOT, "logs", "article", `${SLUG}.images.json`)));
});

test("5. 残りを進めると COMPLETE（exit 0）に到達する", async () => {
  const r = await orch(["--slug", SLUG, "--advance", "write_mdx"]);
  assert.equal(r.status, 0, `stderr=${r.stderr}`);
  assert.match(r.stdout, /PHASE A COMPLETE/);
  assert.match(r.stdout, /Human Review Checkpoint/);
  const state = JSON.parse(readFileSync(STATE, "utf-8"));
  for (const [name, s] of Object.entries(state.steps)) assert.equal(s.status, "done", `${name} が done`);
});

test("6. --fail はリトライ 2 回で halted (exit 20)・再実行も 20 のまま", async () => {
  const slug2 = SLUG + "-fail";
  const state2 = join(ROOT, "logs", "article", `${slug2}.state.json`);
  rmSync(state2, { force: true });
  await orch(["--theme", "fail test", "--slug", slug2]);
  const f1 = await orch(["--slug", slug2, "--fail", "chatgpt_turn1_research", "--reason", "tab dead"]);
  assert.equal(f1.status, 10, "1回目は再試行を促す");
  const f2 = await orch(["--slug", slug2, "--fail", "chatgpt_turn1_research", "--reason", "tab dead again"]);
  assert.equal(f2.status, 20, "2回目で停止");
  const st = JSON.parse(readFileSync(state2, "utf-8"));
  assert.equal(st.halted, true);
  const rerun = await orch(["--slug", slug2]);
  assert.equal(rerun.status, 20, "halted 中の再実行は進まない");
  // advance で復帰できる
  const rec = await orch(["--slug", slug2, "--advance", "chatgpt_turn1_research"]);
  assert.equal(rec.status, 10);
  rmSync(state2, { force: true });
});
