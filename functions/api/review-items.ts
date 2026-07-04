// Cloudflare Pages Function: GET / POST /api/review-items
//
// 役割:
//   GET: 確認待ち記事一覧を返す（review画面が読む）
//   POST: 自動処理側（Windowsタスク / Claude Code）から確認待ち記事を登録する
//
// ストレージ:
//   Cloudflare KV namespace `SUMALABO_REVIEW_KV` を使用
//   キー設計:
//     review:item:{slug}   → 個別の確認待ち記事
//     review:index         → JSON配列の slug 一覧（新しい順）
//
// セキュリティ:
//   POST は REVIEW_NOTIFY_SECRET ヘッダーまたはBodyのsecret一致を必須
//   GET は本番運用前に Cloudflare Access / パスコード等でガードする想定（docs参照）

interface ReviewItem {
  slug: string;
  title?: string;
  branch?: string;
  previewUrl?: string;
  prUrl?: string;
  thumbnail?: string;
  status?: string;
  sourceCheckPassed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  // L1 (Autonomy Ladder): veto 窓と監査情報
  previewReadyAt?: string;
  vetoDeadline?: string;
  vetoedAt?: string;
  autonomyLevel?: number;
  trigger?: string;
}

interface Env {
  SUMALABO_REVIEW_KV?: KVNamespace;
  REVIEW_NOTIFY_SECRET?: string;
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function getProvidedSecret(request: Request, body: Record<string, unknown>): string {
  return (
    request.headers.get("X-Notify-Secret") ||
    request.headers.get("x-notify-secret") ||
    (typeof body.secret === "string" ? body.secret : "") ||
    ""
  );
}

async function loadIndex(kv: KVNamespace): Promise<string[]> {
  const raw = await kv.get("review:index", "text");
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

async function saveIndex(kv: KVNamespace, slugs: string[]): Promise<void> {
  await kv.put("review:index", JSON.stringify(slugs));
}

async function loadItem(kv: KVNamespace, slug: string): Promise<ReviewItem | null> {
  const raw = await kv.get(`review:item:${slug}`, "text");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ReviewItem;
  } catch {
    return null;
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.SUMALABO_REVIEW_KV) {
    return json({ items: [], message: "KV namespace SUMALABO_REVIEW_KV is not bound." }, 200);
  }
  const slugs = await loadIndex(env.SUMALABO_REVIEW_KV);
  const items: ReviewItem[] = [];
  for (const slug of slugs) {
    const item = await loadItem(env.SUMALABO_REVIEW_KV, slug);
    if (item) items.push(item);
  }
  return json({ items });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.SUMALABO_REVIEW_KV) {
    return json({ ok: false, message: "KV namespace SUMALABO_REVIEW_KV is not bound." }, 500);
  }
  if (!env.REVIEW_NOTIFY_SECRET) {
    return json({ ok: false, message: "REVIEW_NOTIFY_SECRET is not configured." }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, message: "Body must be JSON." }, 400);
  }

  const providedSecret = getProvidedSecret(request, body);
  if (providedSecret !== env.REVIEW_NOTIFY_SECRET) {
    return json({ ok: false, message: "secretが一致しません。" }, 401);
  }

  const item = (body.item || body) as Record<string, unknown>;
  const slug = typeof item.slug === "string" ? item.slug.trim() : "";
  if (!slug) {
    return json({ ok: false, message: "slugが指定されていません。" }, 400);
  }
  const now = new Date().toISOString();
  const record: ReviewItem = {
    slug,
    title: typeof item.title === "string" ? item.title : undefined,
    branch: typeof item.branch === "string" ? item.branch : undefined,
    previewUrl: typeof item.previewUrl === "string" ? item.previewUrl : undefined,
    prUrl: typeof item.prUrl === "string" ? item.prUrl : undefined,
    thumbnail: typeof item.thumbnail === "string" ? item.thumbnail : undefined,
    status: typeof item.status === "string" ? item.status : "review",
    sourceCheckPassed: typeof item.sourceCheckPassed === "boolean" ? item.sourceCheckPassed : undefined,
    createdAt: typeof item.createdAt === "string" ? item.createdAt : now,
    updatedAt: now,
    previewReadyAt: typeof item.previewReadyAt === "string" ? item.previewReadyAt : undefined,
    vetoDeadline: typeof item.vetoDeadline === "string" ? item.vetoDeadline : undefined,
    vetoedAt: typeof item.vetoedAt === "string" ? item.vetoedAt : undefined,
    autonomyLevel: typeof item.autonomyLevel === "number" ? item.autonomyLevel : undefined,
    trigger: typeof item.trigger === "string" ? item.trigger : undefined,
  };

  await env.SUMALABO_REVIEW_KV.put(`review:item:${slug}`, JSON.stringify(record));
  const slugs = await loadIndex(env.SUMALABO_REVIEW_KV);
  const filtered = slugs.filter((s) => s !== slug);
  filtered.unshift(slug);
  // Cap to 200 items to avoid unbounded growth
  if (filtered.length > 200) filtered.length = 200;
  await saveIndex(env.SUMALABO_REVIEW_KV, filtered);

  return json({ ok: true, item: record });
};
