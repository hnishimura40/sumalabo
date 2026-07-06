export const siteConfig = {
  siteName: "すまラボ",
  siteDescription: "むずかしいスマホ・AI・ガジェットの話を、わかりやすく。",
  siteUrl: "https://sumalabo.com",
  // トップ・OGP未指定ページのデフォルトOGP画像（1200×630 PNG＝X card互換）。
  defaultOgpImage: "/images/ogp/home.png",
  authorName: "すまラボ編集部",
  // TODO: 本番公開前に問い合わせ先メールアドレスを設定する。
  contactEmail: "",
  // Google Search Console のHTMLタグ方式の所有権確認コード。
  // <meta name="google-site-verification" content="ここの値"> の content 部分だけを入れる。
  // 空のままならタグは出力されない。
  googleSiteVerification: "",
} as const;
