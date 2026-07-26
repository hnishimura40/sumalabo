#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { applyStructuralOverrides, buildHandCropPrompt, summarizeVerdicts, validateAgentResult } from "../sumahon/hand-crop-inspection.mjs";
import { makeContactSheet } from "./hand-crop-inspection.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = path.join(ROOT, "tests", "fixtures", "hand-crop-regression.json");
const OUTPUT = "D:\\downloads\\sumalabo-codex\\hand-crop-regression-20260726";
function resolveCodex() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    const cliJs = path.join(appData, "npm", "node_modules", "@openai", "codex", "bin", "codex.js");
    if (existsSync(cliJs)) return { command: process.execPath, argsPrefix: [cliJs] };
  }
  return { command: process.platform === "win32" ? "codex.cmd" : "codex", argsPrefix: [] };
}
function parseJson(text) {
  const value = String(text || "").trim();
  try { return JSON.parse(value); } catch {}
  return JSON.parse(value.slice(value.indexOf("{"), value.lastIndexOf("}") + 1));
}
function severityAtLeast(actual, expected) {
  const rank = { ok: 0, warning: 1, needs_revision: 2 };
  return rank[actual] >= rank[expected];
}

async function main() {
  mkdirSync(OUTPUT, { recursive: true });
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf-8"));
  const items = [];
  const expected = new Map();
  const incidentByImage = new Map();
  for (const incident of fixture.incidents) {
    for (const image of incident.images) {
      let source = image.path;
      if (!source && image.gitRef) {
        source = path.join(OUTPUT, `${image.id}.webp`);
        const bytes = execFileSync("git", ["-c", "safe.directory=*", "show", `${image.gitRef}:${image.repoPath}`], { cwd: ROOT, encoding: "buffer", maxBuffer: 20 * 1024 * 1024 });
        writeFileSync(source, bytes);
      }
      if (!existsSync(source)) throw new Error(`before画像がありません: ${source}`);
      const item = {
        id: image.id,
        source,
        handChecks: image.hands,
        cropFile: path.join(OUTPUT, `${image.id}.hand-crops.png`),
      };
      await makeContactSheet(item, item.cropFile);
      items.push(item);
      expected.set(image.id, image.expected);
      incidentByImage.set(image.id, incident.incident);
    }
  }
  const prompt = buildHandCropPrompt(items) + "\n\nこれは既知破綻の回帰試験です。ただし期待値は教えません。見えた異常だけで厳格に判定してください。";
  writeFileSync(path.join(OUTPUT, "prompt.md"), prompt, "utf-8");
  const cli = resolveCodex();
  const args = [...cli.argsPrefix, "exec", "--ephemeral", "--skip-git-repo-check", "--sandbox", "read-only", "--cd", OUTPUT];
  for (const item of items) args.push("--image", item.cropFile);
  args.push("-");
  const run = spawnSync(cli.command, args, { cwd: OUTPUT, input: prompt, encoding: "utf-8", maxBuffer: 20 * 1024 * 1024, timeout: 20 * 60 * 1000, windowsHide: true });
  if (run.error || run.status !== 0) throw new Error(run.error?.message || run.stderr || `codex exit ${run.status}`);
  const result = applyStructuralOverrides(validateAgentResult(parseJson(run.stdout), items), items);
  result.verdictCounts = summarizeVerdicts(result.images);
  result.overallPass = result.verdictCounts.needs_revision === 0;
  const actual = new Map((result.images || []).map((x) => [x.id, x.verdict]));
  const images = items.map((item) => ({ id: item.id, incident: incidentByImage.get(item.id), expected: expected.get(item.id), actual: actual.get(item.id) || "missing", detected: severityAtLeast(actual.get(item.id) || "ok", expected.get(item.id)), cropFile: item.cropFile }));
  const incidents = fixture.incidents.map((incident) => ({ incident: incident.incident, detected: incident.images.every((x) => images.find((y) => y.id === x.id)?.detected), images: incident.images.map((x) => x.id) }));
  const audit = { runAt: new Date().toISOString(), separateSession: true, imagesDetected: `${images.filter((x) => x.detected).length}/${images.length}`, incidentsDetected: `${incidents.filter((x) => x.detected).length}/${incidents.length}`, images, incidents, agentResult: result };
  const outputPath = path.join(ROOT, "logs", "article", "hand-crop-regression-20260726.json");
  writeFileSync(outputPath, JSON.stringify(audit, null, 2) + "\n", "utf-8");
  console.log(JSON.stringify(audit, null, 2));
  if (incidents.some((x) => !x.detected)) process.exitCode = 3;
}

main().catch((error) => { console.error(error.message); process.exitCode = 2; });
