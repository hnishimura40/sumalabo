// tests/sumahon/autonomy.test.mjs — L1 (Autonomy Ladder) 基盤のテスト。
//
// テスト要件（指示書）:
//   1. paused: true で finalize / Phase B が起動しないこと
//   2. level: 0 では veto 窓経過でも自動 Phase B が走らないこと（現行動作の保護）
//   3. level: 1 で veto 期限前は起動せず、期限後に起動すること
//   4. post-publish verify の hard fail で rollback が呼ばれること（本番非破壊:
//      verify 対象 URL をローカル HTTP サーバーに差し替え、rollback は stub script）
//   5. incidents 2 件で level が下がること
//   6. 既存テストスイートが全 pass 維持（スイート全体の実行で担保）
//
// 状態ファイルは AUTONOMY_FILE 環境変数で一時ファイルへ差し替える（実運用の
// data/automation/autonomy.json には触れない）。

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFile } from "node:child_process";
import { promisify } from "node:util";
import { createServer } from "node:http";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const TMP = mkdtempSync(join(tmpdir(), "autonomy-test-"));

const autonomyLib = await import(pathToFileURL(join(ROOT, "scripts", "automation", "autonomy.mjs")).href);
const autoPhaseB = await import(pathToFileURL(join(ROOT, "scripts", "automation", "auto-phase-b.mjs")).href);

function writeState(name, state) {
  const p = join(TMP, name);
  writeFileSync(p, JSON.stringify(state, null, 2), "utf-8");
  return p;
}

// 注意: テスト内でローカル HTTP サーバーを立てて子プロセスに fetch させる場合、
// spawnSync はイベントループを塞いでサーバーが応答できずデッドロックする。
// サーバー併用テストは必ずこちら（非同期）を使う。
const execFileAsync = promisify(execFile);
async function runAsync(args, env) {
  try {
    const r = await execFileAsync(process.execPath, args, { cwd: ROOT, env: { ...process.env, REVIEW_NOTIFY_SECRET: "", ...env }, maxBuffer: 10 * 1024 * 1024 });
    return { status: 0, stdout: r.stdout, stderr: r.stderr };
  } catch (e) {
    return { status: e.code ?? 1, stdout: e.stdout || "", stderr: e.stderr || "" };
  }
}

const PAUSED = { level: 0, paused: true, vetoWindowMinutes: 30, promotionCount: { toL1: 0 }, incidents: [] };
const L0 = { level: 0, paused: false, vetoWindowMinutes: 30, promotionCount: { toL1: 0 }, incidents: [] };
const L1 = { level: 1, paused: false, vetoWindowMinutes: 30, promotionCount: { toL1: 0 }, incidents: [] };

// ---------- 要件1: paused で finalize / Phase B が起動しない ----------

test("1a. paused: true で finalize が入口で BLOCK (exit 2)", () => {
  const stateFile = writeState("paused-finalize.json", PAUSED);
  const r = spawnSync(
    process.execPath,
    [join(ROOT, "scripts", "run", "phase-a-finalize.mjs"), "--slug", "autonomy-test-not-real", "--branch", "preview/autonomy-test"],
    { encoding: "utf-8", cwd: ROOT, env: { ...process.env, AUTONOMY_FILE: stateFile, REVIEW_NOTIFY_SECRET: "" } },
  );
  assert.equal(r.status, 2, `stderr=${r.stderr}`);
  assert.match(r.stderr, /autonomy_paused/);
  // gate (sumalabo-gate) や build まで進んでいないこと
  assert.ok(!r.stdout.includes("quality gate"), "paused なのに品質ゲートへ進んだ");
});

test("1b. paused: true で deploy:production (Phase B) が入口で BLOCK", () => {
  const stateFile = writeState("paused-deploy.json", PAUSED);
  const r = spawnSync(
    process.execPath,
    [join(ROOT, "scripts", "automation", "deploy-production-from-main.mjs"), "--slug=autonomy-test-not-real", "--dry-run"],
    { encoding: "utf-8", cwd: ROOT, env: { ...process.env, AUTONOMY_FILE: stateFile, REVIEW_NOTIFY_SECRET: "" } },
  );
  assert.equal(r.status, 1);
  assert.match(r.stdout, /"errorReason":\s*"autonomy_paused"/);
  assert.match(r.stdout, /"gitSync":\s*\{\s*"status":\s*"skipped"/, "paused なのに gitSync へ進んだ");
});

test("1c. paused: true で auto-phase-b が skip (exit 0・対象照会に進まない)", () => {
  const stateFile = writeState("paused-auto.json", PAUSED);
  const r = spawnSync(
    process.execPath,
    [join(ROOT, "scripts", "automation", "auto-phase-b.mjs"), "--decide"],
    { encoding: "utf-8", cwd: ROOT, env: { ...process.env, AUTONOMY_FILE: stateFile, REVIEW_NOTIFY_SECRET: "" } },
  );
  assert.equal(r.status, 0);
  assert.match(r.stdout, /skip: autonomy_paused/);
});

// ---------- 要件2: L0 では veto 窓経過でも自動 Phase B が走らない ----------

test("2. level: 0 では veto 期限超過 item があっても auto-phase-b は skip", () => {
  const stateFile = writeState("l0-auto.json", L0);
  const itemsFile = join(TMP, "items-l0.json");
  writeFileSync(itemsFile, JSON.stringify({
    items: [{ slug: "expired-article", status: "review_waiting", vetoDeadline: "2026-01-01T00:00:00.000Z", prUrl: "https://github.com/x/y/pull/1" }],
  }), "utf-8");
  const r = spawnSync(
    process.execPath,
    [join(ROOT, "scripts", "automation", "auto-phase-b.mjs"), "--decide", `--items-file=${itemsFile}`],
    { encoding: "utf-8", cwd: ROOT, env: { ...process.env, AUTONOMY_FILE: stateFile, REVIEW_NOTIFY_SECRET: "" } },
  );
  assert.equal(r.status, 0);
  assert.match(r.stdout, /skip: autonomy_level_insufficient/);
  assert.ok(!r.stdout.includes("expired-article"), "L0 なのに対象選定へ進んだ");
});

test("2b. deploy:production も trigger=auto_after_veto は L0 で拒否 (manual は許可)", () => {
  const stateFile = writeState("l0-deploy.json", L0);
  const script = join(ROOT, "scripts", "automation", "deploy-production-from-main.mjs");
  const auto = spawnSync(process.execPath, [script, "--slug=autonomy-test-not-real", "--dry-run", "--trigger=auto_after_veto"],
    { encoding: "utf-8", cwd: ROOT, env: { ...process.env, AUTONOMY_FILE: stateFile, REVIEW_NOTIFY_SECRET: "" } });
  assert.equal(auto.status, 1);
  assert.match(auto.stdout, /"errorReason":\s*"autonomy_level_insufficient"/);
  // manual は L0 でもゲートを通過する（その先の dist 検査等で止まるのは想定内）
  const manual = spawnSync(process.execPath, [script, "--slug=autonomy-test-not-real", "--dry-run", "--skip-build", "--skip-git-sync"],
    { encoding: "utf-8", cwd: ROOT, env: { ...process.env, AUTONOMY_FILE: stateFile, REVIEW_NOTIFY_SECRET: "" } });
  assert.match(manual.stdout, /"autonomyGate":\s*\{\s*"status":\s*"ok"/);
});

// ---------- 要件3: L1 では期限前は起動せず、期限後に起動する ----------

test("3. level: 1 — veto 期限前は対象外、期限後は対象になる (selectEligible + CLI)", () => {
  const items = [
    { slug: "future-article", status: "review_waiting", vetoDeadline: "2099-01-01T00:00:00.000Z", prUrl: "https://github.com/x/y/pull/2" },
    { slug: "expired-article", status: "review_waiting", vetoDeadline: "2026-01-01T00:00:00.000Z", prUrl: "https://github.com/x/y/pull/3" },
    { slug: "vetoed-article", status: "review_waiting", vetoDeadline: "2026-01-01T00:00:00.000Z", vetoedAt: "2026-01-01T00:10:00.000Z", prUrl: "https://github.com/x/y/pull/4" },
    { slug: "already-approved", status: "approved", vetoDeadline: "2026-01-01T00:00:00.000Z", prUrl: "https://github.com/x/y/pull/5" },
  ];
  const eligible = autoPhaseB.selectEligible(items, Date.parse("2026-07-04T00:00:00.000Z"));
  assert.deepEqual(eligible.map((e) => e.slug), ["expired-article"], "期限超過・未veto・review_waiting だけが対象");

  // CLI 経由（L1 状態ファイル + items-file 注入 + --decide）
  const stateFile = writeState("l1-auto.json", L1);
  const itemsFile = join(TMP, "items-l1.json");
  writeFileSync(itemsFile, JSON.stringify({ items }), "utf-8");
  const r = spawnSync(
    process.execPath,
    [join(ROOT, "scripts", "automation", "auto-phase-b.mjs"), "--decide", `--items-file=${itemsFile}`, "--now=2026-07-04T00:00:00.000Z"],
    { encoding: "utf-8", cwd: ROOT, env: { ...process.env, AUTONOMY_FILE: stateFile, REVIEW_NOTIFY_SECRET: "" } },
  );
  assert.equal(r.status, 0);
  assert.match(r.stdout, /対象: expired-article/);

  // 期限前だけの items なら対象なし
  const itemsFile2 = join(TMP, "items-l1-future.json");
  writeFileSync(itemsFile2, JSON.stringify({ items: [items[0]] }), "utf-8");
  const r2 = spawnSync(
    process.execPath,
    [join(ROOT, "scripts", "automation", "auto-phase-b.mjs"), "--decide", `--items-file=${itemsFile2}`, "--now=2026-07-04T00:00:00.000Z"],
    { encoding: "utf-8", cwd: ROOT, env: { ...process.env, AUTONOMY_FILE: stateFile, REVIEW_NOTIFY_SECRET: "" } },
  );
  assert.equal(r2.status, 0);
  assert.match(r2.stdout, /対象なし/);
});

// ---------- 要件4: hard fail で rollback が呼ばれる（本番非破壊） ----------

test("4. post-publish verify: hard fail で rollback stub が呼ばれ、verify.json に記録される", async () => {
  // 壊れた本番を模したローカルサーバー（記事 URL が 404）
  const server = createServer((req, res) => {
    if (req.url === "/" || req.url === "/articles/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<html><title>すまラボ</title><body>top</body></html>");
    } else {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("not found");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;

  // rollback stub: マーカーファイルを書くだけ（本番に触れない）
  const marker = join(TMP, "rollback-invoked.txt");
  const stub = join(TMP, "rollback-stub.mjs");
  writeFileSync(stub, `import { writeFileSync } from "node:fs";\nwriteFileSync(${JSON.stringify(marker)}, process.argv.slice(2).join(" "), "utf-8");\nprocess.exit(0);\n`, "utf-8");

  const stateFile = writeState("l1-postverify.json", L1);
  const outFile = join(TMP, "hardfail.verify.json");
  const r = await runAsync(
    [
      join(ROOT, "scripts", "automation", "post-publish-verify.mjs"),
      "--slug=autonomy-test-not-real",
      `--base-url=http://127.0.0.1:${port}`,
      `--rollback-script=${stub}`,
      "--trigger=auto_after_veto",
      "--no-notify",
      `--output=${outFile}`,
    ],
    { AUTONOMY_FILE: stateFile },
  );
  server.close();

  assert.equal(r.status, 1, `hard fail は exit 1。stdout=${r.stdout}`);
  assert.ok(existsSync(marker), "rollback stub が呼ばれていない");
  assert.match(readFileSync(marker, "utf-8"), /--slug=autonomy-test-not-real/);
  const report = JSON.parse(readFileSync(outFile, "utf-8"));
  assert.equal(report.hardFail, true);
  assert.equal(report.rollback.invoked, true);
  assert.equal(report.trigger, "auto_after_veto");
  assert.equal(report.autonomyLevel, 1);
  assert.ok(report.rounds[0].hardFailed.includes("articleHttp200"));
  // incident が状態ファイルに記録されている
  const state = JSON.parse(readFileSync(stateFile, "utf-8"));
  assert.ok(state.incidents.some((i) => i.slug === "autonomy-test-not-real" && i.kind === "post_publish_hard_fail"));
});

test("4b. post-publish verify: 正常 200 + slug入りHTML は hard fail しない (soft のみ検査)", async () => {
  const slug = "autonomy-ok-article";
  const server = createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/html" });
    if (req.url === `/articles/${slug}/`) {
      res.end(`<html><title>テスト記事</title><body>article ${slug}</body></html>`);
    } else if (req.url === "/articles/") {
      res.end(`<html><body><a href="/articles/${slug}/">${slug}</a></body></html>`);
    } else {
      res.end("<html><title>すまラボ</title><body>top</body></html>");
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const port = server.address().port;
  const stateFile = writeState("l1-postverify-ok.json", L1);
  const outFile = join(TMP, "ok.verify.json");
  const r = await runAsync(
    [
      join(ROOT, "scripts", "automation", "post-publish-verify.mjs"),
      `--slug=${slug}`,
      `--base-url=http://127.0.0.1:${port}`,
      "--no-rollback",
      "--no-notify",
      "--recheck-delay-ms=0",
      `--output=${outFile}`,
    ],
    { AUTONOMY_FILE: stateFile },
  );
  server.close();
  assert.equal(r.status, 0, `stdout=${r.stdout}`);
  const report = JSON.parse(readFileSync(outFile, "utf-8"));
  assert.equal(report.hardFail, false);
});

// ---------- 要件5: incidents 2 件で level が下がる ----------

test("5. 直近10記事で incidents 2件 → level 1 → 0 に自動降格", () => {
  const stateFile = writeState("demote.json", {
    ...L1,
    incidents: [
      { at: "2026-07-01T00:00:00.000Z", slug: "article-a", kind: "post_publish_hard_fail" },
      { at: "2026-07-02T00:00:00.000Z", slug: "article-b", kind: "rollback_failed" },
      { at: "2026-06-01T00:00:00.000Z", slug: "old-article-out-of-window", kind: "post_publish_hard_fail" },
    ],
  });
  const recentSlugs = ["article-a", "article-b", "article-c", "article-d"]; // 直近10記事(のうち4)
  const result = autonomyLib.maybeAutoDemote({ recentSlugs, filePath: stateFile });
  assert.equal(result.demoted, true);
  assert.equal(result.from, 1);
  assert.equal(result.to, 0);
  const after = JSON.parse(readFileSync(stateFile, "utf-8"));
  assert.equal(after.level, 0);
  assert.ok(after.incidents.some((i) => i.kind === "auto_demotion"));
});

test("5b. 直近10記事に incident 1件だけなら降格しない", () => {
  const stateFile = writeState("no-demote.json", {
    ...L1,
    incidents: [{ at: "2026-07-01T00:00:00.000Z", slug: "article-a", kind: "post_publish_hard_fail" }],
  });
  const result = autonomyLib.maybeAutoDemote({ recentSlugs: ["article-a", "article-b"], filePath: stateFile });
  assert.equal(result.demoted, false);
  assert.equal(JSON.parse(readFileSync(stateFile, "utf-8")).level, 1);
});

// ---------- ライブラリ単体の境界 ----------

test("6. gate: manual は L0 でも phase_b を許可、auto は拒否。壊れた状態ファイルは paused 扱い", () => {
  const l0 = writeState("gate-l0.json", L0);
  assert.equal(autonomyLib.gate({ phase: "phase_b", trigger: "manual", state: autonomyLib.loadAutonomy(l0) }).allowed, true);
  assert.equal(autonomyLib.gate({ phase: "phase_b", trigger: "auto_after_veto", state: autonomyLib.loadAutonomy(l0) }).allowed, false);
  const broken = join(TMP, "broken.json");
  writeFileSync(broken, "{not json", "utf-8");
  const state = autonomyLib.loadAutonomy(broken);
  assert.equal(state.paused, true, "壊れた状態ファイルは安全側 (paused) に倒す");
});

test("7. computeVetoDeadline: vetoWindowMinutes 後の期限と JST 表示を返す", () => {
  const stateFile = writeState("veto-window.json", L1);
  const base = new Date("2026-07-04T00:00:00.000Z");
  const v = autonomyLib.computeVetoDeadline(base, autonomyLib.loadAutonomy(stateFile));
  assert.equal(v.vetoDeadline, "2026-07-04T00:30:00.000Z");
  assert.equal(v.vetoDeadlineJst, "2026-07-04 09:30 JST");
});

// 後始末
test.after(() => {
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {}
});
