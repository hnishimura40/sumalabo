# GitHub公開前のGit管理方針

このメモは、すまラボをCloudflare Pages / GitHubで公開する前に、Git管理へ含めるもの・含めないものを整理するための方針です。

実デプロイ、GitHub push、本番URL入力、実アフィリエイトリンク追加は、この段階では行いません。

## Git管理に含めるもの

| 対象 | 方針 | 理由 |
|---|---|---|
| `src/` | 含める | Astroサイト本体 |
| `content/` | 含める | 公開記事・記事テンプレートの管理に必要 |
| `public/` | 含める | 公開用画像、robots.txtなど本番表示に必要 |
| `public/images/` | 含める | 記事サムネイル・キャラクター画像の公開先 |
| `assets/characters/` | 含める | キャラクター素材の原本・派生管理に必要 |
| `assets/icons/original/` | 含める | favicon / ホーム画面アイコンの元画像保管に必要 |
| `assets/thumbnails/webp/` | 含める | Web表示用サムネイルの管理に必要 |
| `assets/thumbnails/original/` | 含める方針 | サムネイル再生成用の原本。公開リポジトリにする場合は容量と公開可否を確認 |
| `docs/` | 含める方針 | 運用・制作方針の共有に必要。公開前に個人情報や秘密情報がないか確認 |
| `scripts/` | 含める | 画像処理など再現性のある作業に必要 |
| `package.json` / `package-lock.json` | 含める | Cloudflare Pagesのビルドに必要 |
| `astro.config.mjs` / `tsconfig.json` | 含める | Astro / TypeScript設定に必要 |

## Git管理から除外するもの

| 対象 | 方針 | 除外理由 |
|---|---|---|
| `node_modules/` | 除外 | 依存パッケージは再インストール可能 |
| `dist/` | 除外 | ビルド生成物。Cloudflare Pages側で生成する |
| `.astro/` | 除外 | Astroの一時生成物 |
| `.env` / `.env.*` | 除外 | 秘密情報を含む可能性がある |
| `*.log` / `*.tmp` / `*.temp` / `~$*` | 除外 | ログ・一時ファイル |
| `.DS_Store` / `Thumbs.db` / `desktop.ini` | 除外 | OS生成ファイル |
| `.vscode/` / `.idea/` | 除外 | 個人のエディタ設定 |
| `archive/original_uploads/` | 除外 | ルート直下から退避した生成元画像・参考資料のローカル保管場所 |
| `ブログの種（使用済）/` | 除外 | ローカル作業メモ・使用済み素材置き場 |
| `design/reference/` | 除外 | Claude Designなどの参照HTML/PDF。サイト生成には不要で容量が大きい |
| `articles/sources/` | 除外 | 元原稿、調査メモ、商品情報、参考URLを含むローカル制作素材 |
| `project/` | 除外 | 初期指示書・原本画像を含むバックアップ兼原本置き場 |

## 要最終判断のもの

| 対象 | 現時点の扱い | 判断ポイント |
|---|---|---|
| `articles/sources/` | `.gitignore`で除外 | 公開リポジトリに含めたい原稿がある場合だけ、内容を精査して個別に移す |
| `project/` | `.gitignore`で除外 | 初期指示書・原本素材を公開してよいか確認できるまでローカル保管 |
| `design/reference/` | `.gitignore`で除外 | 必要な設計内容は `docs/design_system.md` に反映済み。元HTML/PDFの公開可否は未判断 |
| `assets/thumbnails/original/` | 含める方針 | サムネイル原本として有用。ただし公開リポジトリでは画像の権利・容量を確認 |
| `docs/` | 含める方針 | 運用方針として有用。ただし内部メモ、未確定URL、問い合わせ先TODO、申請前メモが公開されてよいか確認 |

## 本番公開前に確認すること

- [x] `.gitignore` に `archive/original_uploads/` が含まれている
- [x] `.gitignore` に `ブログの種（使用済）/` が含まれている
- [x] `.gitignore` に `design/reference/` が含まれている
- [x] `.gitignore` に `articles/sources/` が含まれている
- [x] `.gitignore` に `project/` が含まれている
- [ ] 除外した元原稿・原本素材を、ローカルバックアップとして別途保管する
- [ ] `docs/` に個人情報、秘密情報、公開したくない内部メモがないか確認する
- [ ] `assets/thumbnails/original/` の画像を公開してよいか確認する
- [ ] `.env` やAPIキー、ASP管理画面情報、メールアカウント情報が混ざっていないか確認する
- [ ] GitHubへpushする前に `git status` で不要ファイルが含まれていないか確認する
- [ ] 本番URLと問い合わせ先メールは、公開直前に確定してから反映する
