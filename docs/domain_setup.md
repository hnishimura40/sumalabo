# すまラボ 独自ドメイン本番設定メモ

## 本番URL

- 本番URL: `https://sumalabo.com`
- Cloudflare Pages 独自ドメイン接続済み
- SSL enabled
- `pages.dev` の仮URLは残るが、canonical / OGP / sitemap は `https://sumalabo.com` に寄せる

## 更新済み設定

- `src/config/site.ts`
  - `siteUrl: "https://sumalabo.com"`
  - `contactEmail` は未確定のため空欄を維持
  - `defaultOgpImage` は未作成のため空欄を維持
- `astro.config.mjs`
  - `site: "https://sumalabo.com"`
  - `@astrojs/sitemap` を導入
- `public/robots.txt`
  - `Sitemap: https://sumalabo.com/sitemap-index.xml`

## SEO / OGP の扱い

- canonical は `BaseLayout.astro` で `siteConfig.siteUrl` と各ページの path から絶対URLを生成する
- `og:url` も canonical と同じ絶対URLを使う
- 記事に `thumbnail` がある場合、`og:image` は `https://sumalabo.com/images/...` の絶対URLになる
- `thumbnail` がないページでは、未作成のデフォルトOGP画像を無理に指定しない

## 次工程

- Search Console に `https://sumalabo.com/` を登録する
- sitemap として `https://sumalabo.com/sitemap-index.xml` を送信する
- 公開後にトップ、記事一覧、主要記事、固定ページ、`/characters/` の表示を確認する
- Amazonアソシエイト申請前に、問い合わせ先メールと固定ページ導線を再確認する
