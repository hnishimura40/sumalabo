import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(target) : [target];
  });
}

test("PowerShell files containing Japanese are UTF-8 with BOM for Windows PowerShell 5.1", () => {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const failures = [];
  const files = filesUnder(ROOT).filter((file) => file.toLowerCase().endsWith(".ps1") && !file.includes(`${path.sep}node_modules${path.sep}`));
  for (const file of files) {
    const bytes = readFileSync(file);
    let text;
    try { text = decoder.decode(bytes); }
    catch { failures.push(`${path.relative(ROOT, file)}: invalid UTF-8`); continue; }
    if (!/[\u3040-\u30ff\u3400-\u9fff]/u.test(text)) continue;
    const hasBom = bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
    if (!hasBom) failures.push(`${path.relative(ROOT, file)}: Japanese text requires UTF-8 BOM`);
  }
  assert.deepEqual(failures, []);
});
