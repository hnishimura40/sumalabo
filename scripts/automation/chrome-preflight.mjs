#!/usr/bin/env node
// scripts/automation/chrome-preflight.mjs — 夜間運転のブラウザ経路プリフライト。
//
// night-run.ps1 が Chrome を起動した直後（claude を起動する前）に走らせる。
// Chrome DevTools の HTTP エンドポイント（/json）でタブ一覧を取得し、
//   1. Chrome が起動して DevTools ポートが応答するか
//   2. ChatGPT タブがあり、ログイン切れ（/auth/login 等）でないか
//   3. X(Twitter) タブがあり、ログイン切れでないか
//   4. 画像工房チャットのタブが開いているか（warn 扱い。ドライバーが後で navigate する）
// を検査する。いずれか必須項目が欠ければ exit 20 で不合格 → runner は testMode を
// 消費せず安全停止する。副作用なし（ページ操作は一切しない・読み取りのみ）。
//
// 環境変数:
//   CHROME_DEBUG_PORT   DevTools ポート（default 9222）
//   WORKSHOP_CONV_ID    工房チャットの会話ID（default は image-workshop.json から）
//
// 終了コード: 0 = 合格 / 20 = 不合格 / 2 = 実行時エラー

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..", "..");
const PORT = process.env.CHROME_DEBUG_PORT || "9222";

function loadWorkshopConvId() {
  if (process.env.WORKSHOP_CONV_ID) return process.env.WORKSHOP_CONV_ID.trim();
  try {
    const raw = readFileSync(join(ROOT, "data", "automation", "image-workshop.json"), "utf-8").replace(/^﻿/, "");
    const url = JSON.parse(raw).conversationUrl || "";
    const m = url.match(/\/c\/([0-9a-f-]{16,})/i);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function isLoginUrl(url) {
  return /\/auth\/login|\/auth\/logout|\baccounts\.google\.com\/(signin|ServiceLogin)|\/login\b|\/i\/flow\/login/i.test(url);
}

async function listTabs() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`, { cache: "no-store" });
  if (!res.ok) throw new Error(`devtools /json/list HTTP ${res.status}`);
  return res.json();
}

function out(o) {
  console.log(JSON.stringify(o, null, 2));
  process.exitCode = o.ok ? 0 : 20;
}

(async () => {
  let tabs;
  try {
    tabs = await listTabs();
  } catch (e) {
    out({ ok: false, reason: "chrome_devtools_unreachable", detail: e && e.message });
    return;
  }

  const pages = (tabs || []).filter((t) => t.type === "page");
  const urls = pages.map((t) => t.url || "");
  const chatgpt = urls.find((u) => /chatgpt\.com/i.test(u));
  const x = urls.find((u) => /(?:^|\/\/|\.)(?:x\.com|twitter\.com)\b/i.test(u));
  const workshopId = loadWorkshopConvId();
  const workshopOpen = workshopId ? urls.some((u) => u.includes(workshopId)) : false;

  const problems = [];
  if (!chatgpt) problems.push("no_chatgpt_tab");
  else if (isLoginUrl(chatgpt)) problems.push("chatgpt_logged_out");
  if (!x) problems.push("no_x_tab");
  else if (isLoginUrl(x)) problems.push("x_logged_out");

  out({
    ok: problems.length === 0,
    problems,
    warnings: workshopOpen ? [] : ["workshop_tab_not_open（ドライバーがnavigateで開く想定・warn）"],
    tabCount: pages.length,
    chatgpt: chatgpt || null,
    x: x || null,
    workshopOpen,
    sampleUrls: urls.slice(0, 12),
  });
})().catch((e) => {
  console.error("[chrome-preflight fatal]", e && e.message ? e.message : e);
  process.exitCode = 2;
});
