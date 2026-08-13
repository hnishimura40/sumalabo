import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ENVIRONMENT_FILE = path.join(SOURCE_ROOT, "config", "night-environment.json");

export function loadNightEnvironment(file = ENVIRONMENT_FILE) {
  const value = JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
  if (value.schemaVersion !== 1) throw new Error("unsupported_night_environment_schema");
  return value;
}

export const NIGHT_ENVIRONMENT = loadNightEnvironment();
export const RUNNER_ROOT = process.env.SUMALABO_NIGHT_RUNNER_ROOT || NIGHT_ENVIRONMENT.runnerPath;
export const ENTRY_ROOT = process.env.SUMALABO_NIGHT_ENTRY_ROOT || NIGHT_ENVIRONMENT.entryRoot;

export function chromeProfilePath(environment = NIGHT_ENVIRONMENT) {
  return path.join(environment.chrome.userDataDirectory, environment.chrome.profileDirectory);
}
