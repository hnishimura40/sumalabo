// tests/sumahon/x-api-post.test.mjs — L2 (X API 投稿) のユニットテスト。
//
// カバレッジ（指示書 Part 3）:
//   1. 投稿文生成（既存 generateXPost 流用の buildPostText）
//   2. 二重投稿ガード（台帳に slug があれば exit 3）
//   3. 台帳マージ（recordPost の追記 → hasPosted true）
//   4. 失敗分類（classifyFailure: definite/ambiguous/rate_limited）
//   5. dry-run（送信なし・secrets 値の非表示）
//   6. OAuth 1.0a 署名ヘッダの形（値を固定入力で決定的に検証）

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const TMP = mkdtempSync(join(tmpdir(), "x-api-test-"));
const execFileAsync = promisify(execFile);

const api = await import(pathToFileURL(join(ROOT, "scripts", "automation", "post-to-x-api.mjs")).href);
const ledger = await import(pathToFileURL(join(ROOT, "scripts", "sumahon", "x-posted-ledger.mjs")).href);

const CLEAN_ENV = {
  ...process.env,
  REVIEW_NOTIFY_SECRET: "",
  X_API_CONSUMER_KEY: "",
  X_API_CONSUMER_SECRET: "",
  X_API_ACCESS_TOKEN: "",
  X_API_ACCESS_TOKEN_SECRET: "",
};

async function runCli(args, env = {}) {
  try {
    const r = await execFileAsync(
      process.execPath,
      [join(ROOT, "scripts", "automation", "post-to-x-api.mjs"), ...args],
      { cwd: ROOT, env: { ...CLEAN_ENV, ...env }, maxBuffer: 10 * 1024 * 1024 },
    );
    return { status: 0, stdout: r.stdout, stderr: r.stderr };
  } catch (e) {
    return { status: e.code ?? 1, stdout: e.stdout || "", stderr: e.stderr || "" };
  }
}

// ---------- 1. 投稿文生成 ----------

test("1. buildPostText: 実記事のfrontmatterからURL・タグ入りの投稿文を生成する", () => {
  const r = api.buildPostText("202606-claude-fable-5-launch");
  assert.equal(r.ok, true);
  assert.ok(r.text.includes("https://sumalabo.com/articles/202606-claude-fable-5-launch/"), "URLを含む");
  assert.ok(/#\S+/.test(r.text), "ハッシュタグを含む");
  assert.ok(r.text.length <= 400, "極端に長くない");
});

test("1b. buildPostText: 存在しないslugはエラー", () => {
  const r = api.buildPostText("no-such-article-slug");
  assert.equal(r.ok, false);
  assert.equal(r.reason, "mdx_not_found");
});

// ---------- 2. 二重投稿ガード ----------

test("2. 台帳に該当slugがあればCLIは exit 3 で停止（送信しない）", async () => {
  // 実台帳に既に存在する Fable 5 slug（2026-07-04 に投稿済み）でガードを検証
  const r = await runCli(["--slug", "202606-claude-fable-5-launch"]);
  assert.equal(r.status, 3, `stderr=${r.stderr}`);
  assert.match(r.stderr, /既に投稿済み/);
});

// ---------- 3. 台帳マージ ----------

test("3. recordPost で追記 → hasPosted が true になる（一時台帳）", async () => {
  const ledgerPath = join(TMP, "ledger.json");
  writeFileSync(ledgerPath, "[]", "utf-8");
  assert.equal(await ledger.hasPosted("test-slug", ledgerPath), false);
  await ledger.recordPost({ slug: "test-slug", postUrl: "https://x.com/suma_labo/status/1", postText: "t", method: "api", ledgerPath });
  assert.equal(await ledger.hasPosted("test-slug", ledgerPath), true);
  // 既存レコードを壊さない（マージ追記）
  await ledger.recordPost({ slug: "test-slug-2", postUrl: "https://x.com/suma_labo/status/2", postText: "t2", method: "api", ledgerPath });
  assert.equal(await ledger.hasPosted("test-slug", ledgerPath), true);
});

// ---------- 4. 失敗分類 ----------

test("4. classifyFailure: ネットワーク断/5xx=ambiguous, 4xx=definite, 429=rate_limited", () => {
  assert.equal(api.classifyFailure({ networkError: true }), "ambiguous");
  assert.equal(api.classifyFailure({ status: 503 }), "ambiguous");
  assert.equal(api.classifyFailure({ status: 500 }), "ambiguous");
  assert.equal(api.classifyFailure({ status: 429 }), "rate_limited");
  assert.equal(api.classifyFailure({ status: 403 }), "definite_fail");
  assert.equal(api.classifyFailure({ status: 400 }), "definite_fail");
});

// ---------- 5. dry-run ----------

test("5. dry-run: 送信せずリクエスト組み立てを出力し、secrets の値を表示しない", async () => {
  const dummy = "dummy-secret-value-should-never-appear-98765";
  const r = await runCli(["--slug", "202605-claude-opus-4-8-launch", "--dry-run"], {
    X_API_CONSUMER_KEY: dummy + "-ck",
    X_API_CONSUMER_SECRET: dummy + "-cs",
    X_API_ACCESS_TOKEN: dummy + "-at",
    X_API_ACCESS_TOKEN_SECRET: dummy + "-as",
    X_API_BASE: "http://127.0.0.1:1", // 万一送信しようとしたら必ず失敗する番地
  });
  assert.equal(r.status, 0, `stderr=${r.stderr}`);
  assert.match(r.stdout, /DRY RUN/);
  assert.match(r.stdout, /"credentialsConfigured": true/);
  const all = r.stdout + r.stderr;
  assert.ok(!all.includes(dummy), "secrets の値が出力に含まれない");
});

test("5b. dry-run: 禁則語入りの投稿文は exit 4（fixtureで検証）", () => {
  const forbidden = join(TMP, "forbidden.json");
  writeFileSync(forbidden, JSON.stringify({ patterns: [{ pattern: "圧倒的", severity: "violation" }] }), "utf-8");
  const check = api.checkForbidden("この製品は圧倒的にすごい", forbidden);
  assert.equal(check.ok, false);
  assert.deepEqual(check.hits, ["圧倒的"]);
  const okCheck = api.checkForbidden("ふつうの文章です", forbidden);
  assert.equal(okCheck.ok, true);
});

// ---------- 6. OAuth 署名の形（決定的入力） ----------

test("6. buildOAuthHeader: 固定nonce/timestampで決定的なOAuthヘッダを生成する", () => {
  const creds = { consumerKey: "ck", consumerSecret: "cs", accessToken: "at", accessTokenSecret: "as" };
  const h = api.buildOAuthHeader({ method: "POST", url: "https://api.x.com/2/tweets", creds, nonce: "fixednonce", timestamp: 1700000000 });
  assert.ok(h.startsWith("OAuth "), "OAuth スキーム");
  assert.match(h, /oauth_consumer_key="ck"/);
  assert.match(h, /oauth_token="at"/);
  assert.match(h, /oauth_signature_method="HMAC-SHA1"/);
  assert.match(h, /oauth_signature="[A-Za-z0-9%]+"/);
  // 同一入力で同一署名（決定性）
  const h2 = api.buildOAuthHeader({ method: "POST", url: "https://api.x.com/2/tweets", creds, nonce: "fixednonce", timestamp: 1700000000 });
  assert.equal(h, h2);
  // secret はヘッダに現れない
  assert.ok(!h.includes("cs") || h.includes(`oauth_consumer_key="ck"`), "consumerSecret がヘッダに含まれない");
  assert.ok(!/oauth_consumer_secret|oauth_token_secret/.test(h));
});

test.after(() => {
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {}
});
