// Cloudflare Pages Function: POST /api/veto-preview
//
// 役割 (L1: Autonomy Ladder):
//   veto 窓内の「停止」操作。review item に vetoedAt / status="vetoed" を記録し、
//   auto-phase-b（veto 期限経過後の自動公開）の対象から外す。
//
// PR merge も deploy も行わない「自動公開を止める」だけの安全側アクション。
//
// veto 手段はもう 1 つある: data/automation/autonomy.json の paused: true
// （全体 kill switch。こちらは記事単位ではなく自動運転そのものを止める）。

interface Env {
  SUMALABO_REVIEW_KV?: KVNamespace;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SUMALABO_REVIEW_KV) {
    return json({ ok: false, message: "KV namespace SUMALABO_REVIEW_KV is not bound." }, 500);
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: "Body must be JSON." }, 400);
  }
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
    return json({ ok: false, message: "slugが指定されていないか不正です。" }, 400);
  }

  const key = `review:item:${slug}`;
  let item: Record<string, unknown> = {};
  const raw = await env.SUMALABO_REVIEW_KV.get(key, "text");
  if (raw) {
    try {
      item = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      item = {};
    }
  }
  const now = new Date().toISOString();
  const record = {
    ...item,
    slug,
    status: "vetoed",
    vetoedAt: now,
    updatedAt: now,
  };
  await env.SUMALABO_REVIEW_KV.put(key, JSON.stringify(record));

  return json({
    ok: true,
    slug,
    vetoedAt: now,
    message: "このプレビューの自動公開を停止しました（veto）。",
  });
};
