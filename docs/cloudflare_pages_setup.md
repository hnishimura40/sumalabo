# すまラボ Cloudflare Pages 公開直前メモ

## 現在の前提

- 公開先候補: Cloudflare Pages
- フレームワーク: Astro + MDX
- 出力形式: 静的サイト
- ビルドコマンド: `npm run build`
- ビルド出力先: `dist`
- 本番URL: 未確定
- 実デプロイ: まだ行わない

## 現在のAstro構成

`package.json`:

```json
{
  "scripts": {
    "dev": "astro dev --host 127.0.0.1",
    "build": "astro build",
    "preview": "astro preview --host 127.0.0.1"
  },
  "dependencies": {
    "@astrojs/mdx": "latest",
    "astro": "latest"
  }
}
```

`astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  // TODO: 本番公開URL確定後に site を設定する。
  // sitemap 導入時もこのURLを基準にする。
  integrations: [mdx()],
});
```

現時点では `site` は未設定です。
本番URL確定前なので、このまま維持します。

## Cloudflare Pages 側の推奨設定

Cloudflare PagesでGitHub連携する場合の設定値:

| 項目 | 推奨値 |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | リポジトリ直下 |
| Production branch | `main` |
| Node.js version | `22.12.0` 以上、推奨は Node 22系 |

ローカルの `node_modules/astro/package.json` では、Astro `6.1.10` の Node 条件が `>=22.12.0` でした。
Cloudflare Pages側では、環境変数で `NODE_VERSION=22.12.0` 以上を指定するのが無難です。

例:

```text
NODE_VERSION=22.12.0
```

または、Cloudflare側でNode 22系の最新利用が選べる場合は、それを使います。

## GitHub連携する場合の流れ

1. ローカルで最終確認

```bash
npm run build
```

2. Gitリポジトリを作成

```bash
git init
git add .
git commit -m "Initial sumalab site"
```

3. GitHubに新規リポジトリを作成

- リポジトリ名例: `sumalab`
- private/public は運用方針に合わせる
- GitHubへpushする前に、不要ファイルが含まれていないか確認する

4. GitHubへpush

```bash
git remote add origin <GitHub repository URL>
git branch -M main
git push -u origin main
```

5. Cloudflare Pagesで連携

- Cloudflare Dashboard
- Workers & Pages
- Create application
- Pages
- Connect to Git
- GitHubリポジトリを選択
- Build settingsを入力

6. 初回デプロイ後に仮URLで確認

Cloudflare Pagesの初回URLは通常、次のような形式になります。

```text
https://<project-name>.pages.dev/
```

このURLは仮確認用として使い、本番URLとしてコードへ固定しません。

## Git管理方針

今回 `.gitignore` を作成しました。

Git管理に含めないもの:

- `node_modules/`
- `dist/`
- `.astro/`
- `.env`
- ログファイル
- OS / エディタ一時ファイル
- `archive/original_uploads/`
- `ブログの種（使用済）/`
- `design/reference/`
- `articles/sources/`
- `project/`

Git管理に含めるもの:

- `content/articles/`
- `src/`
- `public/images/`
- `assets/thumbnails/`
- `assets/characters/`
- `docs/`
- `package.json`
- `package-lock.json`

最終判断が必要なもの:

- `assets/thumbnails/original/`
  - サムネイル原本として含める方針です。
  - 公開リポジトリにする場合は、画像の公開可否と容量を確認します。
- `docs/`
  - 運用ドキュメントとして含める方針です。
  - 内部メモや未確定TODOが公開されても問題ないか確認します。

Cloudflare Pagesでは、GitHubにpushされたソースから毎回 `npm run build` を実行し、`dist/` を生成します。
そのため、`dist/` はGit管理しない方針です。

## dist 出力確認

`npm run build` 後、`dist/` には以下が生成されます。

- `index.html`
- `robots.txt`
- `_astro/`
- `images/`
- `about/index.html`
- `privacy-policy/index.html`
- `contact/index.html`
- `disclosure/index.html`
- `articles/index.html`
- `articles/power-bank-comparison/index.html`
- `articles/usb-c-charger-comparison/index.html`
- `categories/gadgets/index.html`
- `categories/smartphone/index.html`
- `categories/mobile-plan/index.html`
- `categories/news/index.html`

画像も `dist/images/` に出力されます。

現在の画像パスは `/images/...` の絶対パスです。
独自ドメイン直下、または `*.pages.dev` 直下で公開する場合は崩れにくい構成です。

注意:

- サブディレクトリ公開、例: `https://example.com/sumalab/` は想定していません。
- その場合は `base` 設定や画像パスの見直しが必要です。

## 本番URL確定後に差し替える項目

本番URLが決まったら、以下を更新します。

### `src/config/site.ts`

```ts
siteUrl: "https://本番URL",
defaultOgpImage: "/images/ogp/default.webp",
contactEmail: "問い合わせ先メールアドレス",
```

### `astro.config.mjs`

```js
export default defineConfig({
  site: "https://本番URL",
  integrations: [mdx()],
});
```

sitemapを入れる場合は、後で `@astrojs/sitemap` を追加します。

### `public/robots.txt`

```txt
User-agent: *
Allow: /

Sitemap: https://本番URL/sitemap-index.xml
```

### 固定ページ

- `/contact/`
  - 問い合わせ先を「準備中」から実際の連絡先へ変更
- `/privacy-policy/`
  - Google Analytics、広告配信、利用ASPなど実際に使うサービスに合わせて調整
- `/disclosure/`
  - Amazonアソシエイト、楽天、Yahooなど、実際に使う広告プログラム名に合わせて調整

## 独自ドメインを使う場合の流れ

1. ドメインを決める
2. Cloudflare Pagesの Custom domains からドメインを追加
3. Cloudflare DNSを使う場合は案内に従ってDNSレコードを設定
4. SSL/TLSが有効になるまで待つ
5. 独自ドメインでトップページと主要ページを確認
6. 本番URLを `siteUrl` と `astro.config.mjs` に反映
7. `npm run build` でcanonical / OGPが本番URLになることを確認

## 公開後に確認するURL一覧

- `/`
- `/articles/`
- `/categories/gadgets/`
- `/categories/smartphone/`
- `/categories/mobile-plan/`
- `/categories/news/`
- `/about/`
- `/privacy-policy/`
- `/contact/`
- `/disclosure/`
- `/articles/power-bank-comparison/`
- `/articles/usb-c-charger-comparison/`
- `/articles/power-bank-guide/`
- `/images/thumbnails/power-bank-comparison.webp`
- `/robots.txt`
- `/sitemap-index.xml` ※sitemap導入後

## Search Console登録前チェック

- [ ] 本番URLが確定している
- [ ] `siteUrl` が本番URLになっている
- [ ] `astro.config.mjs` の `site` が本番URLになっている
- [ ] canonical が本番URLの絶対URLになっている
- [ ] `og:url` が本番URLの絶対URLになっている
- [ ] `og:image` が本番URLの絶対URLになっている
- [ ] robots.txt が取得できる
- [ ] sitemap が生成・取得できる
- [ ] `/about/` `/privacy-policy/` `/contact/` `/disclosure/` が公開済み
- [x] `sample-esim` を公開対象から外している
- [ ] GitHub公開前にルート直下の不要素材が残っていないか確認済み

## Amazonアソシエイト申請前チェック

- [ ] 公開済み記事が10本以上ある
- [ ] 商品紹介記事にPR表記がある
- [ ] `/disclosure/` が公開済み
- [ ] `/privacy-policy/` が公開済み
- [ ] `/contact/` の問い合わせ先が「準備中」のままではない
- [ ] 架空のアフィリエイトURLが入っていない
- [ ] 価格、在庫、販売元、レビュー評価が変動する旨の注意書きがある
- [ ] 商品紹介が読者の判断材料として自然に整理されている

## 今回はまだやらないこと

- Cloudflare Pagesへの実デプロイ
- GitHubへのpush
- 本番URLの仮入力
- 独自ドメイン設定
- Search Console登録
- Amazonアソシエイト申請
- 実アフィリエイトリンク追加
- 新規記事作成
