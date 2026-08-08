// tests/sumahon/production-deploy.test.mjs
//
// verify-publication / deploy-production-from-main の
// 本番反映ロジック (P1: wrangler 正規手順) を node:test で検証する。
//
// verify-publication.ts は Cloudflare Pages Functions の TypeScript なので
// 直接 import できない。ロジックの「形」を JS で再現したミニ実装で
// 仕様を pin する (slide-safety.test.mjs と同じ pattern)。
//
// P1 で Deploy Hook / Git 連携 auto-deploy は廃止済み。
// deployTriggered / needsWranglerFallback / approved_deploy_pending /
// timeout 判定は存在しないことがこのテストの前提。
//
// カバレッジ:
//   1. HTTP 200 だが本番未反映 (homepage 誤配信) → awaiting_production_deploy
//   2. published 遷移は全 check pass のときだけ
//   3. HTTP 5xx → failed
//   4. deploy script は --slug 未指定で exit 2 (引数エラー)
//   5. deploy script dry-run が事前検査だけで終了し、secret 値を出力しない
//   6. 本番反映コマンド hint に secret / token / URL を含まない

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..", "..");

// ---------- mini implementation mirroring verify-publication.ts logic ----------

const PRODUCTION_DEPLOY_COMMAND_HINT = "npm run deploy:production -- --slug=<slug>";

function evaluateVerify(state) {
  const { checks } = state; // VerifyCheck: all .ok booleans

  const failedChecks = Object.keys(checks).filter((k) => !checks[k].ok);
  const allPass = failedChecks.length === 0;

  let status;
  if (allPass) {
    status = "published";
  } else if (checks.httpStatus.ok) {
    status = "awaiting_production_deploy";
  } else {
    status = "failed";
  }
  return { status, failedChecks };
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

function homepageMisdeliveryChecks() {
  // HTTP 200 だが title が「すまラボ」, slug がなく、homepage 誤配信の典型
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

test("1. HTTP 200 + 本番未反映 (homepage 誤配信) は published 扱いにしない → awaiting_production_deploy", () => {
  const r = evaluateVerify({ checks: homepageMisdeliveryChecks() });
  assert.notEqual(r.status, "published");
  assert.equal(r.status, "awaiting_production_deploy");
});

test("2. published 遷移は全 check pass のときだけ", () => {
  const r = evaluateVerify({ checks: passingChecks() });
  assert.equal(r.status, "published");
  assert.equal(r.failedChecks.length, 0);
});

test("2b. 1 check でも fail していれば published にならない", () => {
  const checks = passingChecks();
  checks.indexListsArticle = { ok: false };
  const r = evaluateVerify({ checks });
  assert.notEqual(r.status, "published");
  assert.equal(r.status, "awaiting_production_deploy");
  assert.deepEqual(r.failedChecks, ["indexListsArticle"]);
});

test("3. HTTP 5xx (httpStatus.ok=false) は failed", () => {
  const checks = homepageMisdeliveryChecks();
  checks.httpStatus = { ok: false, actual: 502 };
  const r = evaluateVerify({ checks });
  assert.equal(r.status, "failed");
});

// ----- deploy script: --slug 未指定で引数エラー -----

test("4. deploy script は --slug 未指定で exit 2", () => {
  const script = join(ROOT, "scripts", "automation", "deploy-production-from-main.mjs");
  const r = spawnSync(process.execPath, [script], { encoding: "utf-8" });
  assert.equal(r.status, 2, `expected exit code 2, got ${r.status}. stderr=${r.stderr}`);
  // result JSON にも slug = null が記録されている
  assert.match(r.stdout, /"errorReason":\s*"missing_or_invalid_slug"/);
});

// ----- deploy script: dry-run で wrangler を呼ばずに完走 (build 込みは重いので skip-build) -----

test("5. deploy script dry-run (--skip-build --skip-git-sync --no-verify) は exit 1 (dist 不在) で result JSON を出力し、secret 値を漏らさない", () => {
  // dist が存在しなければ distCheck で failed → exit 1。
  // ここで検証したいのは：
  //   - script が起動できる
  //   - result JSON に secret 値が出ない
  const script = join(ROOT, "scripts", "automation", "deploy-production-from-main.mjs");
  const r = spawnSync(
    process.execPath,
    [
      script,
      "--slug=production-deploy-test-only-not-real",
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
  assert.match(r.stdout, /"slug":\s*"production-deploy-test-only-not-real"/);
  assert.match(r.stdout, /"dryRun":\s*true/);
});

test("6. 本番反映コマンド hint には secret / token / URL を含まない", () => {
  // verify-publication / deploy処理で使う共通定数
  const hint = PRODUCTION_DEPLOY_COMMAND_HINT;
  assert.ok(!/https?:\/\//.test(hint), "hint に URL を含めないこと");
  assert.ok(!/bearer/i.test(hint), "hint に Bearer token を含めないこと");
  assert.ok(!/secret|hook[_-]?url|api[_-]?token/i.test(hint), "hint に secret 名を含めないこと");
  assert.ok(hint.includes("deploy:production"), "hint は npm run deploy:production を案内すること");
});
