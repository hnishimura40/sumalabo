#!/usr/bin/env node
// scripts/automation/delete-x-post.mjs — 誤投稿の是正手段 (L2)。
//
// 使い方: npm run x:delete -- --id <tweetId> [--slug <slug>] [--reason <why>]
//
// - DELETE /2/tweets/:id で削除
// - incident 記録と連動（kind: "x_post_deleted"。error budget の「X投稿の削除が
//   必要になった事象」に該当するため autonomy.json の incidents に追記）
// - 台帳 (data/social/x-posted.json) の該当レコードに deletedAt を注記
//
// 認証・secrets の扱いは post-to-x-api.mjs と同じ（値は表示しない）。

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { recordIncident } from "./autonomy.mjs";
import { loadCredentials, buildOAuthHeader } from "./post-to-x-api.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const API_BASE = process.env.X_API_BASE || "https://api.x.com";
const LEDGER = path.join(ROOT, "data", "social", "x-posted.json");

async function main() {
  const args = { id: null, slug: null, reason: null, dryRun: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--id") args.id = argv[++i];
    else if (argv[i] === "--slug") args.slug = argv[++i];
    else if (argv[i] === "--reason") args.reason = argv[++i];
    else if (argv[i] === "--dry-run") args.dryRun = true;
    else if (argv[i].startsWith("--id=")) args.id = argv[i].slice(5);
    else if (argv[i].startsWith("--slug=")) args.slug = argv[i].slice(7);
    else if (argv[i].startsWith("--reason=")) args.reason = argv[i].slice(9);
  }
  if (!args.id || !/^\d+$/.test(args.id)) {
    console.error("usage: npm run x:delete -- --id <tweetId> [--slug <slug>] [--reason <why>]");
    process.exitCode = 2;
    return;
  }

  const { creds, missing } = loadCredentials();
  if (args.dryRun) {
    console.log(JSON.stringify({ dryRun: true, endpoint: `DELETE ${API_BASE}/2/tweets/${args.id}`, credentialsConfigured: missing.length === 0 }, null, 2));
    process.exitCode = 0;
    return;
  }
  if (missing.length > 0) {
    console.error(`[x-delete] 認証情報が未設定です: ${missing.join(", ")}。値は表示しません。`);
    process.exitCode = 1;
    return;
  }

  const url = `${API_BASE}/2/tweets/${args.id}`;
  let res;
  try {
    res = await fetch(url, { method: "DELETE", headers: { Authorization: buildOAuthHeader({ method: "DELETE", url, creds }) } });
  } catch (e) {
    console.error("[x-delete] ネットワークエラー:", e && e.message);
    process.exitCode = 1;
    return;
  }
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.data?.deleted !== true) {
    console.error(`[x-delete] 削除失敗 (status=${res.status})`);
    process.exitCode = 1;
    return;
  }
  console.log(`[x-delete] 削除成功: ${args.id}`);

  // incident 記録（X投稿の削除が必要になった事象 = error budget 対象）
  recordIncident({ slug: args.slug || null, kind: "x_post_deleted", detail: args.reason || `tweetId=${args.id}` });

  // 台帳注記
  try {
    if (existsSync(LEDGER)) {
      const ledger = JSON.parse(readFileSync(LEDGER, "utf-8"));
      const list = Array.isArray(ledger) ? ledger : ledger.posts || [];
      const rec = list.find((r) => (r.postUrl || "").includes(args.id) || r.slug === args.slug);
      if (rec) {
        rec.deletedAt = new Date().toISOString();
        rec.deleteReason = args.reason || null;
        writeFileSync(LEDGER, JSON.stringify(ledger, null, 2) + "\n", "utf-8");
      }
    }
  } catch {}

  await notifyAutonomyEvent({
    slug: args.slug || "x-post",
    status: "x_post_deleted",
    title: `[autonomy] X投稿を削除しました (id=${args.id})${args.reason ? `: ${args.reason}` : ""}`,
  }).catch(() => {});
  process.exitCode = 0;
}

main().catch((err) => {
  console.error("[x-delete fatal]", err && err.message ? err.message : err);
  process.exitCode = 1;
});
