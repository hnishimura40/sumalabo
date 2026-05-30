// preview-url-policy.mjs
//
// Phase A 出口で使う previewUrl の共通バリデーション。
//
// 目的:
//   review item の「メイン previewUrl」にローカル/到達不能なURLが入るのを防ぐ。
//   2026-05-30 の事故: review item の previewUrl が http://127.0.0.1:4321/... に
//   なっており、PWA/スマホから記事を確認できなかった。これを仕組みで防ぐ。
//
// ルール:
//   - 127.0.0.1 / localhost / 0.0.0.0 / [::1] / file:// / chrome:// を含む URL は
//     「メイン previewUrl」として不可。
//   - http:// は不可（https のみ。Cloudflare Pages Preview は https）。
//   - https の Cloudflare Pages（*.pages.dev）または本番ドメインのみ許可。
//
// これらは通知前ガードとして notify / finalize から呼ばれる。

const LOCAL_PATTERNS = [
  /^https?:\/\/127\.0\.0\.1(?::\d+)?(\/|$)/i,
  /^https?:\/\/localhost(?::\d+)?(\/|$)/i,
  /^https?:\/\/0\.0\.0\.0(?::\d+)?(\/|$)/i,
  /^https?:\/\/\[::1\](?::\d+)?(\/|$)/i,
  /^file:\/\//i,
  /^chrome:\/\//i,
];

/**
 * previewUrl が「PWA/スマホから開けるメイン確認URL」として妥当か判定する。
 * @param {string} url
 * @returns {{ ok: boolean, reason?: string, isLocal?: boolean }}
 */
export function validateMainPreviewUrl(url) {
  if (!url || typeof url !== "string") {
    return { ok: false, reason: "missing_url" };
  }
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, reason: "missing_url" };

  for (const re of LOCAL_PATTERNS) {
    if (re.test(trimmed)) {
      return { ok: false, reason: "local_preview_url_rejected", isLocal: true };
    }
  }

  if (/^http:\/\//i.test(trimmed)) {
    // http (非https) はローカルでなくても不可（CF Preview は https）。
    return { ok: false, reason: "non_https_preview_url_rejected" };
  }

  if (!/^https:\/\//i.test(trimmed)) {
    return { ok: false, reason: "not_https_url" };
  }

  // https の Cloudflare Pages Preview / 本番ドメインを許可。
  const isPagesDev = /^https:\/\/[a-z0-9-]+\.([a-z0-9-]+\.)?pages\.dev\//i.test(trimmed) || /\.pages\.dev\//i.test(trimmed);
  const isProdDomain = /^https:\/\/(www\.)?sumalabo\.com\//i.test(trimmed);
  if (!isPagesDev && !isProdDomain) {
    return { ok: false, reason: "unexpected_preview_host" };
  }

  return { ok: true };
}

/**
 * ローカルURLかどうかだけを判定する軽量ヘルパー。
 */
export function isLocalPreviewUrl(url) {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  return LOCAL_PATTERNS.some((re) => re.test(trimmed));
}
