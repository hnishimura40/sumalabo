import test from "node:test";
import assert from "node:assert/strict";
import { filterReportOutput, sanitizeReportText } from "../../scripts/sumahon/filter-report-output.mjs";

test("report filter removes every line beginning with double colon", () => {
  const input = [
    "記事URL: https://sumalabo.com/articles/example/",
    "::git-stage{cwd=repo}",
    "  ::git-push{branch=main}",
    "検証: 4/4",
    "",
  ].join("\r\n");
  const result = filterReportOutput(input);
  assert.equal(result.removed, 2);
  assert.equal(result.output, "記事URL: https://sumalabo.com/articles/example/\n検証: 4/4\n");
  assert.equal(result.output.includes("::"), false);
});

test("report filter keeps inline double colon that is not a directive line", () => {
  assert.equal(sanitizeReportText("URL scheme example: value::part\n"), "URL scheme example: value::part\n");
});

test("report filter is idempotent", () => {
  const once = sanitizeReportText("ok\n::hidden\ndone\n");
  assert.equal(sanitizeReportText(once), once);
});
