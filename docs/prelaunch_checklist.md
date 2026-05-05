# すまラボ 公開前チェックリスト

## 現在の状態

- サイト名: すまラボ
- 本番URL: 未確定
- canonical: `src/config/site.ts` の `siteUrl` が未設定のため、現時点ではパス基準で出力
- OGP画像: 記事サムネイルがある記事は記事ごとの `thumbnail` を使用
- デフォルトOGP画像: 未作成
- sitemap: 未導入
- robots.txt: 作成済み

## 本番URL確定後に必ず行うこと

- [ ] 本番公開URLを確定する
- [ ] `src/config/site.ts` の `siteUrl` を本番URLに差し替える
- [ ] `astro.config.mjs` の `site` を本番URLで設定する
- [ ] canonical が絶対URLで出力されることを確認する
- [ ] `og:url` が絶対URLで出力されることを確認する
- [ ] 記事サムネイルありの記事で `og:image` が絶対URLになることを確認する
- [ ] デフォルトOGP画像を作成し、`siteConfig.defaultOgpImage` に設定する

## OGP / Twitter Card

- [ ] トップページの title / description を確認する
- [ ] 記事ページの title / description / og:type が `article` になることを確認する
- [ ] 固定ページと一覧ページの og:type が `website` になることを確認する
- [ ] サムネイルあり記事で `twitter:card` が `summary_large_image` になることを確認する
- [ ] サムネイルなしページのデフォルトOGP画像方針を決める

## robots.txt / sitemap

- [x] `public/robots.txt` を作成する
- [ ] 本番URL確定後に robots.txt の Sitemap 行を追加する
- [ ] `@astrojs/sitemap` を導入するか決める
- [ ] sitemap 生成後、Search Consoleで読み込めることを確認する

## 固定ページ

- [x] `/about/` を作成する
- [x] `/privacy-policy/` を作成する
- [x] `/contact/` を作成する
- [x] `/disclosure/` を作成する
- [x] フッターから固定ページへ移動できるようにする
- [ ] 問い合わせ先のメールアドレスまたはフォームを本番公開前に確定する
- [ ] プライバシーポリシーを実際に使う解析・広告サービスに合わせて確認する
- [ ] 広告・アフィリエイト表記を、実際に利用するASPに合わせて確認する

## GitHub公開前の整理

- [x] `sample-esim` を公開対象から外す
- [x] ルート直下の作業素材を整理する
- [x] `docs/root_file_inventory.md` に移動内容を記録する
- [x] `archive/original_uploads/` をGit管理から除外する
- [x] `ブログの種（使用済）/` をGit管理から除外する
- [x] `design/reference/` をGit管理から除外する
- [x] `articles/sources/` をGit管理から除外する
- [x] `project/` をGit管理から除外する
- [x] `docs/git_publish_policy.md` にGit管理方針を記録する
- [x] GitHub公開前に不要ファイルが残っていないか確認する
- [ ] 除外した `articles/sources/` と `project/` をローカルバックアップとして保管する
- [ ] `assets/thumbnails/original/` の画像原本を公開してよいか確認する
- [ ] `docs/` に個人情報や秘密情報がないか確認する
- [ ] 本番公開前に問い合わせ先メールアドレスまたはフォームを設定する

## GitHub初回コミット直前

- [x] `.gitignore` の最終調整を行う
- [x] `npm run build` が成功する
- [x] `sample-esim` が `dist/articles/sample-esim/` に生成されていないことを確認する
- [ ] Gitリポジトリ初期化後に `git status --short --ignored` で除外状態を確認する
- [ ] GitHubへpushする前に、本番URL・問い合わせ先・実アフィリエイトリンクをまだ入れていないことを確認する

## Amazonアソシエイト申請前チェック

- [ ] 公開済み記事を10本以上にする
- [ ] 固定ページがフッターから見えることを確認する
- [ ] お問い合わせ先が「本番公開前に設定予定」のままではないか確認する
- [ ] 審査前に問い合わせ先メールアドレスまたはフォームを設定する
- [ ] 広告・アフィリエイトについてのページがあることを確認する
- [ ] 商品紹介記事でPR表記が見えることを確認する
- [ ] 実アフィリエイトURLを入れる前に、通常リンクや架空リンクが混ざっていないか確認する
- [ ] 価格、在庫、販売元、レビュー評価が変動する旨の注意書きを入れる

## 後回しでよいもの

- [ ] Google Analytics導入
- [ ] Search Console登録
- [ ] 手動ダークモード切り替え
- [ ] 検索機能
- [ ] タグ機能
- [ ] 広告枠の本格設計

## 公開後に確認すること

- [ ] 本番URLでトップページが表示される
- [ ] `/articles/` と主要記事が表示される
- [ ] `/about/` `/privacy-policy/` `/contact/` `/disclosure/` が表示される
- [ ] canonical / og:url が本番URLになっている
- [ ] OGP画像がSNSプレビューで表示される
- [ ] robots.txt が取得できる
- [ ] sitemap が取得できる
- [ ] Search Consoleでインデックス登録状況を確認する
- [ ] Search Console確認後、Amazonアソシエイト申請へ進む
