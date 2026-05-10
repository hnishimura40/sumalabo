// Cloudflare Pages Function: POST /api/push/subscribe
//
// 役割:
//   PWA画面（/review/）から送られる Web Push subscription オブジェクトを
//   Cloudflare KV `SUMALABO_REVIEW_KV` に保存する。
//
// キー設計:
//   push:subscription:{hash}  → 個別の購読
//   push:subscription:index   → JSON配列のハッシュ一覧
//
// セキュリティ:
//   公開エンドポイント（VAPID公開鍵で生成された subscription を受け取る）。
//   個人運用前提のためBASIC認証等は付けない。将来Cloudflare Accessでガード可。

interface Env {
  SUMALABO_REVIEW_KV?: KVNamespace;
}

interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

async function hashEndpoint(endpoint: string): Promise<string> {
  const data = new TextEncoder().encode(endpoint);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (const b of bytes) hex += b.toString(16).padStart(2, "0");
  return hex.slice(0, 32);
}

async function loadIndex(kv: KVNamespace): Promise<string[]> {
  const raw = await kv.get("push:subscription:index", "text");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

async function saveIndex(kv: KVNamespace, hashes: string[]): Promise<void> {
  await kv.put("push:subscription:index", JSON.stringify(hashes));
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SUMALABO_REVIEW_KV) {
    return json({ ok: false, message: "KV namespace SUMALABO_REVIEW_KV is not bound." }, 500);
  }
  let body: { subscription?: PushSubscriptionJSON } = {};
  try {
    body = (await request.json()) as { subscription?: PushSubscriptionJSON };
  } catch {
    return json({ ok: false, message: "Body must be JSON." }, 400);
  }
  const sub = body.subscription;
  if (!sub || typeof sub.endpoint !== "string" || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    return json({ ok: false, message: "subscription（endpoint / keys.p256dh / keys.auth）が不正です。" }, 400);
  }
  const hash = await hashEndpoint(sub.endpoint);
  const record = {
    endpoint: sub.endpoint,
    expirationTime: sub.expirationTime ?? null,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    createdAt: new Date().toISOString(),
    hash,
  };
  await env.SUMALABO_REVIEW_KV.put(`push:subscription:${hash}`, JSON.stringify(record));
  const idx = await loadIndex(env.SUMALABO_REVIEW_KV);
  if (!idx.includes(hash)) {
    idx.unshift(hash);
    if (idx.length > 50) idx.length = 50;
    await saveIndex(env.SUMALABO_REVIEW_KV, idx);
  }
  return json({ ok: true, hash });
};
