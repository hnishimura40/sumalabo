#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";
import process from "node:process";

const DIRECTIVE_LINE_RE = /^\s*::/;

export function filterReportOutput(input) {
  const text = String(input ?? "");
  const hadTrailingNewline = /\r?\n$/.test(text);
  const lines = text.split(/\r?\n/);
  const kept = [];
  let removed = 0;
  for (const line of lines) {
    if (DIRECTIVE_LINE_RE.test(line)) {
      removed += 1;
      continue;
    }
    kept.push(line);
  }
  let output = kept.join("\n");
  if (hadTrailingNewline && output && !output.endsWith("\n")) output += "\n";
  return { output, removed };
}

export function sanitizeReportText(input) {
  return filterReportOutput(input).output;
}

async function main() {
  const input = readFileSync(0, "utf8");
  const result = filterReportOutput(input);
  process.stdout.write(result.output);
  if (process.argv.includes("--stats")) {
    process.stderr.write(JSON.stringify({ removed: result.removed }) + "\n");
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) main().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
