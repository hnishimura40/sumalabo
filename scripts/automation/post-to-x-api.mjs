#!/usr/bin/env node
// scripts/automation/post-to-x-api.mjs — X API v2 による投稿 (L2: Phase C の API 移行)。
//
// 背景: ブラウザ自動投稿はタブ混線・composer の OGP プレビュー廃止など無人運転に
// 耐えない脆さがある（2026-07-04 Fable 5 Phase C で実演）。API が正規の自動投稿
// 手段であり、OGP カードは X 側の非同期生成になるため貼り直し問題も構造的に消える。
//
// 使い方:
//   node scripts/automation/post-to-x-api.mjs --slug <slug> [--dry-run] [--variant primary]
//
// 入力: slug → content/articles/{slug}.mdx の frontmatter から本番URL・タイトル・
//       description を解決し、既存 Phase C の生成ロジック (generateXPost) で投稿文を作る。
//
// 認証: OAuth 1.0a user context（依存パッケージなし・node:crypto の HMAC-SHA1）。
//   環境変数（または .secrets/x-api.env を dotenv 形式で読み込み）:
//     X_API_CONSUMER_KEY / X_API_CONSUMER_SECRET /
//     X_API_ACCESS_TOKEN / X_API_ACCESS_TOKEN_SECRET
//   値は表示・ログ出力・コミットしない。
//
// 安全装置:
//   - autonomy ゲート (phase_c)。paused なら停止。--trigger=auto_after_veto は level>=2 が必要
//   - 二重投稿ガード: data/social/x-posted.json に該当 slug があればエラー停止
//   - 投稿文にも禁則語チェック（gate と同じ data/qa/forbidden-words.json の violation を適用）
//   - リトライは 1 回まで。ただし「送信されたか不明な失敗」（ネットワーク断・タイムアウト・
//     5xx）はリトライせず、GET /2/users/me → GET /2/users/:id/tweets で実在確認してから判断
//   - 投稿後: oEmbed (publish.twitter.com/oembed、無料・認証不要) で存在確認
//
// 終了コード: 0=成功(or dry-run) / 1=失敗 / 2=引数エラー / 3=二重投稿ガード / 4=禁則語
//
// X 自動化ルールの遵守: 本スクリプトは 1 実行 = 1 記事 = 1 投稿のみ。大量投稿・
// スケジュール連投・トレンド便乗などスパム的挙動の仕組みは持たない。

import { createHmac, randomBytes } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { gate } from "./autonomy.mjs";
import { recordIncident } from "./autonomy.mjs";
import { hasPosted, recordPost } from "../sumahon/x-posted-ledger.mjs";
import { generateXPost } from "../sumahon/generate-x-post.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const API_BASE = process.env.X_API_BASE || "https://api.x.com";
const SECRETS_ENV_PATH = path.join(ROOT, ".secrets", "x-api.env");
const FORBIDDEN_PATH = path.join(ROOT, "data", "qa", "forbidden-words.json");

// ---------- secrets ----------
export function loadCredentials() {
  // .secrets/x-api.env（gitignore 済み）を dotenv 形式で読み、process.env に無いキーだけ補完
  if (existsSync(SECRETS_ENV_PATH)) {
    for (const line of readFileSync(SECRETS_ENV_PATH, "utf-8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.+?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  const creds = {
    consumerKey: process.env.X_API_CONSUMER_KEY || "",
    consumerSecret: process.env.X_API_CONSUMER_SECRET || "",
    accessToken: process.env.X_API_ACCESS_TOKEN || "",
    accessTokenSecret: process.env.X_API_ACCESS_TOKEN_SECRET || "",
  };
  const missing = Object.entries(creds).filter(([, v]) => !v).map(([k]) => k);
  return { creds, missing };
}

// ---------- OAuth 1.0a (HMAC-SHA1) ----------
function pct(s) {
  return encodeURIComponent(s).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export function buildOAuthHeader({ method, url, creds, nonce = null, timestamp = null }) {
  const params = {
    oauth_consumer_key: creds.consumerKey,
    oauth_nonce: nonce || randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(timestamp || Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: "1.0",
  };
  // JSON ボディの v2 エンドポイントでは署名対象は oauth_* パラメータのみ
  const u = new URL(url);
  for (const [k, v] of u.searchParams) params[k] = v;
  const baseParams = Object.keys(params)
    .sort()
    .map((k) => `${pct(k)}=${pct(params[k])}`)
    .join("&");
  const baseUrl = `${u.origin}${u.pathname}`;
  const baseString = [method.toUpperCase(), pct(baseUrl), pct(baseParams)].join("&");
  const signingKey = `${pct(creds.consumerSecret)}&${pct(creds.accessTokenSecret)}`;
  const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");
  const headerParams = { ...params, oauth_signature: signature };
  const header =
    "OAuth " +
    Object.keys(headerParams)
      .filter((k) => k.startsWith("oauth_"))
      .sort()
      .map((k) => `${pct(k)}="${pct(headerParams[k])}"`)
      .join(", ");
  return header;
}

// ---------- 禁則語チェック（gate と同じ定義の violation を適用） ----------
export function checkForbidden(text, forbiddenPath = FORBIDDEN_PATH) {
  let defs;
  try {
    defs = JSON.parse(readFileSync(forbiddenPath, "utf-8"));
  } catch {
    return { ok: false, hits: [], reason: "forbidden_words_json_unreadable" };
  }
  const patterns = Array.isArray(defs) ? defs : defs.patterns || [];
  const hits = [];
  for (const p of patterns) {
    if (p.severity && p.severity !== "violation") continue;
    const pattern = p.pattern || p.word || "";
    if (!pattern) continue;
    const re = p.regex ? new RegExp(pattern, p.flags || "") : null;
    if (re ? re.test(text) : text.includes(pattern)) {
      if (p.excludeLineRegex && new RegExp(p.excludeLineRegex).test(text)) continue;
      hits.push(pattern);
    }
  }
  return { ok: hits.length === 0, hits };
}

// ---------- 失敗分類 ----------
// definite_fail: 送信されていないことが確実 (4xx。ただし 429 は rate limit)
// ambiguous:     送信されたか不明 (ネットワーク断 / タイムアウト / 5xx)
// rate_limited:  429
export function classifyFailure({ networkError = false, status = null }) {
  if (networkError) return "ambiguous";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "ambiguous";
  if (status >= 400) return "definite_fail";
  return "unknown";
}

// ---------- 投稿文生成（既存 Phase C ロジック流用） ----------
export function buildPostText(slug) {
  const mdxPath = path.join(ROOT, "content", "articles", `${slug}.mdx`);
  if (!existsSync(mdxPath)) return { ok: false, reason: "mdx_not_found" };
  const raw = readFileSync(mdxPath, "utf-8");
  const fm = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const get = (key) => {
    const m = (fm ? fm[1] : "").match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, "m"));
    return m ? m[1].trim() : "";
  };
  const title = get("title");
  const description = get("description");
  const category = get("category");
  const articleUrl = `https://sumalabo.com/articles/${slug}/`;
  // 既存 Phase C の生成ロジックを流用（primary 案 = 194字実績のテンプレート系）
  const generated = generateXPost({ slug, title, description, category });
  const text = generated?.primary?.text || generated?.primary?.post
    || `${title}\n${articleUrl}\n#AI #ITニュース #すまラボ`;
  return { ok: true, text, title, articleUrl };
}

// ---------- API 呼び出し ----------
async function xFetch(method, urlPath, { creds, body = null, timeoutMs = 20000 }) {
  const url = `${API_BASE}${urlPath}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: buildOAuthHeader({ method, url, creds }),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const json = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, json, networkError: false };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, status: null, json: null, networkError: true, message: e && e.message };
  }
}

// 投稿されたか不明な失敗のあと、自分の直近投稿から同一テキストを探す
async function verifyPostedByLookup(creds, text) {
  const me = await xFetch("GET", "/2/users/me", { creds });
  const userId = me.json?.data?.id;
  if (!userId) return { verified: false, reason: "users_me_failed" };
  const tl = await xFetch("GET", `/2/users/${userId}/tweets?max_results=5`, { creds });
  const found = (tl.json?.data || []).find((t) => (t.text || "").startsWith(text.slice(0, 40)));
  return found ? { verified: true, tweetId: found.id } : { verified: false };
}

async function oembedExists(postUrl) {
  try {
    const r = await fetch(`https://publish.twitter.com/oembed?url=${encodeURIComponent(postUrl)}`, { cache: "no-store" });
    return r.status === 200;
  } catch {
    return false;
  }
}

// ---------- main ----------
async function main() {
  const args = { slug: null, dryRun: false, trigger: "manual" };
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a.startsWith("--slug=")) args.slug = a.slice(7).trim();
    else if (a === "--slug") args.slug = "";
    else if (args.slug === "" && !a.startsWith("--")) args.slug = a;
    else if (a.startsWith("--trigger=")) args.trigger = a.slice(10).trim();
  }
  if (!args.slug || !/^[a-z0-9][a-z0-9-]*$/i.test(args.slug)) {
    console.error("usage: node scripts/automation/post-to-x-api.mjs --slug <slug> [--dry-run]");
    process.exitCode = 2;
    return;
  }

  // autonomy ゲート（phase_c: paused 停止 / auto は level>=2）
  const g = gate({ phase: "phase_c", trigger: args.trigger });
  if (!g.allowed) {
    console.error(`[x-api] BLOCK: autonomy ${g.reason} (level=${g.level}, trigger=${args.trigger})`);
    process.exitCode = 1;
    return;
  }

  // 二重投稿ガード（タブ混線事故の教訓を API 側でも仕組み化）
  if (await hasPosted(args.slug)) {
    console.error(`[x-api] BLOCK: ${args.slug} は既に投稿済みです（data/social/x-posted.json）。二重投稿を防ぐため停止します。`);
    process.exitCode = 3;
    return;
  }

  // 投稿文生成 + 禁則語チェック
  const post = buildPostText(args.slug);
  if (!post.ok) {
    console.error(`[x-api] 投稿文を生成できません: ${post.reason}`);
    process.exitCode = 1;
    return;
  }
  const forbidden = checkForbidden(post.text);
  if (!forbidden.ok) {
    console.error(`[x-api] BLOCK: 投稿文に禁則語: ${forbidden.hits.join(", ")}`);
    process.exitCode = 4;
    return;
  }

  const { creds, missing } = loadCredentials();

  if (args.dryRun) {
    console.log("---X API DRY RUN---");
    console.log(JSON.stringify({
      endpoint: `POST ${API_BASE}/2/tweets`,
      auth: "OAuth 1.0a user context (HMAC-SHA1)",
      credentialsConfigured: missing.length === 0,
      missingCredentials: missing,
      charCount: post.text.length,
      doublePostGuard: "passed",
      forbiddenCheck: "passed",
      text: post.text,
    }, null, 2));
    process.exitCode = 0;
    return;
  }

  if (missing.length > 0) {
    console.error(`[x-api] 認証情報が未設定です: ${missing.join(", ")}（.secrets/x-api.env または環境変数）。値は表示しません。`);
    process.exitCode = 1;
    return;
  }

  // 投稿（リトライは definite_fail のみ 1 回。ambiguous は照会で確認）
  let attempt = 0;
  let tweetId = null;
  while (attempt < 2 && !tweetId) {
    attempt++;
    const res = await xFetch("POST", "/2/tweets", { creds, body: { text: post.text } });
    if (res.ok && res.json?.data?.id) {
      tweetId = res.json.data.id;
      break;
    }
    const kind = classifyFailure(res);
    console.error(`[x-api] 投稿失敗 (attempt ${attempt}, kind=${kind}, status=${res.status ?? "network"})`);
    if (kind === "ambiguous") {
      console.error("[x-api] 送信されたか不明のためリトライしません。タイムライン照会で実在確認します...");
      const check = await verifyPostedByLookup(creds, post.text);
      if (check.verified) {
        tweetId = check.tweetId;
        console.log(`[x-api] 照会の結果、投稿は成立していました (id=${tweetId})`);
        break;
      }
      console.error("[x-api] 投稿は見つかりませんでした。安全のため自動リトライせず停止します（手動で再実行してください）。");
      process.exitCode = 1;
      return;
    }
    if (kind === "rate_limited") {
      console.error("[x-api] rate limit (429)。リトライせず停止します。");
      process.exitCode = 1;
      return;
    }
    if (attempt >= 2) {
      console.error("[x-api] リトライ上限（1回）に達しました。停止します。");
      process.exitCode = 1;
      return;
    }
  }

  const postUrl = `https://x.com/suma_labo/status/${tweetId}`;
  console.log(`[x-api] 投稿成功: ${postUrl}`);

  // 投稿後の存在確認（OGPカード確認の代替: oEmbed）
  const exists = await oembedExists(postUrl);
  console.log(`[x-api] oEmbed 存在確認: ${exists ? "OK" : "未確認（反映待ちの可能性）"}`);

  // 台帳・queue・review item 更新（既存のマージ更新方式）
  await recordPost({ slug: args.slug, postUrl, postText: post.text, method: "api" });
  try {
    const queuePath = path.join(ROOT, "data", "automation", "sumahon-queue.json");
    if (existsSync(queuePath)) {
      const queue = JSON.parse(readFileSync(queuePath, "utf-8"));
      const entry = queue.find((e) => e.slug === args.slug);
      if (entry) {
        entry.status = "x_posted";
        entry.xPostUrl = postUrl;
        entry.xPostedAt = new Date().toISOString();
        entry.xPostText = post.text.split("\n")[0];
        entry.statusUpdatedAt = new Date().toISOString();
        const { writeFileSync } = await import("node:fs");
        writeFileSync(queuePath, JSON.stringify(queue, null, 2) + "\n", "utf-8");
      }
    }
  } catch (e) {
    console.warn("[x-api] queue 更新失敗（非致命）:", e && e.message);
  }
  await notifyAutonomyEvent({
    slug: args.slug,
    status: "x_posted",
    title: `[autonomy] X投稿完了 (API): ${args.slug}`,
    previewUrl: post.articleUrl,
  }).catch(() => {});

  console.log(JSON.stringify({ ok: true, slug: args.slug, postUrl, oembedVerified: exists, method: "api" }, null, 2));
  process.exitCode = 0;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error("[x-api fatal]", err && err.message ? err.message : err);
    process.exitCode = 1;
  });
}
