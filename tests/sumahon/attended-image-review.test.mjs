import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
import {
  approveAttendedReview,
  prepareAttendedReview,
  verifyAttendedReview,
} from "../../scripts/automation/attended-image-review.mjs";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "attended-review-"));
  const slug = "test-attended-article";
  const reviewRoot = join(root, "reviews");
  const slides = join(root, "public", "images", "articles", slug);
  const thumbs = join(root, "public", "images", "thumbnails");
  mkdirSync(slides, { recursive: true });
  mkdirSync(thumbs, { recursive: true });
  writeFileSync(join(thumbs, slug + ".webp"), "thumbnail");
  for (let i = 1; i <= 8; i++) writeFileSync(join(slides, "slide" + String(i).padStart(2, "0") + ".webp"), "slide-" + i);
  return { root, slug, reviewRoot, changed: join(slides, "slide01.webp") };
}

test("立ち会い画像確認は9枚・30秒・Hiro明示承認を要求する", () => {
  const f = fixture();
  try {
    const preparedAt = new Date("2026-07-29T00:00:00.000Z");
    const pending = prepareAttendedReview(f.slug, { repoRoot: f.root, reviewRoot: f.reviewRoot, now: preparedAt });
    assert.equal(pending.images.length, 9);
    assert.equal(pending.status, "pending");

    const early = approveAttendedReview(f.slug, {
      repoRoot: f.root, reviewRoot: f.reviewRoot, now: new Date("2026-07-29T00:00:29.000Z"),
      reviewer: "Hiro", confirmViewedAll: 9,
    });
    assert.equal(early.reason, "review_30_seconds_not_elapsed");

    const noExplicitApproval = approveAttendedReview(f.slug, {
      repoRoot: f.root, reviewRoot: f.reviewRoot, now: new Date("2026-07-29T00:00:30.000Z"),
      reviewer: "Codex", confirmViewedAll: 9,
    });
    assert.equal(noExplicitApproval.reason, "explicit_hiro_confirmation_required");

    const approved = approveAttendedReview(f.slug, {
      repoRoot: f.root, reviewRoot: f.reviewRoot, now: new Date("2026-07-29T00:00:30.000Z"),
      reviewer: "Hiro", confirmViewedAll: 9,
    });
    assert.equal(approved.ok, true);
    assert.equal(verifyAttendedReview(f.slug, { repoRoot: f.root, reviewRoot: f.reviewRoot }).ok, true);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test("承認後に画像が変わると公開承認を無効化する", () => {
  const f = fixture();
  try {
    prepareAttendedReview(f.slug, { repoRoot: f.root, reviewRoot: f.reviewRoot, now: new Date("2026-07-29T00:00:00.000Z") });
    approveAttendedReview(f.slug, {
      repoRoot: f.root, reviewRoot: f.reviewRoot, now: new Date("2026-07-29T00:00:31.000Z"),
      reviewer: "Hiro", confirmViewedAll: 9,
    });
    writeFileSync(f.changed, "regenerated-after-approval");
    assert.equal(
      verifyAttendedReview(f.slug, { repoRoot: f.root, reviewRoot: f.reviewRoot }).reason,
      "attended_images_changed_after_approval",
    );
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test("立ち会いmodeの本番deployは承認証跡なしで前段ブロックする", () => {
  const emptyReviewRoot = mkdtempSync(join(tmpdir(), "attended-empty-"));
  try {
    const run = spawnSync(process.execPath, [
      join(REPO_ROOT, "scripts", "automation", "deploy-production-from-main.mjs"),
      "--slug=missing-attended-review", "--run-mode=attended", "--skip-build", "--skip-git-sync",
    ], { cwd: REPO_ROOT, encoding: "utf8", env: { ...process.env, SUMALABO_ATTENDED_REVIEW_ROOT: emptyReviewRoot } });
    assert.equal(run.status, 1);
    assert.match(run.stdout, /"errorReason":\s*"attended_image_review_missing"/);
    assert.match(run.stdout, /"gitSync":\s*\{\s*"status":\s*"skipped"/);
  } finally {
    rmSync(emptyReviewRoot, { recursive: true, force: true });
  }
});
