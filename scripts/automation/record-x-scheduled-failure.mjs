#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ledgerPath = path.join(ROOT, "data", "automation", "ledger.json");
const value = (name) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1] : "";
};
const slug = value("slug");
const reason = value("reason") || "scheduled X post failed";
if (!slug || !existsSync(ledgerPath)) throw new Error("--slug and ledger.json are required");
const ledger = JSON.parse(readFileSync(ledgerPath, "utf8").replace(/^\uFEFF/, ""));
const entries = Array.isArray(ledger) ? ledger : ledger.entries;
if (!Array.isArray(entries)) throw new Error("ledger entries are invalid");
let entry = entries.find((item) => item?.slug === slug);
if (!entry) {
  entry = { slug, status: "published", incidents: [] };
  entries.push(entry);
}
if (!Array.isArray(entry.incidents)) entry.incidents = [];
entry.incidents.push({
  type: "scheduled_x_post_failed",
  at: new Date().toISOString(),
  reason,
  route: "claude-in-chrome",
  retry: "none",
});
entry.xPostScheduledResult = "failed_no_retry";
writeFileSync(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ok: true, slug, reason }));
