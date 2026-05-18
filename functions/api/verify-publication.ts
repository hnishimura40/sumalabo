// Cloudflare Pages Function: GET /api/verify-publication?slug={slug}
//
// 役割:
//   承認ボタン → /api/approve-preview で PR merge + Deploy Hook 発火後、
//   フロント側がこの endpoint を polling して本番反映を厳格に検証する。
//   HTTP 200 だけでなく、title / slug / body / thumbnail / fallback判定 /
//   /articles/ index 掲載までを 1 リクエストで点検する。
//
//   verify 成功時のみ KV review item を status: "published" に更新する。
//   ここで初めて「公開完了」と判定する (HTTP 200 だけでは success にしない)。
//
// 必要な環境変数 / binding:
//   - SUMALABO_REVIEW_KV (KVNamespace, 任意) — published 更新先
//   - PRODUCTION_HOST (任意, default "sumalabo.com")
//
// セキュリティ:
//   - GET 専用 (副作用は KV の published 更新のみ、idempotent)
//   - secret / token は読まない
//   - エラー詳細にも URL 内部情報を含めない

interface Env {
  SUMALABO_REVIEW_KV?: KVNamespace;
  PRODUCTION_HOST?: string;
  // wrangler fallback が必要と判定するまでの待機時間 (ms)。
  // default は 6 分。Cloudflare Pages の通常ビルドは 1〜3 分なので余裕を持たせる。
  DEPLOY_PENDING_TIMEOUT_MS?: string;
}

// wrangler fallback を案内する CLI コマンド hint。
// secret や Deploy Hook URL を含まないことを保証。
const FALLBACK_COMMAND_HINT =
  "node scripts/automation/deploy-production-from-main.mjs --slug=<slug>";

function parsePendingTimeoutMs(raw: string | undefined): number {
  const fallback = 6 * 60 * 1000; // 6 minutes
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  // 安全のため [60s, 30min] にクランプ
  return Math.min(Math.max(n, 60_000), 30 * 60_000);
}

interface ReviewItemRecord {
  slug: string;
  title?: string;
  branch?: string;
  previewUrl?: string;
  prUrl?: string;
  thumbnail?: string;
  status?: string;
  approvedAt?: string;
  approvedByMergeCommit?: string;
  deployTriggeredAt?: string;
  deployTriggered?: boolean;
  publishedAt?: string;
  productionUrl?: string;
  productionDeployId?: string;
  productionCommit?: string;
  publicationVerifyError?: string;
  updatedAt?: string;
  // wrangler fallback フラグ。verify が時間内に成功しない場合に true 化される。
  // secret / Deploy Hook URL は含まない。
  needsWranglerFallback?: boolean;
  fallbackCommandHint?: string;
}

interface VerifyCheck {
  httpStatus: { ok: boolean; actual: number };
  titleNotGeneric: { ok: boolean; titleSample?: string };
  slugInHtml: { ok: boolean };
  notHomepageFallback: { ok: boolean };
  hasArticleBody: { ok: boolean };
  hasThumbnailRef: { ok: boolean };
  noProhibitedCopy: { ok: boolean; matches?: number };
  indexListsArticle: { ok: boolean };
}

interface VerifyResult {
  ok: boolean;
  status: "published" | "deploying" | "failed" | "approved_deploy_pending";
  slug: string;
  productionUrl: string;
  checks: VerifyCheck;
  failedChecks: string[];
  kvUpdate?: { updated: boolean; reason?: string };
  // wrangler fallback が必要かをフロントに通知する。
  // - deploy hook が発火していない (deployTriggered=false) のに verify も失敗
  // - もしくは deployTriggeredAt から DEPLOY_PENDING_TIMEOUT_MS 経過しても
  //   依然 verify が失敗 (Cloudflare Git 連携が壊れているケース)
  needsWranglerFallback?: boolean;
  // fallback を実行するための CLI コマンドの hint (secret は含まない)。
  // 例: "npm run deploy:production:fallback -- --slug=<slug>"
  fallbackCommandHint?: string;
  // verify endpoint 自身が再 polling 用にいつ deploy 開始されたかを返す
  deployTriggeredAt?: string;
  publicationVerifyError?: string;
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      // cache を避ける (verify は常に最新を見る)
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

async function fetchWithCacheBust(url: string): Promise<Response> {
  // CF edge cache を確実に通り抜けるための bust + bypass
  // `cf` は Cloudflare Workers の拡張プロパティ。TS の RequestInit には載っていないので
  // RequestInit & { cf?: ... } としてキャストする。
  type CfFetchInit = RequestInit & { cf?: { cacheTtl?: number; cacheEverything?: boolean } };
  const init: CfFetchInit = {
    method: "GET",
    cf: { cacheTtl: 0, cacheEverything: false },
    headers: {
      "Cache-Control": "no-cache, no-store",
      Pragma: "no-cache",
    },
  };
  return fetch(url, init);
}

async function updateKvToPublished(
  kv: KVNamespace,
  slug: string,
  productionUrl: string,
): Promise<{ updated: boolean; reason?: string }> {
  try {
    const raw = await kv.get(`review:item:${slug}`, "text");
    if (!raw) return { updated: false, reason: "review_item_not_found" };
    let item: ReviewItemRecord;
    try {
      item = JSON.parse(raw) as ReviewItemRecord;
    } catch {
      return { updated: false, reason: "review_item_unparseable" };
    }
    const now = new Date().toISOString();
    const updated: ReviewItemRecord = {
      ...item,
      status: "published",
      publishedAt: now,
      productionUrl,
      publicationVerifyError: undefined,
      updatedAt: now,
    };
    await kv.put(`review:item:${slug}`, JSON.stringify(updated));
    return { updated: true };
  } catch (err) {
    return {
      updated: false,
      reason: "kv_update_threw",
    };
  }
}

async function markKvVerifyFailed(
  kv: KVNamespace,
  slug: string,
  reason: string,
  options: { markNeedsFallback?: boolean; setStatus?: string } = {},
): Promise<void> {
  try {
    const raw = await kv.get(`review:item:${slug}`, "text");
    if (!raw) return;
    let item: ReviewItemRecord;
    try {
      item = JSON.parse(raw) as ReviewItemRecord;
    } catch {
      return;
    }
    // published には進めない。reason だけ記録。
    const now = new Date().toISOString();
    const updated: ReviewItemRecord = {
      ...item,
      // status はそのまま (approved / approved_but_deploy_failed) を維持。
      // verify が一時的に false だっただけでも status を巻き戻さない。
      // ただし fallback 必要を確認した場合だけ "approved_deploy_pending" に上書き。
      status: options.setStatus || item.status,
      publicationVerifyError: reason.slice(0, 200),
      needsWranglerFallback: options.markNeedsFallback ? true : item.needsWranglerFallback,
      fallbackCommandHint: options.markNeedsFallback ? FALLBACK_COMMAND_HINT : item.fallbackCommandHint,
      updatedAt: now,
    };
    await kv.put(`review:item:${slug}`, JSON.stringify(updated));
  } catch {
    // best-effort
  }
}

// KV から deployTriggeredAt / deployTriggered を読み出す (verify endpoint 専用)。
// 値が読めなくても致命ではなく undefined を返す。
async function readDeployStateFromKv(
  kv: KVNamespace,
  slug: string,
): Promise<{ deployTriggeredAt?: string; deployTriggered?: boolean; existingStatus?: string }> {
  try {
    const raw = await kv.get(`review:item:${slug}`, "text");
    if (!raw) return {};
    const item = JSON.parse(raw) as ReviewItemRecord;
    return {
      deployTriggeredAt: item.deployTriggeredAt,
      deployTriggered: item.deployTriggered,
      existingStatus: item.status,
    };
  } catch {
    return {};
  }
}

// HTML inspection helpers
function extractTitle(html: string): string | null {
  const m = html.match(/<title>([^<]*)<\/title>/);
  return m ? m[1].trim() : null;
}

function isGenericHomepageTitle(title: string | null): boolean {
  if (!title) return true;
  // 「すまラボ」だけ / 「記事一覧 | すまラボ」など、article title が含まれない
  // generic titles はすべて fallback とみなす。
  const trimmed = title.trim();
  return (
    trimmed === "すまラボ" ||
    trimmed === "sumalabo" ||
    /^(すまラボ|sumalabo)\s*$/i.test(trimmed)
  );
}

function looksLikeHomepageFallback(html: string, slug: string): boolean {
  // 記事ページなら必ず article-shell / article-content / og:type=article のいずれかが出る
  const hasArticleShell = /class="article-shell\b/i.test(html);
  const hasOgArticle = /property="og:type"\s+content="article"/i.test(html);
  const hasArticleSlugInCanonical = new RegExp(
    `rel="canonical"\\s+href="[^"]*\\/articles\\/${slug.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\/`,
    "i",
  ).test(html);
  return !(hasArticleShell || hasOgArticle || hasArticleSlugInCanonical);
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, message: "GETで送ってください。" }, 405);
  }

  const url = new URL(request.url);
  const slug = (url.searchParams.get("slug") || "").trim();
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) {
    return jsonResponse({ ok: false, message: "有効な slug を ?slug= で指定してください。" }, 400);
  }

  const productionHost = (env.PRODUCTION_HOST || "sumalabo.com").trim();
  const productionUrl = `https://${productionHost}/articles/${slug}/`;
  const indexUrl = `https://${productionHost}/articles/`;

  // 1. 記事 URL を fetch (cache bust)
  let articleRes: Response;
  try {
    articleRes = await fetchWithCacheBust(productionUrl);
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        status: "failed" as const,
        slug,
        productionUrl,
        message: "記事URLへ接続できませんでした。",
      },
      502,
    );
  }

  const html = articleRes.ok ? await articleRes.text() : "";

  // 2. /articles/ index も同時にチェック
  let indexHtml = "";
  try {
    const r = await fetchWithCacheBust(indexUrl);
    if (r.ok) indexHtml = await r.text();
  } catch {
    // index が取れなくても致命ではない
  }

  // 3. 厳格チェック
  const title = extractTitle(html);
  const checks: VerifyCheck = {
    httpStatus: { ok: articleRes.status === 200, actual: articleRes.status },
    titleNotGeneric: {
      ok: !isGenericHomepageTitle(title),
      titleSample: title ? title.slice(0, 80) : undefined,
    },
    slugInHtml: { ok: html.includes(slug) },
    notHomepageFallback: { ok: !looksLikeHomepageFallback(html, slug) },
    hasArticleBody: { ok: /class="article-content\b/i.test(html) || /class="article-shell\b/i.test(html) },
    hasThumbnailRef: {
      ok: new RegExp(`/images/thumbnails/${slug.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\.png`).test(html),
    },
    noProhibitedCopy: (() => {
      const matches = (html.match(/普通の人/g) || []).length;
      return { ok: matches === 0, matches };
    })(),
    indexListsArticle: {
      ok: indexHtml.length > 0 && indexHtml.includes(`href="/articles/${slug}/"`),
    },
  };

  // 4. 失敗 check 集計
  const failedChecks: string[] = [];
  if (!checks.httpStatus.ok) failedChecks.push("httpStatus");
  if (!checks.titleNotGeneric.ok) failedChecks.push("titleNotGeneric");
  if (!checks.slugInHtml.ok) failedChecks.push("slugInHtml");
  if (!checks.notHomepageFallback.ok) failedChecks.push("notHomepageFallback");
  if (!checks.hasArticleBody.ok) failedChecks.push("hasArticleBody");
  if (!checks.hasThumbnailRef.ok) failedChecks.push("hasThumbnailRef");
  if (!checks.noProhibitedCopy.ok) failedChecks.push("noProhibitedCopy");
  if (!checks.indexListsArticle.ok) failedChecks.push("indexListsArticle");

  const allPass = failedChecks.length === 0;

  // 5. KV から deploy 状態 (deployTriggeredAt) を読む。
  //    wrangler fallback が必要かを deployTriggeredAt 経過時間 + verify 失敗
  //    で判定する。
  const deployState = env.SUMALABO_REVIEW_KV
    ? await readDeployStateFromKv(env.SUMALABO_REVIEW_KV, slug)
    : {};

  const pendingTimeoutMs = parsePendingTimeoutMs(env.DEPLOY_PENDING_TIMEOUT_MS);
  const nowMs = Date.now();
  let deployTriggeredAtMs: number | null = null;
  if (deployState.deployTriggeredAt) {
    const parsed = Date.parse(deployState.deployTriggeredAt);
    if (Number.isFinite(parsed)) deployTriggeredAtMs = parsed;
  }
  const pendingElapsedMs = deployTriggeredAtMs !== null ? nowMs - deployTriggeredAtMs : null;
  const pendingExceeded = pendingElapsedMs !== null && pendingElapsedMs > pendingTimeoutMs;

  // 6. 公開判定
  // - 全 check が pass                                  → published
  // - deploy hook が発火していない & verify 未成功      → approved_deploy_pending (wrangler fallback 必要)
  // - deployTriggeredAt から timeout 超過 & verify 未成功 → approved_deploy_pending (wrangler fallback 必要)
  // - 一部 fail (HTTP 200 だが fallback / title generic 等) → deploying (まだ反映中)
  // - HTTP 200 すら取れない                            → failed
  const deployNotTriggered = deployState.deployTriggered === false;
  let status: VerifyResult["status"];
  let needsWranglerFallback = false;
  if (allPass) {
    status = "published";
  } else if (deployNotTriggered) {
    // approve-preview が deploy hook を発火できなかったので、wrangler 必須。
    status = "approved_deploy_pending";
    needsWranglerFallback = true;
  } else if (pendingExceeded) {
    // deploy hook は発火したが timeout を超えて verify 未成功。
    // Cloudflare Git 連携不調が疑われるので wrangler fallback を促す。
    status = "approved_deploy_pending";
    needsWranglerFallback = true;
  } else if (checks.httpStatus.ok) {
    // 200 は返ったが内容が記事ではない → fallback 配信中。deploy 完了待ち。
    status = "deploying";
  } else {
    status = "failed";
  }

  // 7. KV 更新
  let kvUpdate: { updated: boolean; reason?: string } | undefined;
  if (env.SUMALABO_REVIEW_KV) {
    if (allPass) {
      kvUpdate = await updateKvToPublished(env.SUMALABO_REVIEW_KV, slug, productionUrl);
    } else if (status === "approved_deploy_pending") {
      const reason = deployNotTriggered
        ? "deploy_hook_not_triggered"
        : "deploy_hook_failed_or_not_reflected";
      await markKvVerifyFailed(env.SUMALABO_REVIEW_KV, slug, reason, {
        markNeedsFallback: true,
        setStatus: "approved_deploy_pending",
      });
      kvUpdate = { updated: false, reason };
    } else if (status === "deploying") {
      // deploy 中は KV を変えない (published に進めない)
      kvUpdate = { updated: false, reason: "still_deploying" };
    } else {
      // failed: reason を KV に記録
      await markKvVerifyFailed(env.SUMALABO_REVIEW_KV, slug, `verify_failed:${failedChecks.join(",")}`);
      kvUpdate = { updated: false, reason: "verify_failed" };
    }
  }

  const result: VerifyResult = {
    ok: allPass,
    status,
    slug,
    productionUrl,
    checks,
    failedChecks,
    kvUpdate,
    needsWranglerFallback: needsWranglerFallback || undefined,
    fallbackCommandHint: needsWranglerFallback ? FALLBACK_COMMAND_HINT : undefined,
    deployTriggeredAt: deployState.deployTriggeredAt,
    publicationVerifyError: needsWranglerFallback
      ? (deployNotTriggered ? "deploy_hook_not_triggered" : "deploy_hook_failed_or_not_reflected")
      : undefined,
  };

  // HTTP status:
  //   published                  → 200
  //   deploying                  → 202 (Accepted, retry)
  //   approved_deploy_pending    → 202 (Accepted, fallback required)
  //   failed                     → 500
  let httpStatus: number;
  if (allPass) httpStatus = 200;
  else if (status === "deploying" || status === "approved_deploy_pending") httpStatus = 202;
  else httpStatus = 500;

  return jsonResponse(result, httpStatus);
};
