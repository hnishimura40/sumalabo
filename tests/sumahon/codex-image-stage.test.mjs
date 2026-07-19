import assert from "node:assert/strict";
import test from "node:test";

import {
  FALLBACK_CONDITIONS,
  parseSlidePlan,
} from "../../scripts/automation/codex-image-stage.mjs";

test("parseSlidePlan extracts thumbnail and slide01-08 but stops before memo headings", () => {
  const text = [
    "# plan",
    "## thumbnail（16:9）",
    "- 入れる文字: テスト",
    "## slide01（4:5）",
    "- 見出し帯: 一枚目",
    "## 生成メモ",
    "- slide01 の説明に混ぜない",
  ].join("\n");
  const items = parseSlidePlan(text);
  assert.deepEqual(items.map((item) => item.id), ["thumbnail", "slide01"]);
  assert.equal(items[0].width, 1600);
  assert.equal(items[0].height, 900);
  assert.equal(items[1].width, 1122);
  assert.equal(items[1].height, 1402);
  assert.doesNotMatch(items[1].section, /生成メモ/);
});

test("fallback policy has the approved seven distinct conditions", () => {
  assert.equal(FALLBACK_CONDITIONS.length, 7);
  assert.equal(new Set(FALLBACK_CONDITIONS).size, 7);
  assert.ok(FALLBACK_CONDITIONS.includes("japanese_text_mismatch"));
  assert.ok(FALLBACK_CONDITIONS.includes("character_anchor_mismatch"));
  assert.ok(FALLBACK_CONDITIONS.includes("targeted_retry_exhausted"));
});

