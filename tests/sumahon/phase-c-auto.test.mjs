// tests/sumahon/phase-c-auto.test.mjs — L2 Phase C 自動配線と syndication カード確認のテスト。
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TMP = mkdtempSync(join(tmpdir(), "phasec-test-"));
const execFileAsync = promisify(execFile);

async function runCli(script, args, env = {}) {
  try {
    const r = await execFileAsync(process.execPath, [join(ROOT, "scripts", "automation", script), ...args], { cwd: ROOT, env: { ...process.env, REVIEW_NOTIFY_SECRET: "", ...env }, maxBuffer: 10 * 1024 * 1024 });
    return { status: 0, stdout: r.stdout, stderr: r.stderr };
  } catch (e) {
    return { status: e.code ?? 1, stdout: e.stdout || "", stderr: e.stderr || "" };
  }
}

test("1. phase-c-auto: level 0 では auto トリガーは skip（発火しない）", async () => {
  const r = await runCli("phase-c-auto.mjs", ["--slug", "202606-claude-fable-5-launch"]);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /skip: autonomy_level_insufficient/);
});

test("2. phase-c-auto: paused なら manual でも停止", async () => {
  const paused = join(TMP, "paused.json");
  writeFileSync(paused, JSON.stringify({ level: 2, paused: true, vetoWindowMinutes: 30, xPostMethod: "browser", promotionCount: { toL1: 0 }, incidents: [] }), "utf-8");
  const r = await runCli("phase-c-auto.mjs", ["--slug", "x", "--trigger", "manual"], { AUTONOMY_FILE: paused });
  assert.equal(r.status, 0);
  assert.match(r.stdout, /skip: autonomy_paused/);
});

test("3. phase-c-auto: level 2 でも post-publish verify 結果が無ければ BLOCK", async () => {
  const l2 = join(TMP, "l2.json");
  writeFileSync(l2, JSON.stringify({ level: 2, paused: false, vetoWindowMinutes: 30, xPostMethod: "browser", promotionCount: { toL1: 0 }, incidents: [] }), "utf-8");
  const r = await runCli("phase-c-auto.mjs", ["--slug", "no-verify-slug-not-real"], { AUTONOMY_FILE: l2 });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /verify 結果がありません/);
});

test("4. x-card-check: syndication 応答からカード有無と画像URLを判定（stubサーバー）", async () => {
  const server = createServer((req, res) => {
    if (req.url.includes("id=111")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ text: "t", card: { name: "summary_large_image", binding_values: { photo_image_full_size_large: { image_value: { url: `http://127.0.0.1:${server.address().port}/img.jpg` } }, title: { string_value: "T" } } } }));
    } else if (req.url === "/img.jpg") {
      res.writeHead(200, { "Content-Type": "image/jpeg" });
      res.end(Buffer.from("ffd8ffe0", "hex"));
    } else if (req.url.includes("id=222")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ text: "t" })); // カードなし
    } else {
      res.writeHead(404); res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  process.env.X_SYND_BASE = base;
  const lib = await import(pathToFileURL(join(ROOT, "scripts", "automation", "x-card-check.mjs")).href);
  const withCard = await lib.checkCard("111");
  assert.equal(withCard.cardFound, true);
  assert.equal(withCard.cardName, "summary_large_image");
  assert.equal(withCard.imageOk, true);
  const noCard = await lib.checkCard("222");
  assert.equal(noCard.tweetFound, true);
  assert.equal(noCard.cardFound, false);
  delete process.env.X_SYND_BASE;
  server.close();
});

test.after(() => { try { rmSync(TMP, { recursive: true, force: true }); } catch {} });
