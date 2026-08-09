#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV_FILE_RE = /(^|\/)\.env(?:\.[^/]+)?$/i;
const ALLOWED_ENV_RE = /(^|\/)\.env\.(?:example|sample|template)$/i;
const PATTERNS = [
  ["private_key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ["google_service_account", /["']type["']\s*:\s*["']service_account["']/i],
  ["google_private_key", /["']private_key["']\s*:\s*["']-----BEGIN PRIVATE KEY/i],
  ["google_api_key", /AIza[0-9A-Za-z_-]{30,}/],
  ["github_token", /(?:ghp_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{40,})/],
  ["openai_api_key", /\bsk-(?:proj-)?[0-9A-Za-z_-]{24,}\b/],
  ["generic_secret_assignment", /(?:api[_-]?key|access[_-]?token|client[_-]?secret)\s*[=:]\s*["']?[0-9A-Za-z_\-/.+=]{24,}/i],
];

function gitLines(args, root) {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true })
      .split(/\r?\n/).map((v) => v.trim()).filter(Boolean);
  } catch { return []; }
}

export function scanTextForSecrets(text, file = "input") {
  const findings = [];
  for (const [kind, pattern] of PATTERNS) {
    if (pattern.test(String(text))) findings.push({ file, kind });
  }
  return findings;
}

export function candidateFiles(root = ROOT) {
  const files = new Set([
    ...gitLines(["diff", "--name-only", "--diff-filter=ACMR", "origin/main...HEAD"], root),
    ...gitLines(["diff", "--name-only", "--diff-filter=ACMR"], root),
    ...gitLines(["diff", "--cached", "--name-only", "--diff-filter=ACMR"], root),
  ]);
  for (const line of gitLines(["status", "--porcelain", "--untracked-files=all"], root)) {
    const file = line.slice(3).replace(/^"|"$/g, "").replace(/\\/g, "/");
    if (ENV_FILE_RE.test(file)) files.add(file);
  }
  return [...files].filter((file) => !file.includes("node_modules/") && !file.startsWith("dist/"));
}

export function scanRepositoryForSecrets(root = ROOT) {
  const findings = [];
  for (const rel of candidateFiles(root)) {
    const normalized = rel.replace(/\\/g, "/");
    if (ENV_FILE_RE.test(normalized) && !ALLOWED_ENV_RE.test(normalized)) {
      findings.push({ file: normalized, kind: "env_file" });
      continue;
    }
    const full = path.join(root, rel);
    if (!existsSync(full)) continue;
    let text;
    try { text = readFileSync(full, "utf8"); } catch { continue; }
    if (text.includes("\u0000")) continue;
    findings.push(...scanTextForSecrets(text, normalized));
  }
  return { ok: findings.length === 0, findings, filesScanned: candidateFiles(root).length };
}

async function main() {
  const result = scanRepositoryForSecrets(ROOT);
  if (!result.ok) {
    console.error("SECRET SCAN FAILED");
    for (const finding of result.findings) console.error("- " + finding.file + ": " + finding.kind);
    console.error("秘密値は表示していません。対象ファイルを履歴へ入れる前に除去してください。");
    process.exitCode = 1;
    return;
  }
  console.log("SECRET SCAN PASSED (" + result.filesScanned + " candidate files)");
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) await main();
