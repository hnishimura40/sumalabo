// Cloudflare Pages Function: POST /api/push/notify-review-ready
//
// 役割:
//   自動処理側（Windowsタスク / Claude Code）から呼ばれ、KVに保存済みの
//   Web Push 購読者全員に「新しい確認待ち記事ができた」通知を送る。
//   オプションで、確認待ち記事リストへも登録する。
//
// セキュリティ:
//   REVIEW_NOTIFY_SECRET ヘッダーまたはBodyのsecret一致を必須とする。
//
// VAPID署名:
//   ES256 (ECDSA P-256, SHA-256) で JWT を作って Authorization: vapid t=<jwt>,k=<applicationServerKey>
//   暗号化は省略（payloadなしのバージョンも可）。本実装は payloadなしの「通知トリガー」型。
//   ペイロードを送る場合は ECDH 鍵交換と AES-GCM 暗号化が必要だが、本ファイルでは
//   "data なしのプッシュメッセージ" を送り、Service Worker 側で getNotifications() か
//   /api/review-items を取りに行く形に依存させる。
//
//   ※ payloadを送りたい場合は別途RFC8291に従って実装する必要がある。
//   ※ 本実装では payload があれば payload なしのフォールバックで送信する（最小実装）。

interface Env {
  SUMALABO_REVIEW_KV?: KVNamespace;
  REVIEW_NOTIFY_SECRET?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  hash?: string;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s: string): Uint8Array {
  const padding = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function importVapidPrivateKey(privateKeyB64Url: string): Promise<CryptoKey> {
  const raw = b64urlDecode(privateKeyB64Url);
  // VAPID private key is the 32-byte d (private scalar) for P-256.
  // Use PKCS8 import via JWK form.
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: privateKeyB64Url.replace(/=+$/g, ""),
    // public key components are required for proper ECDSA import on many runtimes.
    // We derive them implicitly via the JWK by also passing x,y; without them, some
    // platforms reject. We'll fail gracefully if VAPID_PUBLIC_KEY is also provided.
    ext: true,
    use: "sig",
  } as JsonWebKey;
  // Some runtimes refuse JWK without x/y; we will populate them from VAPID_PUBLIC_KEY when present.
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function importVapidKeyPair(publicB64Url: string, privateB64Url: string): Promise<CryptoKey> {
  // Public key is 65 bytes uncompressed point starting with 0x04
  const pub = b64urlDecode(publicB64Url);
  if (pub.length !== 65 || pub[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY must be uncompressed P-256 point (65 bytes, starts 0x04)");
  }
  const x = pub.slice(1, 33);
  const y = pub.slice(33, 65);
  const priv = b64urlDecode(privateB64Url);
  if (priv.length !== 32) {
    throw new Error("VAPID_PRIVATE_KEY must be 32 bytes (P-256 private scalar)");
  }
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: b64urlEncode(priv),
    x: b64urlEncode(x),
    y: b64urlEncode(y),
    ext: true,
    use: "sig",
  };
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function signVapidJwt(audience: string, subject: string, publicKey: string, privateKey: string): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { aud: audience, exp: now + 12 * 60 * 60, sub: subject };
  const encH = b64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const encP = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signingInput = `${encH}.${encP}`;
  const key = await importVapidKeyPair(publicKey, privateKey);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${b64urlEncode(sig)}`;
}

async function listSubscriptions(kv: KVNamespace): Promise<PushSubscriptionRecord[]> {
  const idxRaw = await kv.get("push:subscription:index", "text");
  if (!idxRaw) return [];
  let hashes: string[] = [];
  try {
    const parsed = JSON.parse(idxRaw);
    if (Array.isArray(parsed)) hashes = parsed.filter((s) => typeof s === "string");
  } catch {
    return [];
  }
  const out: PushSubscriptionRecord[] = [];
  for (const h of hashes) {
    const raw = await kv.get(`push:subscription:${h}`, "text");
    if (!raw) continue;
    try {
      const rec = JSON.parse(raw) as PushSubscriptionRecord;
      if (rec.endpoint && rec.keys && rec.keys.p256dh && rec.keys.auth) {
        out.push(rec);
      }
    } catch {
      /* skip */
    }
  }
  return out;
}

async function removeSubscription(kv: KVNamespace, hash: string): Promise<void> {
  await kv.delete(`push:subscription:${hash}`);
  const idxRaw = await kv.get("push:subscription:index", "text");
  let hashes: string[] = [];
  if (idxRaw) {
    try {
      const parsed = JSON.parse(idxRaw);
      if (Array.isArray(parsed)) hashes = parsed.filter((s) => typeof s === "string");
    } catch {
      /* keep empty */
    }
  }
  const filtered = hashes.filter((h) => h !== hash);
  await kv.put("push:subscription:index", JSON.stringify(filtered));
}

async function sendPush(record: PushSubscriptionRecord, jwt: string, vapidPublic: string): Promise<{ status: number }> {
  const endpoint = record.endpoint;
  const aud = new URL(endpoint);
  const audience = `${aud.protocol}//${aud.host}`;
  // We send a payload-less push (no encrypted body). The Service Worker still
  // receives the push and falls back to fetching /api/review-items.
  const headers: Record<string, string> = {
    Authorization: `vapid t=${jwt},k=${vapidPublic}`,
    "Content-Length": "0",
    TTL: "60",
    Urgency: "normal",
  };
  // re-sign per-audience to be safe
  audience;
  const res = await fetch(endpoint, { method: "POST", headers });
  return { status: res.status };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SUMALABO_REVIEW_KV) {
    return json({ ok: false, message: "KV namespace SUMALABO_REVIEW_KV is not bound." }, 500);
  }
  if (!env.REVIEW_NOTIFY_SECRET) {
    return json({ ok: false, message: "REVIEW_NOTIFY_SECRET is not configured." }, 500);
  }
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    return json({ ok: false, message: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT のいずれかが未設定です。" }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: "Body must be JSON." }, 400);
  }
  const providedSecret = (request.headers.get("X-Notify-Secret") || request.headers.get("x-notify-secret") || (typeof body.secret === "string" ? body.secret : "") || "").trim();
  if (providedSecret !== env.REVIEW_NOTIFY_SECRET) {
    return json({ ok: false, message: "secretが一致しません。" }, 401);
  }

  const item = (body.item || {}) as Record<string, unknown>;
  const slug = typeof item.slug === "string" ? item.slug.trim() : "";
  const title = typeof item.title === "string" ? item.title : "確認待ち記事があります";
  const previewUrl = typeof item.previewUrl === "string" ? item.previewUrl : "/review/";
  const prUrl = typeof item.prUrl === "string" ? item.prUrl : "";

  // Optionally register in the review list if slug is provided
  if (slug) {
    const now = new Date().toISOString();
    // 既存レコードとマージする（vetoedAt 等、他経路で書かれたフィールドを消さない）
    let existing: Record<string, unknown> = {};
    try {
      const raw = await env.SUMALABO_REVIEW_KV.get(`review:item:${slug}`, "text");
      if (raw) existing = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      existing = {};
    }
    const record = {
      ...existing,
      slug,
      title,
      branch: typeof item.branch === "string" ? item.branch : undefined,
      previewUrl,
      prUrl,
      thumbnail: typeof item.thumbnail === "string" ? item.thumbnail : undefined,
      status: typeof item.status === "string" ? item.status : "review",
      sourceCheckPassed: typeof item.sourceCheckPassed === "boolean" ? item.sourceCheckPassed : undefined,
      createdAt: now,
      updatedAt: now,
      // L1 (Autonomy Ladder): veto 窓と監査情報
      previewReadyAt: typeof item.previewReadyAt === "string" ? item.previewReadyAt : undefined,
      vetoDeadline: typeof item.vetoDeadline === "string" ? item.vetoDeadline : undefined,
      autonomyLevel: typeof item.autonomyLevel === "number" ? item.autonomyLevel : undefined,
      trigger: typeof item.trigger === "string" ? item.trigger : undefined,
    };
    await env.SUMALABO_REVIEW_KV.put(`review:item:${slug}`, JSON.stringify(record));
    const idxRaw = await env.SUMALABO_REVIEW_KV.get("review:index", "text");
    let slugs: string[] = [];
    if (idxRaw) {
      try {
        const parsed = JSON.parse(idxRaw);
        if (Array.isArray(parsed)) slugs = parsed.filter((s) => typeof s === "string");
      } catch {
        /* keep empty */
      }
    }
    slugs = slugs.filter((s) => s !== slug);
    slugs.unshift(slug);
    if (slugs.length > 200) slugs.length = 200;
    await env.SUMALABO_REVIEW_KV.put("review:index", JSON.stringify(slugs));
  }

  const subscriptions = await listSubscriptions(env.SUMALABO_REVIEW_KV);
  if (subscriptions.length === 0) {
    return json({ ok: true, message: "通知購読者がいません。", sent: 0, item: slug || null });
  }

  // Sign one VAPID JWT per unique audience (push service host).
  const audiences = new Map<string, string>(); // audience -> jwt
  for (const sub of subscriptions) {
    try {
      const u = new URL(sub.endpoint);
      const audience = `${u.protocol}//${u.host}`;
      if (!audiences.has(audience)) {
        const jwt = await signVapidJwt(audience, env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
        audiences.set(audience, jwt);
      }
    } catch {
      /* ignore invalid endpoint */
    }
  }

  let sent = 0;
  let failed = 0;
  const failures: Array<{ endpoint: string; status: number }> = [];

  for (const sub of subscriptions) {
    try {
      const u = new URL(sub.endpoint);
      const audience = `${u.protocol}//${u.host}`;
      const jwt = audiences.get(audience);
      if (!jwt) {
        failed++;
        continue;
      }
      const res = await sendPush(sub, jwt, env.VAPID_PUBLIC_KEY);
      if (res.status >= 200 && res.status < 300) {
        sent++;
      } else if (res.status === 404 || res.status === 410) {
        // Gone — remove subscription
        if (sub.hash) await removeSubscription(env.SUMALABO_REVIEW_KV, sub.hash);
        failed++;
        failures.push({ endpoint: sub.endpoint, status: res.status });
      } else {
        failed++;
        failures.push({ endpoint: sub.endpoint, status: res.status });
      }
    } catch (err) {
      failed++;
      failures.push({ endpoint: sub.endpoint, status: 0 });
    }
  }

  return json({
    ok: true,
    sent,
    failed,
    subscribers: subscriptions.length,
    item: slug || null,
    title,
    previewUrl,
    prUrl,
    failuresSample: failures.slice(0, 5),
  });
};
