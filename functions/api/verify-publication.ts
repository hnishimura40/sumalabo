// Cloudflare Pages Function: GET /api/verify-publication?slug={slug}
//
// 役割:
//   PR merge後の本番反映はwrangler(Direct Upload)が正規手順
//   (P1で一本化。Git連携auto-deploy /
//   Deploy Hook は GitHub App の clone 失敗が常態化していたため廃止)。
//   フロント側・CLI 側はこの endpoint を polling して本番反映を厳格に検証する。
//   HTTP 200 だけでなく、title / slug / body / thumbnail / homepage誤配信判定 /
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
}

// 本番反映コマンドの案内 (secret や URL を含まないテンプレ文字列)。
const PRODUCTION_DEPLOY_COMMAND_HINT =
  "npm run deploy:production -- --slug=<slug>";

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
  publishedAt?: string;
  productionUrl?: string;
  productionDeployId?: string;
  productionCommit?: string;
  publicationVerifyError?: string;
  productionDeployCommandHint?: string;
  updatedAt?: string;
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
  // published                 → 全 check pass
  // awaiting_production_deploy → 200 は返るが本番未反映 (wrangler 正規 deploy 待ち /
  //                              deploy 直後の CDN 反映待ち)。polling 継続。
  // failed                    → 記事 URL に到達できない等
  status: "published" | "awaiting_production_deploy" | "failed";
  slug: string;
  productionUrl: string;
  checks: VerifyCheck;
  failedChecks: string[];
  kvUpdate?: { updated: boolean; reason?: string };
  // 未公開時に本番反映コマンドを案内する (secret は含まない)。
  productionDeployCommandHint?: string;
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
    // published には進めない。reason だけ記録し、status は巻き戻さない。
    const now = new Date().toISOString();
    const updated: ReviewItemRecord = {
      ...item,
      publicationVerifyError: reason.slice(0, 200),
      updatedAt: now,
    };
    await kv.put(`review:item:${slug}`, JSON.stringify(updated));
  } catch {
    // best-effort
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
  // generic titles はすべて homepage 誤配信とみなす。
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
      // サムネ拡張子は WebP 移行後も既存 PNG / JPEG / AVIF を許容する。
      // mdx の frontmatter で `thumbnail: "/images/thumbnails/{slug}.<ext>"` を
      // 使うかぎり、HTML に <link rel="preload"> / og:image / <img src> として
      // 出力されるため、拡張子だけ拡張すれば既存 PNG 記事も壊さない。
      ok: new RegExp(`/images/thumbnails/${slug.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\.(png|webp|jpe?g|avif)`, "i").test(html),
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

  // 5. 公開判定 (P1: wrangler 正規手順前提のシンプルな 3 状態)
  // - 全 check が pass                       → published
  // - HTTP 200 だが本番に記事が未反映        → awaiting_production_deploy (polling 継続)
  // - HTTP 200 すら取れない                  → failed
  let status: VerifyResult["status"];
  if (allPass) {
    status = "published";
  } else if (checks.httpStatus.ok) {
    status = "awaiting_production_deploy";
  } else {
    status = "failed";
  }

  // 6. KV 更新
  let kvUpdate: { updated: boolean; reason?: string } | undefined;
  if (env.SUMALABO_REVIEW_KV) {
    if (allPass) {
      kvUpdate = await updateKvToPublished(env.SUMALABO_REVIEW_KV, slug, productionUrl);
    } else if (status === "awaiting_production_deploy") {
      // 本番反映前の通常状態。KV は変えない (published に進めない)。
      kvUpdate = { updated: false, reason: "awaiting_production_deploy" };
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
    productionDeployCommandHint: allPass ? undefined : PRODUCTION_DEPLOY_COMMAND_HINT,
  };

  // HTTP status:
  //   published                  → 200
  //   awaiting_production_deploy → 202 (Accepted, retry)
  //   failed                     → 500
  let httpStatus: number;
  if (allPass) httpStatus = 200;
  else if (status === "awaiting_production_deploy") httpStatus = 202;
  else httpStatus = 500;

  return jsonResponse(result, httpStatus);
};
