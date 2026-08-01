import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeNotificationItem } from "../../scripts/sumahon/notify-review-ready.mjs";
import { sanitizeReportText } from "../../scripts/sumahon/filter-report-output.mjs";

const contaminated = "完了\n::git-push{branch=main}\n  ::internal-control\n記事URL: https://sumalabo.com/";

test("共通Web Push経路は制御行を除去する", () => {
  const item = sanitizeNotificationItem({
    slug: "test-report-route",
    title: contaminated,
    previewUrl: "https://sumalabo.com/review/",
    status: "published",
  });
  assert.equal(item.title.includes("::"), false);
  assert.match(item.title, /記事URL/);
});

test("Codex・夜間・無人Xの最終段は同一フィルタで除去できる", () => {
  for (const route of ["codex", "night-run", "unattended-x", "repair-session"]) {
    const output = sanitizeReportText(route + "\n" + contaminated);
    assert.equal(output.includes("::"), false, route);
    assert.match(output, /記事URL/, route);
  }
});
