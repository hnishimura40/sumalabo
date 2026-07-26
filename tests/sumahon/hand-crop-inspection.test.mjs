import test from "node:test";
import assert from "node:assert/strict";
import { applyStructuralOverrides, collectVisibleHands, paddedPixelBox, summarizeVerdicts, validateAgentResult, validateBbox } from "../../scripts/sumahon/hand-crop-inspection.mjs";
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
