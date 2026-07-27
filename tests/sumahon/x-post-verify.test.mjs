import test from "node:test";
import assert from "node:assert/strict";

import { accountIdentityJs, postExistsJs, replyExistsJs, VERIFY_LOOP_STEPS } from "../../scripts/sumahon/x-post-verify.mjs";

test("account verification is scoped to account DOM and the requested handle", () => {
  const snippet = accountIdentityJs("@suma_labo");
  assert.match(snippet, /SideNav_AccountSwitcher_Button/);
  assert.match(snippet, /@suma_labo/);
  assert.match(snippet, /confirmed/);
});

test("post and reply verification snippets preserve unique text safely", () => {
  const needle = "引用符'と\"日本語";
  const main = postExistsJs(needle);
  const reply = replyExistsJs(needle, "1234567890");
  assert.match(main, /confirmed/);
  assert.match(main, /duplicate/);
  assert.match(reply, /parentId/);
  assert.match(reply, /1234567890/);
  assert.match(reply, /confirmed/);
});

test("the documented loop requires both reply checks before recording", () => {
  const text = VERIFY_LOOP_STEPS.join("\n");
  assert.match(text, /N→N\+1/);
  assert.match(text, /replyExistsJs/);
  assert.match(text, /count===1/);
  assert.match(text, /--record-reply/);
});
