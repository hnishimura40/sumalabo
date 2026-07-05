export const siteConfig = {
  siteName: "すまラボ",
  siteDescription: "むずかしいスマホ・AI・ガジェットの話を、わかりやすく。",
  siteUrl: "https://sumalabo.com",
  // TODO: デフォルトOGP画像を作成したら /images/ogp/default.webp などを設定する。
  defaultOgpImage: "",
  authorName: "すまラボ編集部",
  // TODO: 本番公開前に問い合わせ先メールアドレスを設定する。
  contactEmail: "",
  // Google Search Console のHTMLタグ方式の所有権確認コード。
  // <meta name="google-site-verification" content="ここの値"> の content 部分だけを入れる。
  // 空のままならタグは出力されない。
  googleSiteVerification: "",
} as const;
