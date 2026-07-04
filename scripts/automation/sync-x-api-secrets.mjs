#!/usr/bin/env node
// scripts/automation/sync-x-api-secrets.mjs — .secrets/x-api.env を GitHub Actions
// secrets へ転送する（値は一切表示しない）。
//
// 使い方: npm run x:sync-secrets
// 前提: gh CLI ログイン済み / .secrets/x-api.env に 4 キーが保存済み

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV_PATH = path.join(ROOT, ".secrets", "x-api.env");
const KEYS = ["X_API_CONSUMER_KEY", "X_API_CONSUMER_SECRET", "X_API_ACCESS_TOKEN", "X_API_ACCESS_TOKEN_SECRET"];

if (!existsSync(ENV_PATH)) {
  console.error(".secrets/x-api.env が見つかりません。docs/x_api_setup.md の手順 6 を先に行ってください。");
  process.exit(1);
}
const values = {};
for (const line of readFileSync(ENV_PATH, "utf-8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
  if (m) values[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const missing = KEYS.filter((k) => !values[k]);
if (missing.length) {
  console.error(`未設定のキーがあります: ${missing.join(", ")}（値は表示しません）`);
  process.exit(1);
}
let ok = 0;
for (const k of KEYS) {
  const r = spawnSync("gh", ["secret", "set", k, "--repo", "hnishimura40/sumalabo"], {
    input: values[k],
    stdio: ["pipe", "ignore", "inherit"],
  });
  if (r.status === 0) {
    ok++;
    console.log(`set: ${k} (length=${values[k].length})`);
  } else {
    console.error(`failed: ${k}`);
  }
}
console.log(`${ok}/${KEYS.length} secrets を Actions に登録しました。値は表示していません。`);
process.exit(ok === KEYS.length ? 0 : 1);
