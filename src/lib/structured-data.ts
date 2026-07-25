// 構造化データ（JSON-LD）の組み立てを 1 か所に集約する。
// 2026-07-25 指名検索対策で追加。実測で検索結果のサイト名が「すまラボ」ではなく
// 「sumalabo.com」（ドメイン名フォールバック）になっていたため、Google の
// 「サイト名」仕様に沿って WebSite / Organization を明示的に宣言する。
// 参考: https://developers.google.com/search/docs/appearance/site-names
import { siteConfig } from "../config/site";

/** サイト内の相対パスを絶対 URL にする（構造化データは絶対 URL が必須）。 */
export function absoluteUrl(pathOrUrl: string): string {
  return new URL(pathOrUrl, siteConfig.siteUrl).toString();
}

/**
 * Organization の @id。WebSite.publisher / Article.publisher から同じ @id を
 * 参照させ、「同じ発行主体」であることをグラフとして示す（エンティティ認識の補強）。
 */
export const ORGANIZATION_ID = `${siteConfig.siteUrl}/#organization`;
export const WEBSITE_ID = `${siteConfig.siteUrl}/#website`;

/** 発行主体（すまラボ）。logo は Google が推奨する正方形に近いラスタ画像。 */
export function buildOrganizationSchema() {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: siteConfig.siteName,
    alternateName: [...siteConfig.alternateNames],
    url: siteConfig.siteUrl,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(siteConfig.logoPath),
    },
    sameAs: [...siteConfig.sameAs],
  };
}

/**
 * トップページに置く WebSite。検索結果のサイト名表示はこれが最優先シグナル。
 * alternateName は「優先度の高い順」に並べる（Google 仕様で複数指定可）。
 */
export function buildWebSiteSchema() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: siteConfig.siteName,
    alternateName: [...siteConfig.alternateNames],
    url: `${siteConfig.siteUrl}/`,
    description: siteConfig.siteDescription,
    publisher: { "@id": ORGANIZATION_ID },
    inLanguage: "ja",
  };
}

/** トップページ用。WebSite と Organization を 1 つの @graph にまとめて出力する。 */
export function buildHomeGraph() {
  return {
    "@context": "https://schema.org",
    "@graph": [buildWebSiteSchema(), buildOrganizationSchema()],
  };
}

export interface BreadcrumbItem {
  /** 表示名（パンくずに出る文字列） */
  name: string;
  /** サイト内パス（例: "/articles/"）。省略すると最終要素として URL なしで出力。 */
  path?: string;
}

/**
 * BreadcrumbList を組み立てる。先頭に必ず「ホーム」を入れる。
 * 最終要素（現在のページ）は item を省略するのが Google の推奨。
 */
export function buildBreadcrumbSchema(trail: BreadcrumbItem[]) {
  const items = [{ name: siteConfig.siteName, path: "/" }, ...trail];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      // 最終要素は現在地なので item を付けない（Google 推奨）
      ...(item.path && index < items.length - 1 ? { item: absoluteUrl(item.path) } : {}),
    })),
  };
}
