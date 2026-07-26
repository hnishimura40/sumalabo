#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function evaluateHandCropGate(result) {
  const needsRevision = result?.verdictCounts?.needs_revision;
  if (!Number.isInteger(needsRevision)) return { pass: false, message: "判定内訳が不正です" };
  if (needsRevision > 0) return { pass: false, message: `needs_revision が ${needsRevision} 枚残っています` };
  return { pass: true, message: `実施画像 ${result.sourceImagesInspected || 0}枚 / warning ${result.verdictCounts?.warning || 0} / needs_revision 0` };
}

function main() {
  const at = process.argv.indexOf("--slug");
  const slug = at >= 0 ? process.argv[at + 1] : null;
  if (!slug) { console.error("usage: --slug <slug>"); process.exitCode = 2; return; }
  const file = path.join(ROOT, "logs", "article", `${slug}.hand-crop-inspection.json`);
  if (!existsSync(file)) { console.error(`[hand-crop-gate] BLOCK: 二段検品ログがありません: ${file}`); process.exitCode = 1; return; }
  const verdict = evaluateHandCropGate(JSON.parse(readFileSync(file, "utf-8")));
  if (!verdict.pass) { console.error(`[hand-crop-gate] BLOCK: ${verdict.message}`); process.exitCode = 1; return; }
  console.log(`[hand-crop-gate] PASS: ${verdict.message}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
