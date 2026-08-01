import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  analyzeResponse,
  buildStructuredRetryPrompt,
  extractLatestAssistant,
  runHealthCheck,
} from "../../scripts/automation/chatgpt-response-health.mjs";

const execFileAsync = promisify(execFile);
const SCRIPT = join(process.cwd(), "scripts", "automation", "chatgpt-response-health.mjs");

function message(id, role, text, createTime) {
  return {
    id,
    message: {
      id,
      author: { role },
      create_time: createTime,
      content: { parts: [text] },
    },
  };
}

const completeReport = `# 調査報告

## 確定事項

公式発表で確認できた事実を、日付、対象地域、提供条件とともに整理した本文です。読者が誤解しないよう、現在の条件と過去の条件を分けて説明します。

## 主張と根拠

複数の一次情報を突き合わせ、発表主体の主張と第三者が確認した内容を区別します。数字には時点を付け、比較条件も本文中に残します。

## 未確定事項

公式に示されていない将来予定は未確定として扱い、推測で空白を埋めません。追加発表があった場合に更新すべき点も明示します。

## 読者への意味

普通の利用者が今すぐ対応すべきことと、待ってよいことを分けます。判断材料は残しつつ、不安や期待を過度に煽らない結論にします。
`;

test("current_node の正規ブランチを使い、挿入順末尾の引用メタデータを選ばない", () => {
  const junk = "# Sources\n\nciteturn0search0";
  const raw = {
    current_node: "tail",
    mapping: {
      root: { id: "root", parent: null, ...message("root-message", "user", "依頼", 1) },
      answer: { ...message("answer", "assistant", completeReport, 2), parent: "root" },
      tail: { id: "tail", parent: "answer", message: null },
      appended_junk: { ...message("junk", "assistant", junk, 99), parent: "root" },
    },
  };
  const extracted = extractLatestAssistant(raw);
  assert.equal(extracted.source, "current_node_parent_chain");
  assert.equal(extracted.messageId, "answer");
  assert.match(extracted.text, /読者への意味/);
});

test("本文のある調査出力は引用数が多くても healthy", () => {
  const expanded = `${completeReport}\n${completeReport}\n${completeReport}`;
  const text = `${expanded}\n${Array.from({ length: 29 }, (_, i) => `citeturn${i}search0`).join(" ")}`;
  const result = analyzeResponse(text, { step: "chatgpt_turn1_research" });
  assert.equal(result.healthy, true, result.reasons.join(","));
  assert.equal(result.citations, 29);
  assert.ok(result.proseChars >= 600);
});

test("DOM救済は画面側の見出し数を使い、Markdown記号消失を空本文と誤判定しない", () => {
  const rendered = completeReport.replace(/^#{1,6}\s+/gm, "");
  const raw = { output: `${rendered}\n${rendered}\n${rendered}`, metrics: { h1: 1, h2: 7, paragraphs: 12 } };
  const result = runHealthCheck({ raw, step: "chatgpt_turn1_research", attempt: 1 });
  assert.equal(result.metrics.healthy, true, result.metrics.reasons.join(","));
  assert.equal(result.metrics.headings, 8);
});

test("H1 と引用チップだけは不健全と判定し、情報を削らない1回限りの構造化リトライを作る", () => {
  const raw = { output: `# 調査報告\n\n${Array.from({ length: 29 }, () => "citeturn0search0").join(" ")}` };
  const original = "# Research Pass\n\n## 必須構成\n- 公式一次情報をすべて使う\n- 画像は9枚\n";
  const first = runHealthCheck({ raw, step: "chatgpt_turn1_research", attempt: 1, originalPrompt: original });
  assert.equal(first.metrics.healthy, false);
  assert.ok(first.retryPrompt);
  assert.match(first.retryPrompt, /調査量・参照サイト・引用は減らさず/);
  assert.match(first.retryPrompt, /画像は再生成しません/);
  assert.match(first.retryPrompt, /公式一次情報をすべて使う/);

  const second = runHealthCheck({ raw, step: "chatgpt_turn1_research", attempt: 2, originalPrompt: original });
  assert.equal(second.metrics.healthy, false);
  assert.equal(second.retryPrompt, null);
});

test("CLI は1回目の空本文を exit 12、2回目を exit 20 で停止する", async () => {
  const dir = mkdtempSync(join(tmpdir(), "sumalabo-response-health-"));
  try {
    const input = join(dir, "raw.json");
    const prompt = join(dir, "prompt.md");
    writeFileSync(input, JSON.stringify({ output: "# 調査報告\n\nciteturn0search0" }), "utf8");
    writeFileSync(prompt, "# Research Pass\n\n- 全調査を維持", "utf8");

    for (const [attempt, expected] of [["1", 12], ["2", 20]]) {
      const output = join(dir, `out-${attempt}.md`);
      const report = join(dir, `report-${attempt}.json`);
      let status = 0;
      try {
        await execFileAsync(process.execPath, [SCRIPT, "--input", input, "--output", output, "--report", report, "--step", "chatgpt_turn1_research", "--attempt", attempt, "--original-prompt", prompt]);
      } catch (error) {
        status = error.code;
      }
      assert.equal(status, expected);
      const parsed = JSON.parse(readFileSync(report, "utf8"));
      assert.equal(parsed.healthy, false);
      assert.equal(Boolean(parsed.retryPromptPath), attempt === "1");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("実出力トークン値が raw JSON にあれば推定値と分けて保存する", () => {
  const result = analyzeResponse(completeReport, {
    step: "chatgpt_turn1_research",
    raw: { usage: { output_tokens: 987 } },
  });
  assert.equal(result.outputTokensActual, 987);
  assert.ok(result.outputTokensEstimated > 0);
});
