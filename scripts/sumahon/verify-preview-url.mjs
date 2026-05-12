// Preview URL 健全性チェック。
//
// 背景 (2026-05-12):
//   このリポジトリの Cloudflare Pages 構成は GitHub Apps 連携 (branch preview +
//   commit status push) を使っておらず、`scheduled-deploy.yml` の deploy hook
//   から main 反映のみ運用している。そのため `auto/imported-…` ブランチ単位の
//   preview URL は存在せず、`https://sumalabo.com/articles/{slug}/` に
//   GET したときに、その slug がまだ main に乗っていなくても Astro の SPA
//   fallback が `HTTP 200 + <title>すまラボ</title>` を返してしまう。
//
//   結果、PWA Push 通知は届くが、購読者が記事を開いても 404 ではなく
//   「すまラボ」だけの空ページを見ることになり、承認運用が成立しない事故が
//   PR #40 で発生した。
//
// 役割:
//   `notifyReviewReady` を呼ぶ前に、与えられた previewUrl が
//   「本当にその slug の記事ページを返しているか」を確認する。OK でなければ
//   ok=false と reason を返し、import 側で notify をスキップしてエントリを
//   preview_unavailable に降格させる。
//
// 検証条件 (どれか1つでも欠ければ NG):
//   1. HTTP ステータスが 200 系
//   2. レスポンスボディ HTML が空でない
//   3. `<title>` 要素が「すまラボ」だけではない（fallback ではない）
//      - 具体的には記事固有のタイトル冒頭 (titlePrefix) を含むか、
//        slug を含むか、`## 参考情報` 相当の本文要素を含むこと
//   4. HTML 中に slug 文字列が含まれること
//
// 戻り値:
//   { ok, status, reason, evidence: { titleSeen, includesSlug, includesReferenceSection,
//     bodyLen, titleLooksFallback }, url }
//
// 注意:
//   - ネットワーク失敗時は ok:false / reason:"fetch_failed"
//   - タイムアウト既定 10 秒
//   - 本ヘルパーは副作用なし。例外を投げず、すべて戻り値で表現する。

const DEFAULT_TIMEOUT_MS = 10000;
const FALLBACK_TITLE_PATTERNS = [
  /^すまラボ\s*$/,
  /^すまラボ\s*[-|｜]\s*$/,
  /^Sumalabo\s*$/i,
];

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m) return "";
  return m[1].replace(/\s+/g, " ").trim();
}

function looksLikeFallbackTitle(title) {
  if (!title) return true;
  return FALLBACK_TITLE_PATTERNS.some((re) => re.test(title));
}

/**
 * @param {object} args
 * @param {string} args.url - 検証対象 URL (https:// で始まる絶対 URL)
 * @param {string} args.slug - 期待する slug 文字列
 * @param {string} [args.titlePrefix] - 期待する title 冒頭 (frontmatter title の先頭 12 文字程度を推奨)
 * @param {number} [args.timeoutMs]
 * @returns {Promise<{ ok: boolean, status: number, reason?: string, evidence: object, url: string }>}
 */
export async function verifyPreviewUrl({ url, slug, titlePrefix = "", timeoutMs } = {}) {
  if (!url || typeof url !== "string") {
    return { ok: false, status: 0, reason: "missing_url", evidence: {}, url: url || "" };
  }
  if (!slug || typeof slug !== "string") {
    return { ok: false, status: 0, reason: "missing_slug", evidence: {}, url };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TIMEOUT_MS);

  let res;
  let body = "";
  try {
    res = await fetch(url, { method: "GET", redirect: "follow", signal: controller.signal });
    body = await res.text();
  } catch (e) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      reason: "fetch_failed",
      evidence: { error: String(e && e.message ? e.message : e) },
      url,
    };
  } finally {
    clearTimeout(timer);
  }

  const status = res.status;
  if (status < 200 || status >= 300) {
    return {
      ok: false,
      status,
      reason: `http_${status}`,
      evidence: { bodyLen: body.length },
      url,
    };
  }

  const titleSeen = extractTitle(body);
  const titleLooksFallback = looksLikeFallbackTitle(titleSeen);
  const includesSlug = body.includes(slug);
  const includesReferenceSection = /(<h2[^>]*>\s*参考情報\s*<\/h2>|##\s*参考情報)/.test(body);
  const includesTitlePrefix = titlePrefix && titlePrefix.length > 0 ? titleSeen.includes(titlePrefix) : false;
  const bodyLen = body.length;

  const evidence = {
    bodyLen,
    titleSeen,
    titleLooksFallback,
    includesSlug,
    includesTitlePrefix,
    includesReferenceSection,
    titlePrefix,
  };

  // 条件:
  //   - bodyLen が極端に小さい (< 1000) なら NG
  //   - titleSeen が fallback の「すまラボ」だけなら NG
  //   - slug が body に含まれないなら NG
  //   - titlePrefix を指定していてそれが title に含まれない場合、
  //     代わりに body 内に titlePrefix が現れるか、参考情報セクションが
  //     見えていれば許容する。それも無ければ NG。
  if (bodyLen < 1000) {
    return { ok: false, status, reason: "body_too_short", evidence, url };
  }
  if (titleLooksFallback) {
    return { ok: false, status, reason: "title_is_fallback", evidence, url };
  }
  if (!includesSlug) {
    return { ok: false, status, reason: "slug_not_in_body", evidence, url };
  }
  if (titlePrefix && !includesTitlePrefix) {
    const bodyHasPrefix = body.includes(titlePrefix);
    if (!bodyHasPrefix && !includesReferenceSection) {
      return { ok: false, status, reason: "title_prefix_not_found_and_no_reference_section", evidence, url };
    }
  }
  if (!includesReferenceSection && !includesTitlePrefix && !(titlePrefix && body.includes(titlePrefix))) {
    return { ok: false, status, reason: "no_reference_section_and_no_title_match", evidence, url };
  }

  return { ok: true, status, evidence, url };
}
