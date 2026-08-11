import test from "node:test";
import assert from "node:assert/strict";
import { findDuplicate } from "../../scripts/automation/scout.mjs";

test("publisher suffix does not hide the 8/11 already-covered Maps announcement", () => {
  const known = [
    "Google マップ、対話形式で検索できる「マップに相談」を日本で提供開始　Gemini連携で複雑な条件の検索に対応",
  ];
  const duplicate = findDuplicate(
    { title: "Geminiとの会話でGoogleマップを検索できる「マップに相談」、国内でも提供開始 - PC Watch" },
    known,
  );
  assert.ok(duplicate);
  assert.ok(duplicate.similarity >= 0.3);
});
