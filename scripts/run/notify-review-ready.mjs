#!/usr/bin/env node
// CLI: PWA Push通知 (/api/push/notify-review-ready) を手動またはWindowsタスクから叩くラッパー。
//
// 例:
//   node scripts/run/notify-review-ready.mjs \
//     --slug 202605-xxx \
//     --title "..." \
//     --branch preview/xxx \
//     --previewUrl "https://<host>/articles/202605-xxx/" \
//     --prUrl "https://github.com/.../pull/N" \
//     --thumbnail "/images/thumbnails/202605-xxx.png" \
//     --sourceCheckPassed true
//
//   npm run sumahon:notify-review-ready -- --slug ... --title ... --branch ... [...]
//
// 終了コード:
//   0 = 通知送信が ok（API側 ok:true）
//   2 = 通知が送れなかったが致命ではない（skip / 接続失敗 / 401 など）
//   1 = 引数エラー等で実行不能
//
// 例外的に exit code 2 を warning として扱い、呼び出し元が継続できるようにしている。

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { notifyReviewReady } from "../sumahon/notify-review-ready.mjs";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function asBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }
  return undefined;
}

function asString(value) {
  return typeof value === "string" ? value : "";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = asString(args.slug).trim();
  if (!slug) {
    console.error("Usage: notify-review-ready --slug <slug> [--title ...] [--branch ...] [--previewUrl ...] [--prUrl ...] [--thumbnail ...] [--status review] [--sourceCheckPassed true|false]");
    process.exit(1);
  }

  const item = {
    slug,
    title: asString(args.title).trim() || undefined,
    branch: asString(args.branch).trim() || undefined,
    previewUrl: asString(args.previewUrl).trim() || undefined,
    prUrl: asString(args.prUrl).trim() || undefined,
    thumbnail: asString(args.thumbnail).trim() || undefined,
    status: asString(args.status).trim() || "review",
  };
  const scp = asBool(args.sourceCheckPassed);
  if (scp !== undefined) item.sourceCheckPassed = scp;

  const apiUrl = asString(args.apiUrl).trim() || undefined;
  const secret = asString(args.secret).trim() || undefined;

  const result = await notifyReviewReady({ item, apiUrl, secret });

  const logDir = path.join("logs", "preview");
  await mkdir(logDir, { recursive: true });
  const logPath = path.join(logDir, `${slug}.notify.json`);
  await writeFile(logPath, JSON.stringify(result, null, 2), "utf-8");
  console.log(JSON.stringify({ logPath, ...result }, null, 2));

  if (result.ok) process.exit(0);
  // 失敗だが致命ではない扱い（呼び出し元が warning として継続できる）
  process.exit(2);
}

main().catch((err) => {
  console.error("notify-review-ready failed:", err && err.stack ? err.stack : err);
  process.exit(1);
});
