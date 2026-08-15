#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { NIGHT_ENVIRONMENT, chromeProfilePath } from "./night-environment.mjs";

export const CHECK_NAMES = [...NIGHT_ENVIRONMENT.requiredChecks];
export const FATAL_CHECK_NAMES = [...NIGHT_ENVIRONMENT.fatalChecks];
export const WARNING_CHECK_NAMES = [...NIGHT_ENVIRONMENT.warningChecks];

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: "utf8", windowsHide: true });
}

function json(file) {
  return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}

function git(cwd, args) {
  const result = run("git", ["-c", `safe.directory=${cwd.replace(/\\/g, "/")}`, "-C", cwd, ...args], cwd);
  return { ok: result.status === 0, text: String(result.stdout || "").trim(), error: String(result.stderr || "").trim() };
}

export function parseDomEvidence(file) {
  if (!file || !existsSync(file)) return null;
  const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "").trim();
  return parseDomEvidenceText(text);
}

export function parseDomEvidenceText(text) {
  try { return JSON.parse(text); } catch {}
  // `codex exec --output-last-message` may contain runner diagnostics and the
  // prompt's example JSON before the agent's final line.  Walk backwards so
  // only the last complete evidence object is authoritative; never let a
  // prompt example satisfy the check.
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const candidate = JSON.parse(lines[index]);
      if (candidate && typeof candidate === "object" && Object.hasOwn(candidate, "domRead")) return candidate;
    } catch {}
  }
  return null;
}

export function evaluateEnvironmentEvidence(evidence, injectMissing = []) {
  const injected = new Set(injectMissing);
  const checks = CHECK_NAMES.map((name) => {
    const item = evidence[name] || { ok: false, detail: "evidence_missing" };
    return injected.has(name) ? { name, ok: false, detail: "injected_missing" } : { name, ok: item.ok === true, detail: item.detail || null };
  });
  const failedChecks = checks.filter((item) => !item.ok).map((item) => item.name);
  const fatalFailedChecks = failedChecks.filter((name) => FATAL_CHECK_NAMES.includes(name));
  const warningFailedChecks = failedChecks.filter((name) => WARNING_CHECK_NAMES.includes(name));
  return {
    ok: failedChecks.length === 0,
    canProceed: fatalFailedChecks.length === 0,
    xReady: warningFailedChecks.length === 0,
    checks,
    failedChecks,
    fatalFailedChecks,
    warningFailedChecks,
  };
}

export function collectStaticEvidence(environment = NIGHT_ENVIRONMENT, env = process.env) {
  const evidence = {};
  const profileRoot = chromeProfilePath(environment);
  const securePreferences = path.join(profileRoot, "Secure Preferences");
  const extensionRoot = path.join(profileRoot, "Extensions", environment.chrome.extensionId);
  let extension = null;
  try { extension = json(securePreferences)?.extensions?.settings?.[environment.chrome.extensionId] || null; } catch {}
  const versions = existsSync(extensionRoot) ? (awaitableDirectories(extensionRoot)) : [];

  evidence.environment_definition = { ok: environment.schemaVersion === 1 && CHECK_NAMES.every((name) => environment.requiredChecks.includes(name)), detail: "schemaVersion=1" };
  const expectedPreferences = path.join(profileRoot, "Preferences");
  let runningProfileMatches = true;
  if (process.platform === "win32") {
    const ps = run("powershell.exe", ["-NoProfile", "-Command", "@(Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty CommandLine) -join \"`n\""]);
    const commandLines = String(ps.stdout || "").trim();
    if (commandLines) {
      const escaped = environment.chrome.profileDirectory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      runningProfileMatches = new RegExp(`--profile-directory=(?:\"${escaped}\"|${escaped})(?:\\s|$)`, "i").test(commandLines);
    }
  }
  evidence.chrome_profile = { ok: existsSync(profileRoot) && runningProfileMatches && (!env.CODEX_CHROMIUM_PREFERENCES_PATH || path.normalize(env.CODEX_CHROMIUM_PREFERENCES_PATH) === path.normalize(expectedPreferences)), detail: `${environment.chrome.profileDirectory};runningMatch=${runningProfileMatches}` };
  evidence.chrome_extension = { ok: Boolean(extension && versions.length), detail: versions.join(",") || "extension_not_installed" };
  evidence.file_url_permission = { ok: extension?.newAllowFileAccess === true, detail: `newAllowFileAccess=${String(extension?.newAllowFileAccess)}` };

  let manifest = null;
  try { manifest = json(environment.chrome.nativeHostManifestPath); } catch {}
  const reg = process.platform === "win32" ? run("reg.exe", ["query", environment.chrome.nativeHostRegistryKey, "/ve"]) : { status: 0, stdout: environment.chrome.nativeHostManifestPath };
  evidence.native_host = { ok: Boolean(manifest?.name === "com.openai.codexextension" && String(reg.stdout || "").includes(environment.chrome.nativeHostManifestPath)), detail: manifest?.name || "native_host_missing" };

  let browserConfig = "";
  try { browserConfig = readFileSync(environment.browserPermissions.configPath, "utf8"); } catch {}
  const origin = environment.browserPermissions.requiredOrigin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const siteOk = new RegExp(`\\[origins\\][\\s\\S]*allowed\\s*=\\s*\\[[^\\]]*${origin}`, "i").test(browserConfig)
    && new RegExp(`\\[uploads\\][\\s\\S]*allowed\\s*=\\s*\\[[^\\]]*${origin}`, "i").test(browserConfig)
    && new RegExp(`\\[downloads\\][\\s\\S]*allowed\\s*=\\s*\\[[^\\]]*${origin}`, "i").test(browserConfig)
    && /approval_mode\s*=\s*"never_ask"/i.test(browserConfig)
    && /upload_approval_mode\s*=\s*"never_ask"/i.test(browserConfig);
  evidence.x_site_permission = { ok: siteOk, detail: environment.browserPermissions.configPath };
  evidence.github_token = { ok: Boolean(env[environment.tokens.github]), detail: `${environment.tokens.github}=${env[environment.tokens.github] ? "present" : "missing"}` };

  const canonical = environment.canonicalWorkspacePath;
  const runner = environment.runnerPath;
  const canonicalHead = git(canonical, ["rev-parse", "HEAD"]);
  const runnerHead = git(runner, ["rev-parse", "HEAD"]);
  evidence.repository_sha = { ok: canonicalHead.ok && runnerHead.ok && canonicalHead.text === runnerHead.text, detail: `${canonicalHead.text || "?"}/${runnerHead.text || "?"}` };
  const canonicalDirty = git(canonical, ["status", "--porcelain=v1", "--untracked-files=no"]);
  const runnerDirty = git(runner, ["status", "--porcelain=v1", "--untracked-files=no"]);
  evidence.runner_dirty = { ok: canonicalDirty.ok && runnerDirty.ok && canonicalDirty.text === "" && runnerDirty.text === "", detail: canonicalDirty.text || runnerDirty.text || "workspace_and_runner_tracked_dirty=0" };
  evidence.x_login_href = { ok: false, detail: "dom_probe_required" };
  evidence.dom_read = { ok: false, detail: "dom_probe_required" };
  return evidence;
}

function awaitableDirectories(directory) {
  const result = run("powershell.exe", ["-NoProfile", "-Command", `(Get-ChildItem -LiteralPath '${directory.replace(/'/g, "''")}' -Directory -ErrorAction SilentlyContinue).Name -join ','`]);
  return String(result.stdout || "").trim().split(",").filter(Boolean);
}

export function runEnvironmentCheck({ domEvidenceFile = null, staticOnly = false, injectMissing = [] } = {}) {
  const evidence = collectStaticEvidence();
  if (!staticOnly) {
    const dom = parseDomEvidence(domEvidenceFile);
    evidence.x_login_href = { ok: dom?.accountHref === NIGHT_ENVIRONMENT.account.href && Number(dom?.hrefCount || 0) >= 1, detail: dom ? `${dom.accountHref} count=${dom.hrefCount}` : "dom_evidence_missing" };
    evidence.dom_read = { ok: dom?.domRead === true && dom?.url === "https://x.com/home", detail: dom?.url || "dom_evidence_missing" };
  }
  const names = staticOnly ? CHECK_NAMES.filter((name) => !["x_login_href", "dom_read"].includes(name)) : CHECK_NAMES;
  const evaluated = evaluateEnvironmentEvidence(Object.fromEntries(names.map((name) => [name, evidence[name]])), injectMissing);
  const checks = evaluated.checks.filter((item) => names.includes(item.name));
  const failedChecks = checks.filter((item) => !item.ok).map((item) => item.name);
  const fatalFailedChecks = failedChecks.filter((name) => FATAL_CHECK_NAMES.includes(name));
  const warningFailedChecks = failedChecks.filter((name) => WARNING_CHECK_NAMES.includes(name));
  return {
    ok: failedChecks.length === 0,
    canProceed: fatalFailedChecks.length === 0,
    xReady: warningFailedChecks.length === 0,
    classification: fatalFailedChecks.length ? "fatal" : warningFailedChecks.length ? "warning" : "pass",
    profileDirectory: NIGHT_ENVIRONMENT.chrome.profileDirectory,
    checks,
    failedChecks,
    fatalFailedChecks,
    warningFailedChecks,
  };
}

function main() {
  const args = process.argv.slice(2);
  const domIndex = args.indexOf("--dom-evidence");
  const inject = args.filter((arg) => arg.startsWith("--inject-missing=")).map((arg) => arg.split("=", 2)[1]);
  const result = runEnvironmentCheck({ domEvidenceFile: domIndex >= 0 ? args[domIndex + 1] : null, staticOnly: args.includes("--static-only"), injectMissing: inject });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.ok ? 0 : result.canProceed ? 20 : 30;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
