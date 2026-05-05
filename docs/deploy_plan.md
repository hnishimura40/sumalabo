# すまラボ デプロイ方針

## 現在の構成

- フレームワーク: Astro + MDX
- 記事管理: `content/articles/`
- 固定ページ: `src/pages/about.astro` などのAstroページ
- 出力形式: 静的サイト
- ビルドコマンド: `npm run build`
- 出力先: `dist/`
- 開発コマンド: `npm run dev`
- プレビューコマンド: `npm run preview`

`package.json` の現在の主要設定:

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

`astro.config.mjs` は現在、MDXのみを有効化しています。

```js
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  // TODO: 本番公開URL確定後に site を設定する。
  // sitemap 導入時もこのURLを基準にする。
  integrations: [mdx()],
});
```

## 現在生成されるページ

`npm run build` 後、`dist/` に以下の主なページが生成されます。

- `/`
- `/about/`
- `/privacy-policy/`
- `/contact/`
- `/disclosure/`
- `/articles/`
- `/articles/power-bank-comparison/`
- `/articles/usb-c-charger-comparison/`
- `/categories/gadgets/`
- `/categories/smartphone/`
- `/categories/mobile-plan/`
- `/categories/news/`

記事ページは `content/articles/` のMDXから静的生成されます。

## 本番URL未確定箇所

現時点では、本番URLをまだ確定していません。
そのため、以下はTODOのまま維持しています。

- `src/config/site.ts`
  - `siteUrl: ""`
  - `defaultOgpImage: ""`
  - `contactEmail: ""`
- `astro.config.mjs`
  - `site` 未設定
- `public/robots.txt`
  - `Sitemap:` 行はTODOコメント

本番URLが確定するまでは、勝手に仮URLを入れない方針です。

## canonical / OGP / robots / sitemap

### canonical / OGP

`src/layouts/BaseLayout.astro` で以下を出力しています。

- `title`
- `description`
- `canonical`
- `og:site_name`
- `og:title`
- `og:description`
- `og:type`
- `og:url`
- `og:image`
- `twitter:card`

現在は `siteConfig.siteUrl` が空のため、canonical と og:url はパス基準になります。
本番URL確定後に `siteConfig.siteUrl` を設定すると、絶対URLで出力できます。

記事サムネイルがある記事では、frontmatter の `thumbnail` を `og:image` に使います。
ただし、デフォルトOGP画像はまだ未作成です。

### robots.txt

`public/robots.txt` は作成済みです。

```txt
User-agent: *
Allow: /

# TODO: 本番公開URL確定後に Sitemap 行を追加する。
# 例: Sitemap: https://本番公開URL/sitemap-index.xml
```

### sitemap

現時点では `@astrojs/sitemap` は未導入です。
Astro公式ドキュメントでは、`@astrojs/sitemap` は静的生成されたルートをクロールして `sitemap-index.xml` や `sitemap-0.xml` を出力できます。

導入する場合は、本番URL確定後に以下を行います。

```bash
npx astro add sitemap
```

その後、`astro.config.mjs` に `site: "https://本番URL"` を設定し、`robots.txt` に次を追加します。

```txt
Sitemap: https://本番URL/sitemap-index.xml
```

## 画像パス

現在の記事サムネイルとキャラクター画像は、公開用に `public/images/` 配下へ配置しています。

- 記事サムネイル: `/images/thumbnails/*.webp`
- キャラクター画像: `/images/characters/*.webp`

Astroの静的出力では `public/` 配下がそのまま公開ルートにコピーされるため、通常の静的ホスティングでも画像パスは崩れにくい構成です。

注意点:

- サブディレクトリ配信、例: `https://example.com/sumalab/` で公開する場合は、リンクや画像パスの再検討が必要です。
- 独自ドメイン直下、例: `https://example.com/` で公開する前提なら現在の絶対パスで問題ありません。

## 公開先候補の比較

| 公開先 | Astroとの相性 | 無料枠 | 独自ドメイン | デプロイの簡単さ | 将来拡張 | 初心者運用 |
|---|---|---|---|---|---|---|
| Cloudflare Pages | 良い。Astroのビルドコマンド `npm run build`、出力先 `dist` で設定可能 | あり | 設定しやすい | GitHub連携なら簡単 | CDN、DNS、Workers連携が強い | DNSもCloudflareに寄せるなら管理しやすい |
| Netlify | 良い。Astroを自動検出し、`astro build` / `dist` を提案 | あり | 設定しやすい | GitHub連携が簡単 | フォーム、Functions、Image CDNなど | 管理画面が分かりやすい |
| Vercel | 良い。静的Astroは追加設定なしでデプロイ可能 | あり | 設定しやすい | GitHub連携が非常に簡単 | フロントエンド拡張に強い | UIは分かりやすいが商用規約確認は必要 |
| レンタルサーバーに静的HTMLアップロード | 静的出力なので可能 | サーバー契約次第 | 既存ドメイン運用と相性がよい | 手動アップロードが必要 | 自動化しないと運用が重くなる | FTP操作に慣れていれば簡単 |

## おすすめ公開先

現時点のすまラボでは、**Cloudflare Pages** を第一候補にします。

理由:

- 現在のAstro構成が静的サイトなので相性が良い
- `npm run build` と `dist` 指定で公開できる
- 独自ドメイン、HTTPS、CDNまわりをまとめやすい
- 今後、Cloudflare側でDNSやキャッシュも管理しやすい
- GitHub連携にすれば、記事追加後の再デプロイが自動化しやすい

次点は **Netlify** です。
問い合わせフォームをNetlify Formsで作りたい場合や、管理画面の分かりやすさを重視する場合はNetlifyも有力です。

VercelはAstro静的サイトでも使いやすいですが、すまラボのような情報メディアではCloudflare PagesかNetlifyの方が運用イメージを作りやすいです。

レンタルサーバーへの手動アップロードは、既存サーバーや既存ドメインを使いたい場合の候補です。ただし、毎回 `dist/` をアップロードする必要があり、記事更新のたびに手間が増えます。

## 推奨公開手順

### 1. 本番URLを決める

例:

```text
https://sumalab.jp/
```

または、サブドメイン運用の場合:

```text
https://sumalab.example.com/
```

本番URLが決まるまで、コードには仮URLを入れません。

### 2. Git管理を準備する

Cloudflare Pages / Netlify / Vercel のどれを使う場合でも、GitHub連携がもっとも運用しやすいです。

必要な作業:

- Gitリポジトリを作成
- 不要ファイルを `.gitignore` で除外
- GitHubへpush
- デプロイ先でGitHubリポジトリを連携

### 3. デプロイ先を設定する

Cloudflare Pagesの場合:

- Framework preset: Astro
- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

Netlifyの場合:

- Build command: `npm run build`
- Publish directory: `dist`

Vercelの場合:

- Astro自動検出
- Build command: 通常は自動、必要なら `npm run build`
- Output directory: 通常は自動、必要なら `dist`

レンタルサーバーの場合:

- ローカルで `npm run build`
- `dist/` の中身をサーバーの公開ディレクトリへアップロード
- `/about/` などのディレクトリ型URLが表示できるか確認

### 4. 本番URLをコードに反映する

本番URL確定後に以下を更新します。

- `src/config/site.ts`
  - `siteUrl`
  - `defaultOgpImage`
  - `contactEmail`
- `astro.config.mjs`
  - `site`
- `public/robots.txt`
  - `Sitemap: https://本番URL/sitemap-index.xml`
- 固定ページ
  - `/contact/` の問い合わせ先
  - `/privacy-policy/` の利用サービス名
  - `/disclosure/` の広告・ASP表記

### 5. sitemapを導入する

本番URL確定後、必要に応じて `@astrojs/sitemap` を導入します。

```bash
npx astro add sitemap
npm run build
```

生成確認:

- `dist/sitemap-index.xml`
- `dist/sitemap-0.xml`

### 6. 本番反映前にビルド確認

```bash
npm run build
```

確認するページ:

- `/`
- `/articles/`
- `/articles/power-bank-comparison/`
- `/articles/usb-c-charger-comparison/`
- `/about/`
- `/privacy-policy/`
- `/contact/`
- `/disclosure/`
- `/categories/gadgets/`

## 公開後にやること

- 本番URLでトップページが表示されるか確認
- 固定ページ4件が表示されるか確認
- 主要記事が表示されるか確認
- 記事サムネイルが表示されるか確認
- canonical が本番URLになっているか確認
- `og:url` が本番URLになっているか確認
- `og:image` が本番URLの絶対URLになっているか確認
- `robots.txt` が取得できるか確認
- `sitemap-index.xml` が取得できるか確認
- 404ページの扱いを確認

## Search Console登録前の確認

- 本番URLが決まっている
- canonical が本番URLになっている
- sitemap が生成されている
- robots.txt に sitemap が記載されている
- `/about/` `/privacy-policy/` `/contact/` `/disclosure/` が公開済み
- 主要カテゴリと記事一覧が公開済み
- サンプル記事 `sample-esim` が公開対象から外れていることを確認する

## Amazonアソシエイト申請前の確認

- 公開済み記事数が10本以上ある
- 商品紹介記事にPR表記がある
- `/disclosure/` が公開されている
- `/privacy-policy/` が公開されている
- `/contact/` の問い合わせ先が準備中のままではない
- 実アフィリエイトリンクを入れる前に、通常URLや架空URLが混ざっていない
- 価格・在庫・販売元・レビュー評価が変動する旨の注意書きがある
- 記事内容が読者の判断材料を優先している

## 参考にした公式情報

- Cloudflare Pages Astro guide: https://developers.cloudflare.com/pages/framework-guides/deploy-an-astro-site/
- Netlify Astro docs: https://docs.netlify.com/integrations/frameworks/astro/
- Vercel Astro docs: https://vercel.com/docs/frameworks/frontend/astro
- Astro Vercel deploy guide: https://docs.astro.build/guides/deploy/vercel/
- Astro sitemap integration: https://docs.astro.build/guides/integrations-guide/sitemap/
