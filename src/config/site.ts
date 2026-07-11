export const siteConfig = {
  siteName: "すまラボ",
  siteDescription: "むずかしいスマホ・AI・ガジェットの話を、わかりやすく。",
  siteUrl: "https://sumalabo.com",
  // トップ・OGP未指定ページのデフォルトOGP画像（1200×630 PNG＝X card互換）。
  defaultOgpImage: "/images/ogp/home.png",
  authorName: "すまラボ編集部",
  // 問い合わせ先（ASP審査要件・2026-07-11 設定）。/contact/ に表示される。
  contactEmail: "nishimura.media.lab@gmail.com",
  // Google Search Console のHTMLタグ方式の所有権確認コード。
  // <meta name="google-site-verification" content="ここの値"> の content 部分だけを入れる。
  // 空のままならタグは出力されない。
  googleSiteVerification: "",
  // GA4 測定ID（2026-07-11 導入）。全ページ共通の GoogleAnalytics コンポーネント
  // （BaseLayout の </head> 直前）から出力される。空ならタグは出力されない。
  // 環境変数 PUBLIC_GA_MEASUREMENT_ID があればそちらが優先（上書き用）。
  // 測定IDは公開HTMLに出る値であり secret ではない。
  gaMeasurementId: "G-92PX89HSQE",
} as const;
