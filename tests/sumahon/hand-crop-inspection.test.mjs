import test from "node:test";
import assert from "node:assert/strict";
import { applyStructuralOverrides, buildHandCropPrompt, collectVisibleHands, normalizeNoHandInCrop, paddedPixelBox, summarizeVerdicts, validateAgentResult, validateBbox } from "../../scripts/sumahon/hand-crop-inspection.mjs";
import { evaluateHandCropGate } from "../../scripts/run/hand-crop-gate.mjs";

test("手が見える画像だけを二段検品対象にする", () => {
  const inspection = {
    slides: [
      { id: "slide01", handChecks: [] },
      { id: "slide02", handChecks: [{ character: "himari", side: "left", bbox: { x: 100, y: 200, width: 100, height: 120 } }] },
    ],
    thumbnail: { handChecks: [] },
  };
  assert.deepEqual(collectVisibleHands(inspection, { slide01: "a.webp", slide02: "b.webp", thumbnail: "t.webp" }).map((x) => x.id), ["slide02"]);
});

test("bbox は余白を足しても画像の範囲内に収める", () => {
  assert.deepEqual(paddedPixelBox({ x: 0, y: 900, width: 100, height: 100 }, 1600, 900), { left: 0, top: 769, width: 232, height: 131 });
});

test("欠落・範囲外bboxを拒否する", () => {
  assert.throws(() => validateBbox(null), /bbox/);
  assert.throws(() => validateBbox({ x: 950, y: 0, width: 100, height: 10 }), /範囲外/);
});

test("判定内訳は画像単位で集計する", () => {
  assert.deepEqual(summarizeVerdicts([{ verdict: "ok" }, { verdict: "warning" }, { verdict: "needs_revision" }, { verdict: "warning" }]), { ok: 1, warning: 2, needs_revision: 1 });
});

test("同一キャラの3本目の手はagent判定にかかわらず公開ブロック", () => {
  const hands = Array.from({ length: 3 }, () => ({ character: "himari" }));
  const result = applyStructuralOverrides({ images: [{ id: "thumbnail", verdict: "ok", checks: [] }] }, [{ id: "thumbnail", handChecks: hands }]);
  assert.equal(result.images[0].verdict, "needs_revision");
  assert.match(result.images[0].checks[0].note, /3 件/);
});

test("agentの画像・部位回答欠落を公開前に拒否する", () => {
  const items = [{ id: "slide01", handChecks: [{}, {}] }];
  assert.throws(() => validateAgentResult({ images: [] }, items), /画像を返していません/);
  assert.throws(() => validateAgentResult({ images: [{ id: "slide01", verdict: "ok", checks: [{}] }] }, items), /部位回答が不足/);
});

test("公開前ゲートはneeds_revisionをブロックしwarningは通す", () => {
  assert.equal(evaluateHandCropGate({ verdictCounts: { warning: 1, needs_revision: 0 }, sourceImagesInspected: 2 }).pass, true);
  assert.equal(evaluateHandCropGate({ verdictCounts: { warning: 0, needs_revision: 1 } }).pass, false);
  assert.equal(evaluateHandCropGate({}).pass, false);
});


test("no_hand_in_crop is non-blocking", () => {
  const result = normalizeNoHandInCrop({
    images: [{
      id: "slide01",
      verdict: "needs_revision",
      checks: [{
        label: "slide01-hand1",
        handVisible: false,
        observedSide: "left",
        sideNatural: false,
        thumbNatural: false,
        connectionNatural: false,
        proportionsNatural: false,
        severity: "needs_revision",
        note: "crop contains background only",
      }],
    }],
  });
  assert.equal(result.images[0].verdict, "ok");
  assert.equal(result.images[0].checks[0].severity, "no_hand_in_crop");
  assert.equal(result.images[0].checks[0].observedSide, "unclear");
});

test("invisible first-pass hands do not advance to crop generation", () => {
  const inspection = {
    slides: [{ id: "slide01", handChecks: [{ character: "himari", visible: false, bbox: { x: 1, y: 1, width: 10, height: 10 } }] }],
    thumbnail: { handChecks: [{ character: "labomaru", visible: false, bbox: { x: 1, y: 1, width: 10, height: 10 } }] },
  };
  assert.deepEqual(collectVisibleHands(inspection, { slide01: "a.webp", thumbnail: "t.webp" }), []);
});

test("no_hand_in_crop checks are excluded from topology counts", () => {
  const hands = Array.from({ length: 3 }, () => ({ character: "himari" }));
  const checks = hands.map((_, index) => ({
    label: "thumbnail-hand" + (index + 1),
    handVisible: false,
    observedSide: "unclear",
    sideNatural: true,
    thumbNatural: true,
    connectionNatural: true,
    proportionsNatural: true,
    severity: "no_hand_in_crop",
    note: "no hand",
  }));
  const result = applyStructuralOverrides({ images: [{ id: "thumbnail", verdict: "ok", checks }] }, [{ id: "thumbnail", handChecks: hands }]);
  assert.equal(result.images[0].verdict, "ok");
});

test("second-pass prompt does not expose expectedSide", () => {
  const prompt = buildHandCropPrompt([{ id: "slide01", cropFile: "crop.png", handChecks: [{ character: "himari", side: "left" }] }]);
  assert.equal(prompt.includes("expectedSide"), false);
  assert.match(prompt, /no_hand_in_crop/);
  assert.match(prompt, /同一の手の内部/);
});
