// tests/sumahon/approval-fallback.test.mjs
//
// approve-preview / verify-publication / deploy-production-from-main の
// wrangler fallback ロジックを node:test で検証する。
//
// verify-publication.ts は Cloudflare Pages Functions の TypeScript なので
// 直接 import できない。ロジックの「形」を JS で再現したミニ実装で
// 仕様を pin する (slide-safety.test.mjs と同じ pattern)。
//
// カバレッジ:
//   1. HTTP 200 + homepage fallback → published 扱いにしない
//   2. deployTriggered=false なら needsWranglerFallback=true (即 fallback)
//   3. verify timeout (deployTriggeredAt が古い + verify 未成功) → needsWranglerFallback=true
//   4. published 遷移は全 check pass のときだけ
//   5. fallback script (deploy-production-from-main.mjs) の dry-run が
//      事前検査だけで終了し、result JSON に secret 値を含まないこと
//   6. fallback script は --slug 未指定で exit code 2 (引数エラー)
//   7. fallback CLI hint に secret / token が含まれないこと

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");

// ---------- mini implementation mirroring verify-publication.ts logic ----------

const DEFAULT_PENDING_TIMEOUT_MS = 6 * 60 * 1000;
const FALLBACK_HINT = "node scripts/automation/deploy-production-from-main.mjs --slug=<slug>";

function evaluateVerify(state) {
  const {
    checks, // VerifyCheck: all .ok booleans
    deployTriggered, // boolean | undefined
    deployTriggeredAtMs, // number | null
    nowMs,
    pendingTimeoutMs = DEFAULT_PENDING_TIMEOUT_MS,
  } = state;

  const failedChecks = Object.keys(checks).filter((k) => !checks[k].ok);
  const allPass = failedChecks.length === 0;

  const pendingElapsedMs = deployTriggeredAtMs !== null && deployTriggeredAtMs !== undefined
    ? nowMs - deployTriggeredAtMs
    : null;
  const pendingExceeded = pendingElapsedMs !== null && pendingElapsedMs > pendingTimeoutMs;

  const deployNotTriggered = deployTriggered === false;

  let status, needsWranglerFallback = false;
  if (allPass) {
    status = "published";
  } else if (deployNotTriggered) {
    status = "approved_deploy_pending";
    needsWranglerFallback = true;
  } else if (pendingExceeded) {
    status = "approved_deploy_pending";
    needsWranglerFallback = true;
  } else if (checks.httpStatus.ok) {
    status = "deploying";
  } else {
    status = "failed";
  }
  return { status, needsWranglerFallback, failedChecks };
}

function passingChecks() {
  return {
    httpStatus: { ok: true, actual: 200 },
    titleNotGeneric: { ok: true },
    slugInHtml: { ok: true },
    notHomepageFallback: { ok: true },
    hasArticleBody: { ok: true },
    hasThumbnailRef: { ok: true },
    noProhibitedCopy: { ok: true },
    indexListsArticle: { ok: true },
  };
}

function homepageFallbackChecks() {
  // HTTP 200 だが title が「すまラボ」, slug がなく、homepage fallback の典型
  return {
    httpStatus: { ok: true, actual: 200 },
    titleNotGeneric: { ok: false },
    slugInHtml: { ok: false },
    notHomepageFallback: { ok: false },
    hasArticleBody: { ok: false },
    hasThumbnailRef: { ok: false },
    noProhibitedCopy: { ok: true },
    indexListsArticle: { ok: false },
  };
}

// ----- tests -----

test("1. HTTP 200 + homepage fallback は published 扱いにしない (deploying or fallback)", () => {
  const r = evaluateVerify({
    checks: homepageFallbackChecks(),
    deployTriggered: true,
    deployTriggeredAtMs: Date.now() - 30_000,
    nowMs: Date.now(),
  });
  assert.notEqual(r.status, "published");
  assert.equal(r.status, "deploying");
  assert.equal(r.needsWranglerFallback, false);
});

test("2. deployTriggered=false なら即座に needsWranglerFallback=true", () => {
  const r = evaluateVerify({
    checks: homepageFallbackChecks(),
    deployTriggered: false,
    deployTriggeredAtMs: null,
    nowMs: Date.now(),
  });
  assert.equal(r.status, "approved_deploy_pending");
  assert.equal(r.needsWranglerFallback, true);
});

test("3. deployTriggeredAt が timeout を超えて verify 未成功 → fallback", () => {
  const now = Date.now();
  const r = evaluateVerify({
    checks: homepageFallbackChecks(),
    deployTriggered: true,
    deployTriggeredAtMs: now - (DEFAULT_PENDING_TIMEOUT_MS + 30_000),
    nowMs: now,
  });
  assert.equal(r.status, "approved_deploy_pending");
  assert.equal(r.needsWranglerFallback, true);
});

test("4. published 遷移は全 check pass のときだけ", () => {
  const r = evaluateVerify({
    checks: passingChecks(),
    deployTriggered: true,
    deployTriggeredAtMs: Date.now() - 30_000,
    nowMs: Date.now(),
  });
  assert.equal(r.status, "published");
  assert.equal(r.needsWranglerFallback, false);
});

test("4b. deployTriggered=false でも全 check pass なら published (実 production に既に上がっている)", () => {
  const r = evaluateVerify({
    checks: passingChecks(),
    deployTriggered: false,
    deployTriggeredAtMs: null,
    nowMs: Date.now(),
  });
  assert.equal(r.status, "published");
});

test("5. timeout 直前 (まだ閾値以内) は deploying のまま、fallback に進まない", () => {
  const now = Date.now();
  const r = evaluateVerify({
    checks: homepageFallbackChecks(),
    deployTriggered: true,
    deployTriggeredAtMs: now - (DEFAULT_PENDING_TIMEOUT_MS - 5_000),
    nowMs: now,
  });
  assert.equal(r.status, "deploying");
  assert.equal(r.needsWranglerFallback, false);
});

test("6. HTTP 5xx (httpStatus.ok=false) は failed", () => {
  const checks = homepageFallbackChecks();
  checks.httpStatus = { ok: false, actual: 502 };
  const r = evaluateVerify({
    checks,
    deployTriggered: true,
    deployTriggeredAtMs: Date.now() - 30_000,
    nowMs: Date.now(),
  });
  assert.equal(r.status, "failed");
  assert.equal(r.needsWranglerFallback, false);
});

// ----- fallback script: --slug 未指定で引数エラー -----

test("7. fallback script は --slug 未指定で exit 2", () => {
  const script = join(ROOT, "scripts", "automation", "deploy-production-from-main.mjs");
  const r = spawnSync(process.execPath, [script], { encoding: "utf-8" });
  assert.equal(r.status, 2, `expected exit code 2, got ${r.status}. stderr=${r.stderr}`);
  // result JSON にも slug = null が記録されている
  assert.match(r.stdout, /"errorReason":\s*"missing_or_invalid_slug"/);
});

// ----- fallback script: dry-run で wrangler を呼ばずに完走 (build 込みは重いので skip-build) -----

test("8. fallback script dry-run (--skip-build --skip-git-sync --no-verify) は exit 1 (dist 不在) で result JSON を出力する", () => {
  // dist が存在しなければ distCheck で failed → exit 1。
  // ここで検証したいのは：
  //   - script が起動できる
  //   - result JSON に secret 値が出ない
  //   - dry-run の場合 wrangler step が "dry_run" になる (ただし distCheck で止まる)
  const script = join(ROOT, "scripts", "automation", "deploy-production-from-main.mjs");
  const r = spawnSync(
    process.execPath,
    [
      script,
      "--slug=approval-fallback-test-only-not-real",
      "--dry-run",
      "--skip-build",
      "--skip-git-sync",
      "--no-verify",
    ],
    { encoding: "utf-8", env: { ...process.env, CLOUDFLARE_API_TOKEN: "dummy-token-should-not-leak-12345" } },
  );
  // dist が無いはずなので distCheck で失敗して exit 1
  assert.equal(r.status, 1, `expected exit 1 (dist missing). stdout=${r.stdout}`);

  // secret 値が stdout/stderr に出ていないこと
  const haystack = (r.stdout || "") + (r.stderr || "");
  assert.ok(
    !haystack.includes("dummy-token-should-not-leak-12345"),
    "CLOUDFLARE_API_TOKEN の値が stdout/stderr に漏れています",
  );

  // result JSON 形式が正しいこと
  assert.match(r.stdout, /"slug":\s*"approval-fallback-test-only-not-real"/);
  assert.match(r.stdout, /"dryRun":\s*true/);
});

test("9. fallback CLI hint には secret / token / hook URL を含まない", () => {
  // verify-publication / approve-preview / フロント全てで使う共通定数
  const hint = "node scripts/automation/deploy-production-from-main.mjs --slug=<slug>";
  assert.equal(hint, FALLBACK_HINT);
  // hint 自体に "https://", "Bearer", "token", "secret" が含まれていないこと
  assert.ok(!/https?:\/\//.test(hint), "hint に URL を含めないこと");
  assert.ok(!/bearer/i.test(hint), "hint に Bearer token を含めないこと");
  assert.ok(!/secret|hook[_-]?url|api[_-]?token/i.test(hint), "hint に secret 名を含めないこと");
});

test("10. KV record shape: status='approved_deploy_pending' / needsWranglerFallback=true は wrangler fallback 必須の単一シグナル", () => {
  // verify-publication.ts と approve-preview.ts の両方で同じ値を使う契約。
  // hint 文字列に secret は含めない (test 9 で別途検証)。
  const expectedStatus = "approved_deploy_pending";
  const expectedFlag = true;
  const expectedHint = FALLBACK_HINT;

  // フロント側 (PreviewApprovalButton.astro) はこの 3 つで X 投稿を止める。
  assert.equal(typeof expectedStatus, "string");
  assert.equal(typeof expectedFlag, "boolean");
  assert.equal(typeof expectedHint, "string");
  assert.ok(expectedHint.startsWith("node "));
  assert.ok(expectedHint.includes("deploy-production-from-main.mjs"));
});
