// すまほん watch のキュー + 既処理 URL 台帳の読み書きヘルパー。
//
// 保存先:
// - 既処理 URL: data/automation/processed-urls.json (create-from-sumahon が既に使う既存ファイル)
//   形式: [{ sourceUrl, slug, processedAt, title, classification }]
// - キュー: data/automation/sumahon-queue.json
//   形式: [{ url, title, publishedAt, addedAt, status, slug?, branch?, prUrl?, previewUrl?, errorReason?, statusUpdatedAt, attempts }]
//
// 状態 (status):
// - queued: 新規検知済み、未処理
// - processing: 取り出して処理中
// - preview_created: Preview ブランチ push + PR 作成完了
// - human_review_waiting: Preview 完了、人間の承認待ち（preview_created と同義の別ラベル）
// - failed: 処理失敗。errorReason に理由
//
// 注意:
// - 既存の create-from-sumahon.mjs と互換性のある processed-urls.json をそのまま使う
// - キューに同 URL が複数回入らないように getOrEnqueue を使う
// - 起動ごとに 1 件ずつしか processing にしない（max-jobs オプションで調整可）

import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PROCESSED_PATH = path.join("data", "automation", "processed-urls.json");
const QUEUE_PATH = path.join("data", "automation", "sumahon-queue.json");

async function readJsonSafe(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

async function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function readProcessed(processedPath = PROCESSED_PATH) {
  const v = await readJsonSafe(processedPath, []);
  return Array.isArray(v) ? v : [];
}

export async function isProcessed(sourceUrl, processedPath = PROCESSED_PATH) {
  const list = await readProcessed(processedPath);
  return list.some((p) => p?.sourceUrl === sourceUrl);
}

export async function readQueue(queuePath = QUEUE_PATH) {
  const v = await readJsonSafe(queuePath, []);
  return Array.isArray(v) ? v : [];
}

export async function writeQueue(queue, queuePath = QUEUE_PATH) {
  await writeJsonAtomic(queuePath, queue);
}

export function findQueueEntry(queue, url) {
  return queue.find((q) => q.url === url) || null;
}

/**
 * 新規 URL であり、まだ processed-urls にも queue にも入っていなければキューに追加して返す。
 * 既存（processed または queue にあり）の場合は null。
 */
export async function enqueueIfNew(item, { processedPath = PROCESSED_PATH, queuePath = QUEUE_PATH } = {}) {
  if (!item?.url) return null;
  if (await isProcessed(item.url, processedPath)) return null;
  const queue = await readQueue(queuePath);
  if (findQueueEntry(queue, item.url)) return null;
  const entry = {
    url: item.url,
    title: item.title || "",
    publishedAt: item.publishedAt || null,
    addedAt: new Date().toISOString(),
    status: "queued",
    statusUpdatedAt: new Date().toISOString(),
    attempts: 0,
    source: item.source || "rss",
  };
  queue.push(entry);
  await writeQueue(queue, queuePath);
  return entry;
}

/**
 * status が queued のものを1件 pick して status=processing に更新。
 * 戻り値: ピックされた entry または null。
 */
export async function pickNextQueued(queuePath = QUEUE_PATH) {
  const queue = await readQueue(queuePath);
  const idx = queue.findIndex((q) => q.status === "queued");
  if (idx < 0) return null;
  const entry = queue[idx];
  entry.status = "processing";
  entry.statusUpdatedAt = new Date().toISOString();
  entry.attempts = (entry.attempts || 0) + 1;
  await writeQueue(queue, queuePath);
  return entry;
}

/**
 * 既存 entry の status を更新して保存。
 */
export async function updateStatus(url, patch, queuePath = QUEUE_PATH) {
  const queue = await readQueue(queuePath);
  const entry = findQueueEntry(queue, url);
  if (!entry) return null;
  Object.assign(entry, patch, { statusUpdatedAt: new Date().toISOString() });
  await writeQueue(queue, queuePath);
  return entry;
}

export function summarizeQueue(queue) {
  const counts = {};
  for (const q of queue) {
    counts[q.status] = (counts[q.status] || 0) + 1;
  }
  return counts;
}

export const PATHS = { PROCESSED_PATH, QUEUE_PATH };
