# GitHub初回コミット直前レポート

作成日: 2026-05-05

このレポートは、すまラボをGitHubへ初回コミットする直前の確認結果です。
実デプロイ、GitHub push、本番URL入力、実アフィリエイトリンク追加はまだ行っていません。

## 現在の状態

- フレームワーク: Astro + MDX
- ビルドコマンド: `npm run build`
- 出力先: `dist/`
- 本番URL: 未確定
- `siteUrl`: 未設定
- 問い合わせ先メール: 未設定
- 実アフィリエイトURL: 未設定
- Gitリポジトリ: 未初期化

## Git管理に含めるもの

- `src/`
- `content/`
- `public/`
- `assets/characters/`
- `assets/thumbnails/webp/`
- `assets/thumbnails/original/`
- `docs/`
- `scripts/`
- `package.json`
- `package-lock.json`
- `astro.config.mjs`
- `tsconfig.json`

## Git管理から除外するもの

`.gitignore` で以下を除外済みです。

- `node_modules/`
- `dist/`
- `.astro/`
- `.env`
- `.env.*`
- `archive/original_uploads/`
- `ブログの種（使用済）/`
- `design/reference/`
- `articles/sources/`
- `project/`
- ログ、一時ファイル、OS / エディタ生成ファイル

## 公開記事の状態

`content/articles/` には、公開対象の `ready` 記事が10本あります。

- `iphone-vs-android`
- `what-is-esim`
- `what-is-cheap-sim`
- `what-is-ai-smartphone`
- `used-smartphone-guide`
- `smartphone-under-30000-guide`
- `usb-c-charger-guide`
- `power-bank-guide`
- `usb-c-charger-comparison`
- `power-bank-comparison`

`sample-esim` は `status: "draft"` のため、記事一覧と静的生成対象から除外されています。
`_template` は `status: "idea"` のため、公開対象ではありません。

## build確認

実行コマンド:

```bash
npm run build
```

結果:

- 成功
- 20ページ生成
- `dist/articles/sample-esim/` は生成されていない
- `dist/images/` と主要固定ページが生成されている

生成確認済みの主要ページ:

- `/`
- `/articles/`
- `/articles/power-bank-comparison/`
- `/articles/usb-c-charger-comparison/`
- `/articles/what-is-esim/`
- `/categories/gadgets/`
- `/categories/smartphone/`
- `/categories/mobile-plan/`
- `/categories/news/`
- `/about/`
- `/privacy-policy/`
- `/contact/`
- `/disclosure/`

## 本番URL待ち項目

本番URL確定後に以下を更新します。

- `src/config/site.ts` の `siteUrl`
- `astro.config.mjs` の `site`
- `public/robots.txt` の `Sitemap` 行
- デフォルトOGP画像の作成と `siteConfig.defaultOgpImage`
- canonical / OGP URLが絶対URLになることの確認

## 問い合わせ先待ち項目

現在、`src/config/site.ts` の `contactEmail` は空です。
`/contact/` では「お問い合わせ先は本番公開前に設定予定です」と表示されます。

Amazonアソシエイト申請前には、メールアドレスまたは問い合わせフォームの設定が必要です。

## ローカルGit初期化前の確認コマンド

```bash
npm run build
```

```bash
git init
git status --short --ignored
```

`git status --short --ignored` で、以下が `!!` 側に出ることを確認します。

- `node_modules/`
- `dist/`
- `.astro/`
- `archive/original_uploads/`
- `ブログの種（使用済）/`
- `design/reference/`
- `articles/sources/`
- `project/`

## 初回コミット前の確認コマンド

```bash
git add .
git status --short
```

確認ポイント:

- `articles/sources/` が追加対象に入っていない
- `project/` が追加対象に入っていない
- `archive/original_uploads/` が追加対象に入っていない
- `design/reference/` が追加対象に入っていない
- `dist/` と `.astro/` が追加対象に入っていない
- `src/`、`content/`、`public/`、`docs/`、`assets/`、`scripts/`、設定ファイルが追加対象に入っている

問題なければ、初回コミットします。

```bash
git commit -m "Initial sumalab Astro site"
```

GitHubへpushする前に、リポジトリの公開範囲が public か private かを最終判断してください。

## まだ残っている作業

- 本番URLを決める
- `siteUrl` と `astro.config.mjs` の `site` を本番URLに差し替える
- 問い合わせ先メールまたはフォームを設定する
- デフォルトOGP画像を作成する
- sitemap導入方針を決める
- Search Console登録
- Amazonアソシエイト申請
- 実アフィリエイトURLを `src/data/affiliateLinks.ts` に追加する
