import test from "node:test";
import assert from "node:assert/strict";
import { findProductNameVariants, formalProductNamesChecklist } from "../../scripts/sumahon/formal-product-names.mjs";

test("正式表記リストは誤記を検出する", () => {
  const findings = findProductNameVariants("Claude for Chrome と Chat GPT を使う");
  assert.deepEqual(findings.map((item) => item.canonical), ["Claude in Chrome", "ChatGPT"]);
});

test("正式表記だけなら検出しない", () => {
  assert.equal(findProductNameVariants("Claude in Chrome / ChatGPT / Cowork / Codex / Claude Code").length, 0);
  assert.match(formalProductNamesChecklist(), /Claude in Chrome/);
});
