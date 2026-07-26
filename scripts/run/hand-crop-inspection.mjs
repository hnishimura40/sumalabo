#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import process from "node:process";
import sharp from "sharp";
import { applyStructuralOverrides, buildHandCropPrompt, collectVisibleHands, paddedPixelBox, summarizeVerdicts, validateAgentResult } from "../sumahon/hand-crop-inspection.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_OUTPUT_ROOT = "D:\\downloads\\sumalabo-codex";

function arg(name) { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : null; }
function resolveCodexCli() {
  if (process.env.SUMALABO_CODEX_CLI) return { command: process.env.SUMALABO_CODEX_CLI, argsPrefix: [] };
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    const cliJs = path.join(appData, "npm", "node_modules", "@openai", "codex", "bin", "codex.js");
    if (existsSync(cliJs)) return { command: process.execPath, argsPrefix: [cliJs] };
  }
  return { command: process.platform === "win32" ? "codex.cmd" : "codex", argsPrefix: [] };
}
function imageSources(slug, images) {
  const articleDir = path.join(ROOT, "public", "images", "articles", slug);
  const result = Object.fromEntries((images.slides || []).map((s) => {
    const name = s.name || path.basename(s.src || "");
    return [name.replace(/\.webp$/i, ""), path.join(articleDir, name)];
  }));
  result.thumbnail = path.join(ROOT, "public", "images", "thumbnails", `${slug}.webp`);
  return result;
}
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[c])); }

export async function makeContactSheet(item, outputFile) {
  const metadata = await sharp(item.source).metadata();
  const tiles = [];
  for (let i = 0; i < item.handChecks.length; i++) {
    const hand = item.handChecks[i];
    const contextBox = paddedPixelBox(hand.bbox, metadata.width, metadata.height, 1.0);
    const detailBox = paddedPixelBox(hand.bbox, metadata.width, metadata.height, 0.12);
    const context = await sharp(item.source).extract(contextBox).resize(360, 460, { fit: "contain", background: "#ffffff" }).png().toBuffer();
    const detail = await sharp(item.source).extract(detailBox).resize(360, 460, { fit: "contain", background: "#ffffff" }).png().toBuffer();
    const crop = await sharp({ create: { width: 740, height: 460, channels: 3, background: "#ffffff" } }).composite([
      { input: context, left: 0, top: 0 }, { input: detail, left: 380, top: 0 },
      { input: Buffer.from('<svg width="120" height="34"><rect width="120" height="34" fill="#334155"/><text x="8" y="23" fill="white" font-size="17" font-family="Arial">CONTEXT</text></svg>'), left: 4, top: 4 },
      { input: Buffer.from('<svg width="100" height="34"><rect width="100" height="34" fill="#334155"/><text x="8" y="23" fill="white" font-size="17" font-family="Arial">DETAIL</text></svg>'), left: 384, top: 4 },
    ]).png().toBuffer();
    tiles.push({ crop, label: `${item.id}-hand${i + 1} / ${hand.character} / expected:${hand.side}` });
  }
  const columns = Math.min(2, tiles.length);
  const rows = Math.ceil(tiles.length / columns);
  const canvasWidth = columns * 780;
  const canvasHeight = 80 + rows * 520;
  const composites = [];
  for (let i = 0; i < tiles.length; i++) {
    const left = (i % columns) * 780 + 20;
    const top = 80 + Math.floor(i / columns) * 520;
    composites.push({ input: tiles[i].crop, left, top });
    const label = `<svg width="740" height="42"><rect width="740" height="42" fill="#111827"/><text x="12" y="28" fill="white" font-size="20" font-family="Arial, sans-serif">${esc(tiles[i].label)}</text></svg>`;
    composites.push({ input: Buffer.from(label), left, top: top + 460 });
  }
  const header = `<svg width="${canvasWidth}" height="70"><rect width="${canvasWidth}" height="70" fill="#eef2ff"/><text x="20" y="44" fill="#111827" font-size="28" font-family="Arial, sans-serif">HAND CROP QA: ${esc(item.id)} (hand + wrist + forearm)</text></svg>`;
  await sharp({ create: { width: canvasWidth, height: canvasHeight, channels: 3, background: "#ffffff" } }).composite([{ input: Buffer.from(header), left: 0, top: 0 }, ...composites]).png().toFile(outputFile);
}

function parseJsonOutput(stdout) {
  const text = String(stdout || "").trim();
  try { return JSON.parse(text); } catch {}
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error("二段検品agentのJSON出力を解析できません");
}

async function main() {
  const slug = arg("slug");
  if (!slug) throw new Error("usage: --slug <slug> [--inspection <json>] [--output-root <dir>] [--no-exec]");
  const logDir = path.join(ROOT, "logs", "article");
  const inspectionPath = arg("inspection") || path.join(logDir, `${slug}.independent-inspection.json`);
  const imagesPath = path.join(logDir, `${slug}.images.json`);
  if (!existsSync(inspectionPath) || !existsSync(imagesPath)) throw new Error("一次独立検品または images.json がありません");
  const inspection = JSON.parse(readFileSync(inspectionPath, "utf-8"));
  const images = JSON.parse(readFileSync(imagesPath, "utf-8"));
  const items = collectVisibleHands(inspection, imageSources(slug, images));
  const outputRoot = arg("output-root") || process.env.SUMALABO_HAND_CROP_OUTPUT_ROOT || DEFAULT_OUTPUT_ROOT;
  const cropDir = path.join(outputRoot, slug, "hand-inspection-crops");
  mkdirSync(cropDir, { recursive: true });
  const resultPath = path.join(logDir, `${slug}.hand-crop-inspection.json`);
  const promptPath = path.join(logDir, `${slug}.hand-crop-inspection-prompt.md`);
  if (items.length === 0) {
    const result = { overallPass: true, sourceImagesInspected: 0, cropsInspected: 0, verdictCounts: { ok: 0, warning: 0, needs_revision: 0 }, images: [], skipped: "no_visible_hands" };
    writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
    console.log(JSON.stringify(result));
    return;
  }
  for (const item of items) {
    item.cropFile = path.join(cropDir, `${item.id}.hand-crops.png`);
    await makeContactSheet(item, item.cropFile);
  }
  const prompt = buildHandCropPrompt(items);
  writeFileSync(promptPath, prompt, "utf-8");
  if (process.argv.includes("--no-exec")) {
    console.log(JSON.stringify({ prepared: true, sourceImages: items.length, crops: items.reduce((n, x) => n + x.handChecks.length, 0), promptPath, cropDir }));
    return;
  }
  const cli = resolveCodexCli();
  const args = [...cli.argsPrefix, "exec", "--ephemeral", "--skip-git-repo-check", "--sandbox", "read-only", "--cd", cropDir];
  for (const item of items) args.push("--image", item.cropFile);
  args.push("-");
  const startedAt = new Date().toISOString();
  const run = spawnSync(cli.command, args, { cwd: cropDir, input: prompt, encoding: "utf-8", maxBuffer: 20 * 1024 * 1024, timeout: 20 * 60 * 1000, windowsHide: true });
  if (run.error || run.status !== 0) throw new Error(`二段検品agent失敗: ${run.error?.message || run.stderr || `exit ${run.status}`}`);
  const result = applyStructuralOverrides(validateAgentResult(parseJsonOutput(run.stdout), items), items);
  result.startedAt = startedAt;
  result.finishedAt = new Date().toISOString();
  result.separateSession = true;
  const cropById = new Map(items.map((item) => [item.id, item.cropFile]));
  for (const image of result.images) image.cropFile = cropById.get(image.id);
  result.verdictCounts = summarizeVerdicts(result.images);
  result.sourceImagesInspected = items.length;
  result.cropsInspected = items.reduce((n, x) => n + x.handChecks.length, 0);
  result.overallPass = result.verdictCounts.needs_revision === 0;
  writeFileSync(resultPath, JSON.stringify(result, null, 2) + "\n", "utf-8");
  console.log(JSON.stringify(result));
  if (!result.overallPass) process.exitCode = 3;
}

const direct = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (direct) main().catch((error) => { console.error(error.message); process.exitCode = 2; });
