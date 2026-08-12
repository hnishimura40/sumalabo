import test from "node:test";
import assert from "node:assert/strict";

import { accountIdentityJs, postExistsJs, replyExistsJs, VERIFY_LOOP_STEPS } from "../../scripts/sumahon/x-post-verify.mjs";

function runAccountSnippet(nodes, expected = "@suma_labo") {
  const document = {
    querySelectorAll(selector) {
      return nodes.filter((node) => node.selectors.includes(selector));
    }
  };
  return JSON.parse(Function("document", `return ${accountIdentityJs(expected)}`)(document));
}

function accountNode({ text = "", ariaLabel = "", href = "" } = {}) {
  return {
    innerText: text,
    selectors: ['[data-testid="SideNav_AccountSwitcher_Button"]', '[data-testid="AppTabBar_Profile_Link"]'],
    getAttribute(name) {
      return { "aria-label": ariaLabel, href }[name] || "";
    }
  };
}

test("account verification is scoped to account DOM and the requested handle", () => {
  const snippet = accountIdentityJs("@suma_labo");
  assert.match(snippet, /SideNav_AccountSwitcher_Button/);
  assert.match(snippet, /@suma_labo/);
  assert.match(snippet, /confirmed/);
});

test("account verification accepts the 8/12 real DOM shape by exact case-insensitive profile href", () => {
  const actual = runAccountSnippet([
    accountNode({ text: "すまラボ｜スマホ・AIをやさしく整理", href: "/SUMA_LABO" })
  ]);
  assert.equal(actual.confirmed, true);
  assert.equal(actual.hrefMatched, true);
  assert.equal(actual.textMatched, false);
});

test("account verification records matching handle text as corroborating evidence", () => {
  const actual = runAccountSnippet([
    accountNode({ text: "すまラボ｜スマホ・AIをやさしく整理 @suma_labo", href: "/suma_labo" })
  ]);
  assert.equal(actual.confirmed, true);
  assert.equal(actual.hrefMatched, true);
  assert.equal(actual.textMatched, true);
});

test("account verification fails closed when profile href belongs to another account", () => {
  const actual = runAccountSnippet([
    accountNode({ text: "@suma_labo", href: "/different_account" })
  ]);
  assert.equal(actual.confirmed, false);
  assert.equal(actual.hrefMatched, false);
  assert.equal(actual.textMatched, true);
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
