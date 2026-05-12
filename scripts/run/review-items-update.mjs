#!/usr/bin/env node
// Review items KV を **安全に** 更新するための CLI。
//
// 背景 (2026-05-12, PR #40):
//   import-generated が生成した Galaxy S27 の review item が KV に
//   `status: review` で残っており、CF Pages の branch preview が
//   無いまま PWA 通知が送信されてしまった。本物の preview URL が
//   表示できる状態ではないため、review item を `preview_unavailable`
//   に降格して購読者が誤承認しないようにする必要がある。
//
//   この操作を curl で手入力させると間違えやすいので、専用 CLI を
//   作って引数チェック + 既存値の merge + 確認ログを必ず出す形にした。
//
// 使い方:
//   node scripts/run/review-items-update.mjs --slug 202605-galaxy-s27-... --status preview_unavailable
//     [--title "..."] [--branch "auto/imported-..."] [--source-check-failed]
//     [--api-url https://sumalabo.com/api/review-items] [--secret <secret>]
//
// 環境変数:
//   REVIEW_NOTIFY_SECRET  (必須、--secret で上書き可)
//   SUMALABO_REVIEW_API_URL (任意、既定 https://sumalabo.com/api/review-items)
//
// 動作:
//   1. 引数を検証
//   2. 既存 KV item を GET (一覧から該当 slug を探す)
//   3. 指定したフィールドを上書きした新 record を作って POST
//   4. レスポンスと before/after を JSON で標準出力に流す
//
// 安全方針:
//   - main や production への push は行わない
//   - status は限定リスト ["review", "preview_unavailable", "approved", "rejected",
//     "preview_deploy_missing"] からのみ受理
//   - --confirm-production を必須にして誤実行を防ぐ
//   - X 投稿は触らない

import { parseArgs as nodeParseArgs } from "node:util";

const DEFAULT_API_URL = "https://sumalabo.com/api/review-items";
const ALLOWED_STATUSES = new Set([
  "review",
  "preview_unavailable",
  "preview_deploy_missing",
  "approved",
  "rejected",
  "invalidated",
]);

function usage() {
  console.error(`Usage:
  node scripts/run/review-items-update.mjs \\
    --slug <slug> --status <status> \\
    [--title "<override title>"] \\
    [--branch <branch-name>] \\
    [--preview-url <url>] \\
    [--source-check-failed | --source-check-passed] \\
    [--api-url https://sumalabo.com/api/review-items] \\
    [--secret <secret>] \\
    --confirm-production

Allowed statuses: ${Array.from(ALLOWED_STATUSES).join(", ")}
`);
}

async function fetchExisting(apiUrl, slug) {
  try {
    const res = await fetch(apiUrl, { method: "GET" });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || !Array.isArray(body.items)) return null;
    return body.items.find((it) => it && it.slug === slug) || null;
  } catch {
    return null;
  }
}

async function main() {
  let args;
  try {
    ({ values: args } = nodeParseArgs({
      strict: false,
      allowPositionals: false,
      options: {
        slug: { type: "string" },
        status: { type: "string" },
        title: { type: "string" },
        branch: { type: "string" },
        "preview-url": { type: "string" },
        "api-url": { type: "string" },
        secret: { type: "string" },
        "source-check-failed": { type: "boolean", default: false },
        "source-check-passed": { type: "boolean", default: false },
        "confirm-production": { type: "boolean", default: false },
        help: { type: "boolean", default: false },
      },
    }));
  } catch (e) {
    console.error("argument parsing failed:", e.message);
    usage();
    process.exit(2);
  }
  if (args.help) {
    usage();
    process.exit(0);
  }
  const slug = (args.slug || "").trim();
  const status = (args.status || "").trim();
  if (!slug || !status) {
    console.error("missing --slug or --status");
    usage();
    process.exit(2);
  }
  if (!ALLOWED_STATUSES.has(status)) {
    console.error(`invalid status "${status}". allowed: ${Array.from(ALLOWED_STATUSES).join(", ")}`);
    process.exit(2);
  }
  if (!args["confirm-production"]) {
    console.error("refusing to call production API without --confirm-production");
    process.exit(2);
  }
  const apiUrl = (args["api-url"] || process.env.SUMALABO_REVIEW_API_URL || DEFAULT_API_URL).trim();
  const secret = (args.secret || process.env.REVIEW_NOTIFY_SECRET || "").trim();
  if (!secret) {
    console.error("missing REVIEW_NOTIFY_SECRET (or --secret).");
    process.exit(2);
  }

  const existing = await fetchExisting(apiUrl, slug);

  const item = {
    slug,
    status,
  };
  if (args.title) item.title = args.title;
  else if (existing?.title) item.title = existing.title;

  if (args.branch) item.branch = args.branch;
  else if (existing?.branch) item.branch = existing.branch;

  if (args["preview-url"]) item.previewUrl = args["preview-url"];
  else if (existing?.previewUrl) item.previewUrl = existing.previewUrl;

  if (args["source-check-failed"]) item.sourceCheckPassed = false;
  else if (args["source-check-passed"]) item.sourceCheckPassed = true;
  else if (typeof existing?.sourceCheckPassed === "boolean") item.sourceCheckPassed = existing.sourceCheckPassed;

  if (existing?.prUrl) item.prUrl = existing.prUrl;
  if (existing?.thumbnail) item.thumbnail = existing.thumbnail;
  if (existing?.createdAt) item.createdAt = existing.createdAt;

  console.log("=== Review item update ===");
  console.log("api: ", apiUrl);
  console.log("before:", JSON.stringify(existing, null, 2));
  console.log("after :", JSON.stringify(item, null, 2));

  let res;
  try {
    res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Notify-Secret": secret,
        Accept: "application/json",
      },
      body: JSON.stringify({ item }),
    });
  } catch (e) {
    console.error("POST failed:", e.message);
    process.exit(1);
  }
  let body;
  try { body = await res.json(); } catch { body = await res.text(); }
  console.log(`response status: ${res.status}`);
  console.log(typeof body === "string" ? body : JSON.stringify(body, null, 2));
  if (!res.ok) process.exit(1);
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(1);
});
