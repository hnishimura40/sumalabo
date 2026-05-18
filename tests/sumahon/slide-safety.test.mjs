// tests/sumahon/slide-safety.test.mjs
//
// PR-B post-review 安全テスト: prompt artifact だけある状態で
// preview_created / awaiting_import に進まないことを検証する。
//
// PowerShell orchestrator のロジックを直接呼ぶのは難しいので、ここでは
// resolveResumePoint と slide-ready.json マーカーの判定に相当する条件を
// JavaScript で再現したミニ resolveResumePoint を用意し、orchestrator と
// 同じルールで判定できることを確認する。
//
// 検証ケース:
//   1. feature flag off  →  既存フローと同じ ResumeStage を返す
//   2. slideNeeded=false →  slide-ready.json があれば thumbnail に進む
//   3. slideNeeded=true / prompts のみ → slide_draft_generation に戻る (NOT thumbnail / NOT awaiting_import)
//   4. slideNeeded=true / images 不足 → slide_draft_generation
//   5. slideNeeded=true / factcheck.json 不在 → slide_factcheck (NOT thumbnail)
//   6. slide-ready.json ありなら thumbnail に進む

import { test } from "node:test";
import assert from "node:assert/strict";

// ----- mini resolveResumePoint mirroring the PowerShell logic -----

function resolveResumePoint(state) {
  const {
    slidePipelineEnabled,
    hasArticlePrompt,
    hasDraft,
    hasThumbnail,
    hasSlidePlan,
    slideNeeded,
    allSlidePromptsExist,
    allSlideImagesExist,
    hasSlideFactcheck,
    slideRevisionNeeded,
    hasSlideReadyMarker,
  } = state;

  let ResumeStage = "phase_a";
  if (hasArticlePrompt) ResumeStage = "phase_b";
  if (hasDraft) {
    if (slidePipelineEnabled) {
      ResumeStage = "slide_plan_finalize";
      if (hasSlidePlan) {
        if (!slideNeeded) {
          ResumeStage = hasSlideReadyMarker ? "thumbnail" : "slide_plan_finalize";
        } else if (!allSlidePromptsExist || !allSlideImagesExist) {
          ResumeStage = "slide_draft_generation";
        } else if (!hasSlideFactcheck) {
          ResumeStage = "slide_factcheck";
        } else if (slideRevisionNeeded) {
          ResumeStage = "slide_revision";
        } else if (hasSlideReadyMarker) {
          ResumeStage = "thumbnail";
        } else {
          ResumeStage = "slide_factcheck";
        }
      }
    } else {
      ResumeStage = "thumbnail";
    }
  }
  if (hasDraft && hasThumbnail) {
    if (slidePipelineEnabled) {
      if (hasSlideReadyMarker) {
        ResumeStage = "import_generated";
      }
    } else {
      ResumeStage = "import_generated";
    }
  }
  return ResumeStage;
}

// ----- tests -----

test("1. feature flag OFF: ResumeStage matches legacy behavior", () => {
  const state = {
    slidePipelineEnabled: false,
    hasArticlePrompt: true,
    hasDraft: true,
    hasThumbnail: false,
    hasSlidePlan: false,
    slideNeeded: true,
    allSlidePromptsExist: false,
    allSlideImagesExist: false,
    hasSlideFactcheck: false,
    slideRevisionNeeded: false,
    hasSlideReadyMarker: false,
  };
  // With pipeline off, draft alone (no thumbnail) → thumbnail
  assert.equal(resolveResumePoint(state), "thumbnail");
  // With pipeline off + thumbnail → import_generated (no slide-ready needed)
  assert.equal(
    resolveResumePoint({ ...state, hasThumbnail: true }),
    "import_generated",
  );
});

test("2. slideNeeded=false: slide-ready marker required to advance to thumbnail", () => {
  // marker absent → stays at slide_plan_finalize (so orchestrator re-emits marker)
  assert.equal(
    resolveResumePoint({
      slidePipelineEnabled: true,
      hasArticlePrompt: true,
      hasDraft: true,
      hasThumbnail: false,
      hasSlidePlan: true,
      slideNeeded: false,
      allSlidePromptsExist: true,  // vacuously true for 0 slides
      allSlideImagesExist: true,
      hasSlideFactcheck: false,
      slideRevisionNeeded: false,
      hasSlideReadyMarker: false,
    }),
    "slide_plan_finalize",
  );
  // marker present → thumbnail
  assert.equal(
    resolveResumePoint({
      slidePipelineEnabled: true,
      hasArticlePrompt: true,
      hasDraft: true,
      hasThumbnail: false,
      hasSlidePlan: true,
      slideNeeded: false,
      allSlidePromptsExist: true,
      allSlideImagesExist: true,
      hasSlideFactcheck: false,
      slideRevisionNeeded: false,
      hasSlideReadyMarker: true,
    }),
    "thumbnail",
  );
});

test("3. slideNeeded=true / prompts only: NEVER advance to thumbnail / import", () => {
  const r = resolveResumePoint({
    slidePipelineEnabled: true,
    hasArticlePrompt: true,
    hasDraft: true,
    hasThumbnail: false,
    hasSlidePlan: true,
    slideNeeded: true,
    allSlidePromptsExist: true,
    allSlideImagesExist: false,  // images missing
    hasSlideFactcheck: false,
    slideRevisionNeeded: false,
    hasSlideReadyMarker: false,
  });
  assert.equal(r, "slide_draft_generation");
  assert.notEqual(r, "thumbnail");
  assert.notEqual(r, "import_generated");
  assert.notEqual(r, "awaiting_import");
});

test("4. slideNeeded=true / images missing: routes back to slide_draft_generation", () => {
  // Even with thumbnail present, slide-ready missing blocks import_generated
  assert.equal(
    resolveResumePoint({
      slidePipelineEnabled: true,
      hasArticlePrompt: true,
      hasDraft: true,
      hasThumbnail: true,  // thumbnail done but slides missing
      hasSlidePlan: true,
      slideNeeded: true,
      allSlidePromptsExist: true,
      allSlideImagesExist: false,
      hasSlideFactcheck: false,
      slideRevisionNeeded: false,
      hasSlideReadyMarker: false,
    }),
    "slide_draft_generation",
  );
});

test("5. slideNeeded=true / factcheck.json absent: routes to slide_factcheck (NOT thumbnail)", () => {
  const r = resolveResumePoint({
    slidePipelineEnabled: true,
    hasArticlePrompt: true,
    hasDraft: true,
    hasThumbnail: false,
    hasSlidePlan: true,
    slideNeeded: true,
    allSlidePromptsExist: true,
    allSlideImagesExist: true,  // images ready
    hasSlideFactcheck: false,   // but factcheck missing
    slideRevisionNeeded: false,
    hasSlideReadyMarker: false,
  });
  assert.equal(r, "slide_factcheck");
  assert.notEqual(r, "thumbnail");
});

test("6. all slide artifacts + slide-ready marker present: advance to thumbnail", () => {
  const r = resolveResumePoint({
    slidePipelineEnabled: true,
    hasArticlePrompt: true,
    hasDraft: true,
    hasThumbnail: false,
    hasSlidePlan: true,
    slideNeeded: true,
    allSlidePromptsExist: true,
    allSlideImagesExist: true,
    hasSlideFactcheck: true,
    slideRevisionNeeded: false,
    hasSlideReadyMarker: true,
  });
  assert.equal(r, "thumbnail");

  // With thumbnail also present → import_generated
  const r2 = resolveResumePoint({
    slidePipelineEnabled: true,
    hasArticlePrompt: true,
    hasDraft: true,
    hasThumbnail: true,
    hasSlidePlan: true,
    slideNeeded: true,
    allSlidePromptsExist: true,
    allSlideImagesExist: true,
    hasSlideFactcheck: true,
    slideRevisionNeeded: false,
    hasSlideReadyMarker: true,
  });
  assert.equal(r2, "import_generated");
});

test("7. slideRevisionNeeded=true: routes to slide_revision (not thumbnail) even if all images present", () => {
  const r = resolveResumePoint({
    slidePipelineEnabled: true,
    hasArticlePrompt: true,
    hasDraft: true,
    hasThumbnail: false,
    hasSlidePlan: true,
    slideNeeded: true,
    allSlidePromptsExist: true,
    allSlideImagesExist: true,
    hasSlideFactcheck: true,
    slideRevisionNeeded: true,  // revision needed
    hasSlideReadyMarker: false,  // marker should not be emitted yet
  });
  assert.equal(r, "slide_revision");
});

test("8. all artifacts present BUT slide-ready marker absent: stay at slide_factcheck (re-emit marker path)", () => {
  // Simulates orchestrator picked up a half-completed run where image gen +
  // factcheck happened but marker wasn't written. Should re-evaluate and
  // emit marker, not jump to thumbnail.
  const r = resolveResumePoint({
    slidePipelineEnabled: true,
    hasArticlePrompt: true,
    hasDraft: true,
    hasThumbnail: false,
    hasSlidePlan: true,
    slideNeeded: true,
    allSlidePromptsExist: true,
    allSlideImagesExist: true,
    hasSlideFactcheck: true,
    slideRevisionNeeded: false,
    hasSlideReadyMarker: false,
  });
  assert.equal(r, "slide_factcheck");
});
