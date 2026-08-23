#!/usr/bin/env node
import crypto from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { NIGHT_ENVIRONMENT } from "./night-environment.mjs";
import { X_POSTED_LEDGER_PATH } from "../sumahon/x-posted-path.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) throw new Error("invalid_backup_date");
  return value;
}

function sha256(file) {
  return crypto.createHash("sha256").update(readFileSync(file)).digest("hex").toUpperCase();
}

export function backupXPostedLedger({
  date = new Date().toISOString().slice(0, 10),
  ledgerPath = X_POSTED_LEDGER_PATH,
  backupDirectory = path.join(ROOT, NIGHT_ENVIRONMENT.xPostedLedger.backupDirectory),
} = {}) {
  const datePart = validDate(date);
  const source = JSON.parse(readFileSync(ledgerPath, "utf8").replace(/^\uFEFF/u, ""));
  if (!source || source.version !== 1 || !Array.isArray(source.posts)) throw new Error("x_ledger_schema_invalid");
  mkdirSync(backupDirectory, { recursive: true });
  const backupPath = path.join(backupDirectory, `${datePart}.x-posted.json`);
  copyFileSync(ledgerPath, backupPath);
  const sourceSha256 = sha256(ledgerPath);
  const backupSha256 = sha256(backupPath);
  if (sourceSha256 !== backupSha256) throw new Error("x_ledger_backup_hash_mismatch");
  return { ok: true, date: datePart, ledgerPath, backupPath, count: source.posts.length, sourceSha256, backupSha256 };
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function main() {
  try {
    console.log(JSON.stringify(backupXPostedLedger({ date: argValue("--date") || undefined }), null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, reason: "x_ledger_backup_failed", detail: error instanceof Error ? error.message : String(error) }));
    process.exitCode = 20;
  }
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (direct) main();
