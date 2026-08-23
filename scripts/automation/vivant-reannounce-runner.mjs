#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { X_POSTED_LEDGER_PATH } from "../sumahon/x-posted-path.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SLUG = "202607-vivant-ai-hayato-reality-check";
const ARTICLE_URL = `https://sumalabo.com/articles/${SLUG}/`;

function readJson(file, fallback) {
  try { return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")); }
  catch { return fallback; }
}

function writeResult(result) {
  const dir = path.join(ROOT, "logs", "social");
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${SLUG}.reannounce-schedule.json`);
  writeFileSync(file, JSON.stringify({ ...result, checkedAt: new Date().toISOString() }, null, 2) + "\n", "utf8");
  console.log(JSON.stringify(result));
}

export function existingReannouncement(posts) {
  const post = (posts || []).find((item) => item?.slug === SLUG);
  const recovery = post?.recoveryPosts || [];
  return recovery.find((item) => /^https:\/\/x\.com\/suma_labo\/status\/\d+/.test(item?.postUrl || "")
    && /^https:\/\/x\.com\/suma_labo\/status\/\d+/.test(item?.replyUrl || "")) || null;
}

export async function run({ fetchImpl = fetch, root = ROOT } = {}) {
  const ledger = readJson(X_POSTED_LEDGER_PATH, { posts: [] });
  const existing = existingReannouncement(ledger.posts);
  if (existing) {
    return { outcome: "stopped", reason: "existing_reannouncement", slug: SLUG, postUrl: existing.postUrl, replyUrl: existing.replyUrl };
  }
  let response;
  try { response = await fetchImpl(ARTICLE_URL, { redirect: "follow", cache: "no-store" }); }
  catch (error) { return { outcome: "failed", reason: "article_http_unreachable", slug: SLUG, detail: error instanceof Error ? error.message : String(error) }; }
  if (response.status !== 200) return { outcome: "failed", reason: "article_http_not_200", slug: SLUG, status: response.status };
  // Posting is intentionally not attempted here until a fresh, dedicated
  // reannouncement record exists. This keeps the weekly task fail-closed and
  // prevents the original-post ledger from being overwritten.
  return { outcome: "failed", reason: "reannouncement_execution_not_implemented", slug: SLUG };
}

async function main() {
  const result = await run();
  writeResult(result);
  process.exitCode = result.outcome === "stopped" ? 20 : 30;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
