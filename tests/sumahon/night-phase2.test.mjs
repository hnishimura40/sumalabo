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
  assert.match(text, /Phase B: review-item反映を30秒間隔・最大10回待って/);
  assert.match(text, /outer scout --auto-pick/);
  assert.match(text, /Record-ContractOutcome "stop" "no_scout_target"/);
});

test("scheduler entry wrappers are ASCII-only and point only to dedicated clone", () => {
  for (const name of ["night-entry.cmd", "night-watchdog-entry.cmd", "night-auth-probe-entry.cmd", "vivant-reannounce-entry.cmd"]) {
    const bytes = readFileSync(path.join(ROOT, "scripts/automation", name));
    assert.ok([...bytes].every((value) => value <= 0x7f), `${name} is not ASCII-only`);
    const text = bytes.toString("ascii");
    assert.match(text, /__RUNNER_ROOT__/);
    assert.doesNotMatch(text, /documents|\.ps1"?\s*$.*動画/u);
  }
  const entry = read("scripts/automation/night-run-entry.mjs");
  assert.match(entry, /runner_clone_dirty/);
  assert.match(entry, /git", \["fetch", "origin", "main"/);
  assert.match(entry, /git", \["checkout", "--detach", "origin\/main"/);
  const prepare = read("scripts/automation/prepare-night-runner.mjs");
  assert.match(prepare, /replaceAll\("__RUNNER_ROOT__", RUNNER_ROOT\)/);
  assert.match(prepare, /PRIVATE_RUNTIME_FILES/);
  assert.match(prepare, /data\/automation\/autonomy\.json/);
  assert.match(prepare, /runner-package-lock\.sha256/);
  assert.match(prepare, /createHash\("sha256"\)/);
  assert.match(prepare, /preservedGeneratedPaths/);
  assert.match(prepare, /invalid handoff is never sufficient/i);
});

test("VIVANT reannouncement registration uses the weekly ASCII task entry", async () => {
  const registration = await import("../../scripts/automation/register-vivant-reannounce-task.mjs");
  const runner = await import("../../scripts/automation/vivant-reannounce-runner.mjs");
  assert.equal(registration.taskCommand(), "cmd.exe /d /c D:\\work\\sumalabo-vivant-reannounce-entry.cmd");
  assert.deepEqual(registration.validateTaskXml("<Command>cmd.exe</Command>D:\\work\\sumalabo-vivant-reannounce-entry.cmd<DaysOfWeek><Sunday/></DaysOfWeek>"), { ok: true, problems: [] });
  const existing = runner.existingReannouncement([{ slug: "202607-vivant-ai-hayato-reality-check", recoveryPosts: [{ postUrl: "https://x.com/suma_labo/status/2081707073398861988", replyUrl: "https://x.com/suma_labo/status/2081707172615135658" }] }]);
  assert.equal(existing.postUrl, "https://x.com/suma_labo/status/2081707073398861988");
});

test("outer publisher uses REST PR resolution and can complete a recovered handoff", async () => {
  const outer = await import("../../scripts/automation/phase-a-outer-publish.mjs");
  const calls = [];
  const prUrl = await outer.resolvePullRequest({
    branch: "preview/202608-iphone-9-9-9-12",
    title: "regression",
    token: "test-token",
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => [{ html_url: "https://github.com/hnishimura40/sumalabo/pull/284" }] };
    },
  });
  assert.equal(prUrl, "https://github.com/hnishimura40/sumalabo/pull/284");
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /api\.github\.com\/repos\/hnishimura40\/sumalabo\/pulls/);
  assert.doesNotMatch(read("scripts/automation/phase-a-outer-publish.mjs"), /gh", \["pr"/);
  assert.match(read("scripts/automation/phase-a-outer-publish.mjs"), /--mark-completed/);
});

test("Phase B merges through REST without GraphQL", async () => {
  const phaseB = await import("../../scripts/automation/auto-phase-b.mjs");
  const calls = [];
  const result = await phaseB.mergePr(284, false, {
    token: "test-token",
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      if (!options.method) return { ok: true, status: 200, json: async () => ({ state: "open", merged: false, draft: false }) };
      return { ok: true, status: 200, json: async () => ({ merged: true }) };
    },
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, "PUT");
  assert.doesNotMatch(read("scripts/automation/auto-phase-b.mjs"), /gh", \["pr"/);
});

test("Phase B retries an initially invisible target and later selects it", async () => {
  const phaseB = await import("../../scripts/automation/auto-phase-b.mjs");
  let loads = 0;
  const sleeps = [];
  const target = { slug: "202608-line-mute-message-lyp-premium", status: "review_waiting", prUrl: "https://github.com/hnishimura40/sumalabo/pull/285" };
  const result = await phaseB.waitForEligibleTarget({
    load: async () => (++loads < 3 ? [] : [target]),
    slug: target.slug,
    attempts: 10,
    intervalMs: 30_000,
    sleepImpl: async (milliseconds) => sleeps.push(milliseconds),
  });
  assert.equal(result.ok, true);
  assert.equal(result.attempt, 3);
  assert.deepEqual(sleeps, [30_000, 30_000]);
});

test("Phase B target retry exhausts ten 30-second waits before failing closed", async () => {
  const phaseB = await import("../../scripts/automation/auto-phase-b.mjs");
  const sleeps = [];
  const result = await phaseB.waitForEligibleTarget({
    load: async () => [],
    slug: "202608-line-mute-message-lyp-premium",
    attempts: 10,
    intervalMs: 30_000,
    sleepImpl: async (milliseconds) => sleeps.push(milliseconds),
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "phase_b_target_not_found_after_retry");
  assert.equal(result.retries, 10);
  assert.equal(sleeps.length, 10);
  assert.ok(sleeps.every((milliseconds) => milliseconds === 30_000));
});

test("Phase B/C ordering verifies production then creates x-post input before Codex", () => {
  const wrapper = read("scripts/automation/night-run.ps1");
  const generator = read("scripts/run/generate-x-post.mjs");
  const retry = wrapper.indexOf("--wait-for-target --attempts=10 --interval-ms=30000");
  const verify = wrapper.indexOf("phase-b-check --slug");
  const generate = wrapper.indexOf("generate-x-post.mjs --slug");
  const phaseC = wrapper.indexOf("Invoke-CodexIsolated $XPrompt");
  assert.ok(retry >= 0 && retry < verify);
  assert.ok(verify < generate && generate < phaseC);
  assert.match(wrapper, /phase_b_target_not_found_after_retry/);
  assert.match(wrapper, /if \(\$publishSlug -and \$phaseBVerified -and \$XPreflightReady\)/);
  assert.match(wrapper, /x-pending-bundle\.mjs create/);
  assert.match(wrapper, /--x-pending --x-warnings/);
  assert.match(generator, /args\["search-phrase"\] \?\? fm\.title/);
  assert.doesNotMatch(read("scripts/automation/auto-phase-b.mjs"), /phase-c-auto\.mjs/);
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
  assert.match(outer, /--decide-json/);
  assert.match(wrapper, /phase-a-outer-publish\.mjs --decide-json/);
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
  assert.match(wrapper, /x-post-chrome\.ps1/);
  assert.match(wrapper, /x_clipboard_prestage_failed/);
  assert.match(wrapper, /XImages\.Count -ne 4/);
  assert.match(wrapper, /XImageArg = \$XImages -join ','/);
  assert.match(wrapper, /x_visible_window_missing_before_prestage/);
  assert.match(wrapper, /-ImagePaths \$XImageArg -ClipboardOnly/);
  assert.match(prompt, /外側工程.*CF_HDROP/);
  assert.match(prompt, /file chooser.*使わない/);
  assert.match(prompt, /Ctrl\+V.*1回だけ/);
  assert.match(prompt, /添付数が4/);
});

test("night Chrome startup uses the single environment definition", () => {
  const wrapper = read("scripts/automation/night-run.ps1");
  const environment = JSON.parse(read("config/night-environment.json"));
  assert.equal(environment.chrome.profileDirectory, "Profile 2");
  assert.match(wrapper, /config\\night-environment\.json/);
  assert.match(wrapper, /--profile-directory=\$ChromeProfileDirectory/);
  assert.doesNotMatch(wrapper, /--profile-directory=Profile 2/);
  assert.match(wrapper, /--new-window/);
  assert.match(wrapper, /https:\/\/x\.com\/compose\/post/);
  assert.match(wrapper, /MainWindowHandle -ne 0/);
  assert.match(wrapper, /Chrome可視ウィンドウなし/);
  assert.match(wrapper, /CODEX_CHROMIUM_NATIVE_HOST_MANIFEST_PATH/);
  assert.match(wrapper, /CODEX_CHROMIUM_PREFERENCES_PATH/);
  assert.match(wrapper, /night-environment-check\.mjs --static-only/);
  assert.match(wrapper, /night-environment-check\.mjs --dom-evidence/);
  assert.match(wrapper, /--output-last-message", \$EnvironmentDomEvidence/);
  assert.match(wrapper, /\$DateStr\.\$RunId\.environment-dom\.evidence\.json/);
  assert.match(wrapper, /environment_preflight_failed:\$missing/);
  const domProbe = read("docs/night_environment_dom_probe.md");
  assert.match(domProbe, /wait 5 seconds/i);
  assert.match(domProbe, /12 total attempts/);
  assert.match(domProbe, /Do not return failure after only the first read/);
  assert.match(read("scripts/automation/x-post-chrome.ps1"), /MainWindowHandle -ne 0/);
});

test("night environment configuration owns paths, token names, and permissions", () => {
  const environment = JSON.parse(read("config/night-environment.json"));
  assert.equal(environment.runnerPath, "D:\\work\\sumalabo-night-runner");
  assert.equal(environment.chrome.extensionId, "hehggadaopoacecdllhhajmbjkdcmajg");
  assert.equal(environment.tokens.github, "GH_TOKEN");
  assert.match(environment.codex.executable, /codex\.exe$/);
  assert.equal(environment.browserPermissions.requiredOrigin, "https://x.com");
  assert.deepEqual(environment.fatalChecks, ["environment_definition", "github_token", "repository_sha", "runner_dirty"]);
  assert.ok(environment.warningChecks.includes("x_login_href"));
  assert.ok(environment.requiredChecks.includes("dom_read"));
  assert.ok(environment.requiredChecks.includes("runner_dirty"));
  assert.doesNotMatch(read("scripts/automation/prepare-night-runner.mjs"), /D:\\\\work\\\\sumalabo-night-runner/);
});

test("night run never performs automatic archive deletion", () => {
  const wrapper = read("scripts/automation/night-run.ps1");
  assert.doesNotMatch(wrapper, /image-output-lifecycle\.mjs --prune/);
  assert.doesNotMatch(wrapper, /Remove-Item -LiteralPath \$RunnerOut,\$RunnerErr/);
  assert.match(wrapper, /automatic prune disabled by permanent safety rule/);
});

test("night run removes only the exact Chrome parent process that it started", () => {
  const wrapper = read("scripts/automation/night-run.ps1");
  assert.match(wrapper, /\$script:ChromeRunPid = \$null/);
  assert.match(wrapper, /Start-Process[\s\S]*-PassThru[\s\S]*\$script:ChromeRunPid = \$chromeProcess\.Id/);
  assert.match(wrapper, /Get-Process -Id \$script:ChromeRunPid/);
  assert.match(wrapper, /\$ownedChrome\.Path -eq \$script:ChromeRunExe/);
  assert.match(wrapper, /Stop-Process -Id \$script:ChromeRunPid/);
  assert.doesNotMatch(wrapper, /Get-Process chrome[^\r\n]*\| Stop-Process/);
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

test("X pending recovery is a one-command fail-closed runner flow", () => {
  const pkg = JSON.parse(read("package.json"));
  const launcher = read("scripts/automation/recover-x-pending.mjs");
  const recovery = read("scripts/automation/recover-x-pending.ps1");
  assert.equal(pkg.scripts["social:recover-x-pending"], "node scripts/automation/recover-x-pending.mjs");
  assert.match(launcher, /NIGHT_ENVIRONMENT\.runnerPath/);
  assert.match(launcher, /latestPendingBundle/);
  assert.match(recovery, /x-pending-bundle\.mjs verify/);
  assert.match(recovery, /post-to-x\.mjs --check/);
  assert.match(recovery, /\$imagePaths\.Count -ne 4/);
  assert.match(recovery, /docs\\x-post-codex-night-prompt\.md/);
  assert.match(recovery, /--completion-kind recovery/);
  assert.doesNotMatch(recovery, /Remove-Item\s+-LiteralPath/);
});

test("scheduled acceptance is an explicit stopped outcome, never success", () => {
  const wrapper = read("scripts/automation/night-run.ps1");
  const contract = read("scripts/automation/night-run-contract.mjs");
  assert.match(wrapper, /Record-ContractOutcome "stop" "scheduled_acceptance"/);
  assert.match(wrapper, /SCHEDULED ACCEPTANCE OK[\s\S]{0,500}if \(\$exitCode -ne 20\) \{ exit \$exitCode \}[\s\S]{0,100}exit 0/);
  assert.match(contract, /"scheduled_acceptance"/);
});
