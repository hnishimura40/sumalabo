import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildNightTaskCommand,
  validateNightTaskXml,
} from "../../scripts/automation/register-night-task.mjs";

const root = "D:\\documents\\動画作成関連\\すまラボ";
const taskXml = (argumentsText) => `<Task><Actions><Exec><Command>powershell.exe</Command><Arguments>${argumentsText}</Arguments></Exec></Actions></Task>`;

test("本番タスクコマンドにtestMode・dryRun・自己診断フラグを含めない", () => {
  const command = buildNightTaskCommand(root);
  assert.doesNotMatch(command, /-(?:RunnerSelfTest|BrowserCheckOnly|DryRun|TestMode)\b/i);
  assert.match(command, /night-run\.ps1"$/);
  const args = command.replace(/^powershell\.exe\s+/i, "");
  assert.deepEqual(validateNightTaskXml(taskXml(args), root).problems, []);
});

for (const flag of ["-RunnerSelfTest", "-BrowserCheckOnly", "-DryRun", "-TestMode"]) {
  test(`実登録XMLは${flag}を拒否する`, () => {
    const args = buildNightTaskCommand(root).replace(/^powershell\.exe\s+/i, "") + ` ${flag}`;
    const result = validateNightTaskXml(taskXml(args), root);
    assert.equal(result.ok, false);
    assert.ok(result.problems.includes("test_flag_present"));
  });
}
test("恒久運転の通知タイトルに旧[testMode]ラベルを残さない", () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const wrapperPath = join(repoRoot, "scripts", "automation", "night-run.ps1");
  const wrapperBytes = readFileSync(wrapperPath);
  assert.deepEqual([...wrapperBytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], "Windows PowerShell 5.1向けUTF-8 BOMが必要");
  const wrapper = wrapperBytes.toString("utf8");
  assert.doesNotMatch(wrapper, /title:'\[testMode\]/);
  assert.match(wrapper, /title:'\[夜間run\]/);
  const report = readFileSync(join(repoRoot, "scripts", "automation", "night-report.mjs"), "utf8");
  assert.doesNotMatch(report, /\[testMode\]/);
  assert.match(report, /\[夜間run\]/);
});
test("invalid scheduled acceptance fails closed before the article pipeline", () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
  const wrapperPath = join(repoRoot, "scripts", "automation", "night-run.ps1");
  const source = readFileSync(wrapperPath, "utf-8");
  assert.match(source, /invalid_or_expired_acceptance_request/);
  assert.equal((source.match(/articlePipelineStarted=\$false/g) ?? []).length, 2);
  assert.match(source, /SCHEDULED ACCEPTANCE REJECTED[\s\S]*exit 4[\s\S]*# ---- 3\. ヘッドレス Claude Code 起動 ----/);
  assert.doesNotMatch(source, /不正な scheduled acceptance request[^\r\n]*本番運転を継続/);
});