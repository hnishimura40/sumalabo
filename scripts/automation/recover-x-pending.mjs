#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { NIGHT_ENVIRONMENT } from "./night-environment.mjs";
import { latestPendingBundle } from "./x-pending-bundle.mjs";

function parseArgs(argv) {
  const index = argv.indexOf("--slug");
  return { slug: index >= 0 ? argv[index + 1] : null };
}

const args = parseArgs(process.argv.slice(2));
const root = NIGHT_ENVIRONMENT.runnerPath;
const pending = latestPendingBundle({ root, slug: args.slug || null });
if (!pending) {
  console.error(args.slug ? `x_pending_manifest_missing:${args.slug}` : "x_pending_manifest_missing");
  process.exit(30);
}
const script = path.join(root, "scripts", "automation", "recover-x-pending.ps1");
const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Slug", pending.slug], {
  cwd: root,
  encoding: "utf8",
  windowsHide: false,
  stdio: "inherit",
});
process.exit(result.status ?? 30);
