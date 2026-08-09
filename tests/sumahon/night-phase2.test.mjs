import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (relative) => readFileSync(path.join(ROOT, relative), "utf8");

test("approval endpoint and component are removed while veto remains", () => {
  assert.equal(existsSync(path.join(ROOT, "functions/api/approve-preview.ts")), false);
  assert.equal(existsSync(path.join(ROOT, "src/components/PreviewApprovalButton.astro")), false);
  assert.equal(existsSync(path.join(ROOT, "functions/api/veto-preview.ts")), true);
  const vetoUi = read("src/components/PreviewVetoButton.astro");
  assert.match(vetoUi, /\/api\/veto-preview/);
  assert.doesNotMatch(vetoUi, /approve-preview|GITHUB_TOKEN/);
});

test("Cloudflare Functions no longer reference the retired GITHUB_TOKEN", () => {
  const functionDir = path.join(ROOT, "functions/api");
  const files = readdirSync(functionDir, { recursive: true }).filter((name) => /\.(?:ts|js)$/i.test(name));
  const matches = files.filter((name) => readFileSync(path.join(functionDir, name), "utf8").includes("GITHUB_TOKEN"));
  assert.deepEqual(matches, []);
});

test("night prompts and wrapper have no approval or veto-wait branch", () => {
  const text = [
    read("docs/night_driver_prompt.md"),
    read("docs/night_driver_resume_prompt.md"),
    read("scripts/automation/night-run.ps1"),
  ].join("\n");
  assert.doesNotMatch(text, /Start-Sleep\s+-Seconds\s+300|AskUserQuestion|request_user_input/);
  assert.match(text, /承認待ち・veto待ち・時刻待ちは禁止/);
  assert.match(text, /Phase B fallback: review_waitingを即時公開/);
  assert.match(text, /outer scout --auto-pick/);
  assert.match(text, /Record-ContractOutcome "stop" "no_scout_target"/);
});

test("scheduler entry wrappers are ASCII-only and point only to dedicated clone", () => {
  for (const name of ["night-entry.cmd", "night-watchdog-entry.cmd", "night-auth-probe-entry.cmd"]) {
    const bytes = readFileSync(path.join(ROOT, "scripts/automation", name));
    assert.ok([...bytes].every((value) => value <= 0x7f), `${name} is not ASCII-only`);
    const text = bytes.toString("ascii");
    assert.match(text, /D:\\work\\sumalabo-night-runner/);
    assert.doesNotMatch(text, /documents|\.ps1"?\s*$.*動画/u);
  }
  const entry = read("scripts/automation/night-run-entry.mjs");
  assert.match(entry, /runner_clone_dirty/);
  assert.match(entry, /git", \["fetch", "origin", "main"/);
  assert.match(entry, /git", \["checkout", "--detach", "origin\/main"/);
  const prepare = read("scripts/automation/prepare-night-runner.mjs");
  assert.match(prepare, /PRIVATE_RUNTIME_FILES/);
  assert.match(prepare, /data\/automation\/autonomy\.json/);
  assert.match(prepare, /runner-package-lock\.sha256/);
  assert.match(prepare, /createHash\("sha256"\)/);
});

test("Codex auth probe is non-interactive and never uses auth status", () => {
  const source = read("scripts/automation/codex-auth-probe.mjs");
  assert.match(source, /"exec"/);
  assert.match(source, /CODEX_AUTH_PROBE_OK/);
  assert.match(source, /\b401\b/);
  assert.doesNotMatch(source, /auth\s+status/i);
});

test("night parent actor is Codex while Git and X stay outside its sandbox", () => {
  const wrapper = read("scripts/automation/night-run.ps1");
  const prompt = read("docs/night_driver_prompt.md");
  const outer = read("scripts/automation/phase-a-outer-publish.mjs");
  assert.match(wrapper, /codex\.exe/);
  assert.match(wrapper, /"--agent-exe"/);
  assert.doesNotMatch(wrapper, /\$GitMetadataDir|\$GitHubCliConfigDir|"--add-dir", \$GitMetadataDir/);
  assert.match(wrapper, /phase-a-outer-publish\.mjs/);
  assert.match(wrapper, /Remove-Item Env:GH_TOKEN/);
  assert.match(wrapper, /\$env:GH_TOKEN = \$publisherToken/);
  assert.match(outer, /process\.env\.GH_TOKEN/);
  assert.match(outer, /gh_token_missing/);
  assert.doesNotMatch(wrapper, /claude\.exe|--claude-exe|claude-opus/);
  assert.doesNotMatch(prompt, /mcp__claude-in-chrome__/);
  assert.match(prompt, /Xを操作・投稿しない/);
  assert.match(prompt, /GitHub CLI設定やGitHub\/Xの資格情報を読まない/);
  assert.match(prompt, /Codex内からRSS取得やスカウト再実行をしない/);
});

test("night Phase C uses a fresh Codex-owned Chrome tab without GitHub credentials", () => {
  const wrapper = read("scripts/automation/night-run.ps1");
  const prompt = read("docs/x-post-codex-night-prompt.md");
  assert.match(wrapper, /x-post-codex-night-prompt\.md/);
  assert.match(wrapper, /Invoke-CodexIsolated \$XPrompt/);
  assert.match(wrapper, /Remove-Item Env:GH_TOKEN/);
  assert.match(prompt, /tabs\.new\(\)/);
  assert.match(prompt, /handoff.*claim.*しない/);
  assert.match(prompt, /@suma_labo/);
  assert.match(prompt, /N→N\+1/);
  assert.match(prompt, /route: codex/);
  assert.match(prompt, /GH_TOKEN.*読まない/);
});

test("runner keeps generated evidence private and preserves the live X ledger outside Git status", () => {
  const ignore = read(".gitignore");
  const prepare = read("scripts/automation/prepare-night-runner.mjs");
  const setup = read("docs/night_run_setup.md");
  for (const pattern of ["logs/night/", "logs/article/", "logs/preview/", "logs/scout/", "logs/social/", "drafts/social/"]) {
    assert.match(ignore, new RegExp(pattern.replace("/", "\\/")));
  }
  assert.match(prepare, /PRIVATE_TRACKED_RUNTIME_FILES/);
  assert.match(prepare, /update-index[\s\S]*--skip-worktree/);
  assert.match(prepare, /if \(existsSync\(target\)\) continue;/);
  assert.doesNotMatch(setup, /ヘッドレスClaude Code|claude-opus-4-8|Sumalabo Claude Auth Probe|軽量な`claude -p`/);
});

test("watchdog audits the exact run id instead of a same-day record", () => {
  const watchdog = read("scripts/automation/night-watchdog.ps1");
  assert.match(watchdog, /\$activeRunId/);
  assert.match(watchdog, /'--run-id', \$activeRunId/);
  assert.doesNotMatch(watchdog, /'audit', '--date'/);
});

test("scheduled acceptance is an explicit stopped outcome, never success", () => {
  const wrapper = read("scripts/automation/night-run.ps1");
  const contract = read("scripts/automation/night-run-contract.mjs");
  assert.match(wrapper, /Record-ContractOutcome "stop" "scheduled_acceptance"/);
  assert.doesNotMatch(wrapper, /SCHEDULED ACCEPTANCE OK[\s\S]{0,300}exit 0/);
  assert.match(contract, /"scheduled_acceptance"/);
});
