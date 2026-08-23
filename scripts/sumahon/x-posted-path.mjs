import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENVIRONMENT_FILE = path.join(ROOT, "config", "night-environment.json");

function loadEnvironment(file = ENVIRONMENT_FILE) {
  return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/u, ""));
}

export function expandPathTemplate(template, env = process.env) {
  const userProfile = env.USERPROFILE || os.homedir();
  return path.resolve(String(template).replace(/%USERPROFILE%/gi, userProfile));
}

export function resolveXPostedLedgerPath({ env = process.env, environment = loadEnvironment() } = {}) {
  if (env.SUMALABO_X_POSTED_LEDGER_PATH) return path.resolve(env.SUMALABO_X_POSTED_LEDGER_PATH);
  const template = environment.xPostedLedger?.pathTemplate;
  if (!template) throw new Error("x_posted_ledger_path_missing_from_environment");
  return expandPathTemplate(template, env);
}

export const X_POSTED_LEDGER_PATH = resolveXPostedLedgerPath();

export function inspectXPostedLedgerAccess(ledgerPath = X_POSTED_LEDGER_PATH) {
  try {
    if (!existsSync(ledgerPath)) return { ok: false, reason: "x_ledger_missing", ledgerPath };
    accessSync(ledgerPath, constants.R_OK | constants.W_OK);
    accessSync(path.dirname(ledgerPath), constants.W_OK);
    const parsed = JSON.parse(readFileSync(ledgerPath, "utf8").replace(/^\uFEFF/u, ""));
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.posts)) {
      return { ok: false, reason: "x_ledger_schema_invalid", ledgerPath };
    }
    const unique = new Set(parsed.posts.map((post) => post?.slug).filter(Boolean));
    if (unique.size !== parsed.posts.length) {
      return { ok: false, reason: "x_ledger_duplicate_slug", ledgerPath, count: parsed.posts.length, unique: unique.size };
    }
    return { ok: true, ledgerPath, count: parsed.posts.length, unique: unique.size };
  } catch (error) {
    return { ok: false, reason: "x_ledger_io_error", detail: error instanceof Error ? error.message : String(error), ledgerPath };
  }
}
