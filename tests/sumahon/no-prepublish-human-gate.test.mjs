import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("本番deployはrun-mode=attendedでも人手承認を要求しない", () => {
  const source = readFileSync(join(ROOT, "scripts", "automation", "deploy-production-from-main.mjs"), "utf8");
  assert.equal(source.includes("verifyAttendedReview"), false);
  assert.equal(source.includes("attended_image_review_missing"), false);
  assert.match(source, /prepublishHumanReview.*machine_qa_only/s);
});

test("公開前の人待ちゲート新設禁止が最上位ルールにある", () => {
  const policy = readFileSync(join(ROOT, "CLAUDE.md"), "utf8");
  assert.match(policy, /公開前に人の確認・応答を待つゲートを新設してはならない/);
});
