import { siteConfig } from "../config/site";

/**
 * 記事に Google 限定の noindex（<meta name="googlebot" content="noindex">）を付けるか。
 * - siteConfig.googlebotNoindexNews が false なら常に付けない（全体オフ）
 * - カテゴリが siteConfig.googlebotNoindexCategory の記事だけが対象
 * - frontmatter の allowGoogleIndex: true は例外として付けない
 * robots 全体の noindex や X-Robots-Tag は使わない（Bing などには今までどおり見せる）。
 */
export function isGooglebotNoindexArticle(article: { category: string; allowGoogleIndex?: boolean }): boolean {
  if (!siteConfig.googlebotNoindexNews) return false;
  if (article.allowGoogleIndex) return false;
  return article.category === siteConfig.googlebotNoindexCategory;
}
