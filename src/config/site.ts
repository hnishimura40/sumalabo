export const siteConfig = {
  siteName: "すまラボ",
  siteDescription: "むずかしいスマホ・AI・ガジェットの話を、わかりやすく。",
  siteUrl: "https://sumalabo.com",
  // 検索結果のサイト名表示に使う別名（Google「サイト名」仕様・2026-07-25 指名検索対策）。
  // トップの WebSite 構造化データの alternateName に、この順（優先度が高い順）で出力する。
  // 背景: 実測で検索結果のサイト名が「すまラボ」ではなく「sumalabo.com」（ドメイン名
  // フォールバック）になっていた。「すまラボ」は不動産系の同名企業が多く、表記ゆれを
  // 明示的に宣言してブランド名として認識される確度を上げる。
  // 参考: https://developers.google.com/search/docs/appearance/site-names
  alternateNames: ["sumalabo", "すまらぼ", "スマラボ"],
  // Organization の logo（構造化データ用）。正方形に近いブランドアイコン。
  logoPath: "/images/brand/sumalab-brand-icon.png",
  // Organization.sameAs（同一主体を示す外部プロフィール）。エンティティ認識の補強。
  sameAs: ["https://x.com/suma_labo"],
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
