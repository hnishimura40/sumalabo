# drafts/unpublished — 未公開のまま残っている記事下書き

`content/articles/` に置いたままだとビルド対象外でも URL が知られてしまうため、
**ビルドに入らない下書きはここに退避する**（2026-07-25 設置）。

## 経緯

Search Console の実測で、ここに置かれた 3 本の slug が
「代替ページ（適切な canonical タグあり）」として未登録に積み上がっていた。
`content/articles/` にあるがビルド対象外だったため、その URL が
soft 404（トップの HTML を 200 で返す）になっていたのが原因。
soft 404 自体は `src/pages/404.astro` の追加で解消済み。

## ルール

- ここのファイルは **content collection の対象外**（`src/content.config.ts` の
  base は `./content/articles` のみ）。ビルドにも sitemap にも入らない。
- **消さない。** ネタとして再利用する可能性があるため保管する。
- 再公開するときは `content/articles/` に戻し、**禁則語を必ず直してから**
  `npm run sumalabo:gate` を通す。

## 現在置いてあるもの（いずれも 2026-05 の未公開下書き）

| slug | 内容 | 再公開時の要修正点 |
|---|---|---|
| `202605-airpods-dual-camera-siri-visual-information` | AirPods に両耳カメラ搭載の噂。Siri に視覚情報を渡すセンサー的な仕組み | タイトル・本文の禁則語「普通の人向け」 |
| `202605-github-copilot-shifts-to-token-based-pricing-june-1` | GitHub Copilot が 2026-06-01 から AI Credits（トークン課金）方式へ | 日付が経過済み。事実の再確認が必要 |
| `202605-iphone-18-pro-dynamic-island-top-left-rumor` | iPhone 18 Pro の Dynamic Island 変更の噂 | タイトル・本文の禁則語「普通の人向け」 |
