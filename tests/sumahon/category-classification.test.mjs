import test from "node:test";
import assert from "node:assert/strict";
import { classifyArticleCategory } from "../../scripts/sumahon/category-classification.mjs";

test("当サイトの実体験・検証をhands-onに分類する", () => {
  assert.equal(classifyArticleCategory("本サイトの運用実例を体験ベースで整理").slug, "hands-on");
});

test("通常の公式発表はnewsに分類する", () => {
  assert.equal(classifyArticleCategory("新製品の公式発表を整理").slug, "news");
});
