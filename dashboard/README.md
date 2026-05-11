# メディア司令室 (Blog Command Center)

複数ブログ (AI二刀流 / すまラボ / ミラディア) のアクセス状況を横断で確認する個人用ダッシュボード。
**外部公開しない**前提。Cloudflare Pages + Cloudflare Access で自分のメールだけ通す運用。

## ⚠️ リポジトリ公開状態と取り扱い

このリポジトリは **PUBLIC** (`github.com/hnishimura40/sumalabo`)。
そのため以下の制約を守ること:

1. **実データ JSON (`public/data/dashboard-latest.json`) を絶対に commit しない。**
   GitHub に上がった瞬間、URLを知る誰でも生 PV / 検索クエリを閲覧できる。
2. **GA4 / Search Console の Secret も commit しない。** GitHub Secrets と CI ランナー内のみ。
3. CI からの配備は **Cloudflare Pages の Direct Upload (Wrangler)** で行い、ビルド成果物 `dist/` を直接 Pages に流す。
4. これらは `dashboard/.gitignore` と workflow 内の `git check-ignore` セーフティチェックで二重防止している。

(将来リポジトリを Private に切り替えるなら、`scheduled-deploy.yml` と同様の commit ベース運用にも戻せる — 切替案は本ファイル末尾。)

## スタック

- React 18 + Vite 5 + TypeScript
- Tailwind CSS 3
- Recharts (PV推移グラフ)
- ライブデータ生成: GitHub Actions (Node 20) → ランナー内 → Wrangler で Pages へ Direct Upload

## セットアップ (ローカル)

```bash
cd dashboard
npm install
npm run dev          # http://127.0.0.1:5173
npm run build        # tsc -b && vite build → dist/
npm run preview
npm run fetch-data   # public/data/dashboard-latest.json を生成 (gitignore済)
```

## データの取り回し

| 優先度 | 取得元 | 役割 |
|---|---|---|
| 1 | `/data/dashboard-latest.json` | CI で生成して `dist/data/` に同梱され Pages に配備される |
| 2 | `src/data/sample-dashboard.json` (バンドル済み) | ファイル未配置時 / 開発時のフォールバック |

`src/lib/dataLoader.ts` がこの優先順で読み込む。fetch が 404 / JSON エラーになった場合は静かにサンプルへフォールバックし、画面は必ず描画される。
ライブ vs サンプルはヘッダー右上のバッジ (🟢 ライブデータ / 🟡 サンプル表示) で判別できる。

## GitHub Actions ワークフロー

`/.github/workflows/update-dashboard-data.yml` (name: **Build and Deploy Dashboard**)

### 実行方法

- **前提**: **workflow ファイルを `main` ブランチに push しない限り Actions タブには表示されず、手動 dispatch ボタンも出ない**。フィーチャーブランチ上に置いただけでは認識されないので注意。
- **手動**: GitHub → Actions → "Build and Deploy Dashboard" → Run workflow (branch: `main`)
- **自動 (cron)**: JST 06:00 / 12:00 / 18:00 (UTC 21:00 / 03:00 / 09:00)

### フロー

1. checkout → Node 20 → `dashboard/` で `npm ci`
2. `npm run fetch-data` でランナー内に `public/data/dashboard-latest.json` を生成 (commitしない)
3. `git check-ignore` で gitignore されていることを必ず確認 (してなければ CI 失敗)
4. `npm run build` で `dist/` を作成 (Vite が public/ をそのまま `dist/` に同梱)
5. `cloudflare/wrangler-action@v3` で `wrangler pages deploy dist --project-name=$CLOUDFLARE_PAGES_PROJECT --branch=main`

→ Pages に **deploy のたび新しい URL** が払い出される (Production deployment は `<project>.pages.dev` または独自ドメインで参照)。

## Secrets 設計

すべて GitHub Settings → Secrets and variables → Actions に登録。**ブラウザ側には絶対に出さない**。

### Cloudflare 配備用 (必須)

| Secret 名 | 用途 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Pages: Edit 権限 (絞ったカスタムトークンを作成) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare ダッシュボード右下に表示される ID |
| `CLOUDFLARE_PAGES_PROJECT` | Pages プロジェクト名 (例: `media-command-center`) |

`CLOUDFLARE_API_TOKEN` は Cloudflare → My Profile → API Tokens → Create Token → Custom token で:
- Permissions: **Account → Cloudflare Pages → Edit**
- Account Resources: 対象アカウントのみ
- 他の権限は付けない (最小権限)

### GA4 / Search Console (⚠️ Phase 3 まで登録禁止)

**「実データ投入前チェックリスト」がすべて ✅ になるまで以下 8 件は一切登録しないこと。**
先に登録すると、次回 cron か手動 dispatch でライブデータの取得・配備が走り出してしまう。Access 設定が漏れていた場合に取り返しがつかない。


| Secret 名 | 用途 |
|---|---|
| `GA4_PROPERTY_ID_AINITORYU` / `_SUMALAB` / `_MIRADIA` | GA4 プロパティID (数値) |
| `GA4_SERVICE_ACCOUNT_JSON` | GA4 Data API サービスアカウント鍵 JSON |
| `SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON` | Search Console API サービスアカウント鍵 JSON |
| `SEARCH_CONSOLE_SITE_AINITORYU` / `_SUMALAB` / `_MIRADIA` | Search Console プロパティ (`https://...` または `sc-domain:...`) |

Google Cloud Console でサービスアカウントを 1 つ作り、GA4 Data API と Search Console API を有効化。
GA4 / Search Console 側でそのサービスアカウントメールに「閲覧者」権限を付与する (3サイト分)。

## Cloudflare Pages 設定値

Direct Upload 方式なので、Pages プロジェクトは「空のプロジェクト」を 1 つ用意するだけ。

1. Cloudflare ダッシュボード → **Pages → アプリケーションを作成 → Direct Upload** で新規プロジェクトを作る。
2. **Project name**: `media-command-center` (任意 — Secrets の `CLOUDFLARE_PAGES_PROJECT` に同じ値を入れる)
3. 初回だけダミーの index.html などをアップロードしてプロジェクトを成立させる。
4. 以降は GitHub Actions の Wrangler ステップが自動で更新する。
5. **Git 連携は使わない** (使うと Preview Deployment が外部に晒される懸念)。

参考 (Git 連携を使う場合の値 — 本リポジトリは Direct Upload を採用するので不要):

| 項目 | 値 |
|---|---|
| Production branch | `main` |
| Framework preset | None |
| Root directory | `dashboard` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `NODE_VERSION=20` |

## pages.dev / 独自ドメインの扱い

Cloudflare Pages のデプロイは以下の URL を **同時に** 払い出す。**全部** を保護対象にする必要がある:

| URL 種別 | 例 | 出現タイミング |
|---|---|---|
| Production | `media-command-center.pages.dev` | `--branch=main` で deploy したとき |
| Branch alias | `<branch>.media-command-center.pages.dev` | 他のブランチ名で deploy したとき |
| Deployment-specific | `<sha8>.media-command-center.pages.dev` | 各 deploy ごとに毎回 |
| カスタムドメイン | `dashboard.example.com` (任意) | Pages → Custom domains で割り当てた場合 |

→ **Cloudflare Access の Application domain は、念のため以下 2 つを必ず両方登録する** のが鉄則:

1. **`media-command-center.pages.dev` (apex / Subdomain 空欄)** — Production の apex URL
2. **`*.media-command-center.pages.dev` (Subdomain `*`)** — Branch alias / Deployment-specific (`<sha8>.…`) / Preview などサブドメイン全部

ワイルドカードだけだと Cloudflare の Access の実装上、apex 部分が漏れる事故報告がある (UI / バージョンに依存)。両方登録しておけば確実。
独自ドメインを使うならそれも別 Application、または同 Application に追加で登録する。

## Cloudflare Access (Zero Trust) で個人用に閉じる

**実データを入れる前に必ず設定する。**
PUBLIC リポジトリ + Direct Upload 構成では Access が唯一の閲覧制御。

1. Cloudflare ダッシュボード → **Zero Trust** に入る (初回は無料プランで Team を作成)。
2. **Access → Applications → Add an application → Self-hosted**。
3. **Application configuration**:
   - **Application name**: `Media Command Center`
   - **Session duration**: `24 hours` 程度
   - **Application domains** (以下を **両方** 登録 — どちらか片方では漏れる可能性あり):
     - **登録 1**: Subdomain: (空) / Domain: `media-command-center.pages.dev` / Path: (空) ← Production の apex を保護
     - **登録 2**: Subdomain: `*` / Domain: `media-command-center.pages.dev` / Path: (空) ← Branch alias / Deployment 固有 / Preview をまとめて保護
     - (カスタムドメインを使うなら) Subdomain: `dashboard` / Domain: `example.com` を同 Application に追加
4. **Identity providers**: One-time PIN (メール) を有効化 (Google / GitHub IdP も可)。
5. **Policies → Add a policy**:
   - **Policy name**: `Owner only`
   - **Action**: `Allow`
   - **Rules → Include → Emails Equals**: `h.nishimura40@gmail.com` (自分のメールアドレスのみ)
   - 他に Allow ポリシーは作らない (Allow を満たさないものは自動 Deny)
6. 保存して数分待つと、対象ドメインへのアクセス時に Cloudflare Access のメール認証画面が前段に挟まる。

### 動作確認手順 (シークレットウィンドウで毎回やる)

1. ✅ シークレットウィンドウで `https://media-command-center.pages.dev/` (apex) を開く → Cloudflare Access のログイン画面が出る (本体は見えない)
2. ✅ 自分のメールでログイン → ワンタイム PIN を入れる → 本体が見える
3. ✅ 別のメール (例: 個人副メール / 友人) でログイン試行 → "You don't have permission to view this site" で弾かれる
4. ✅ ログイン済みセッションで `https://<sha8>.media-command-center.pages.dev/` (deployment 固有 / サブドメイン側) にもアクセス → Access が同じく前段に出る (= Preview も守られている / `*.pages.dev` の Application domain が機能している)
5. ✅ **`https://media-command-center.pages.dev/data/dashboard-latest.json` をシークレットウィンドウで直叩き → Access のログイン画面が出る** (本体 HTML だけでなく JSON エンドポイントも Application 配下のすべてのパスが守られていることの確認 — ここを必ずやる)
6. ✅ ログアウト後に再度シークレットウィンドウで開く → ログイン画面に戻る
7. ✅ カスタムドメインを設定している場合、そちらでも 1–5 を確認

## 実データ投入前チェックリスト

Phase 3 (GA4 / Search Console 実 API 取得) に進む前に、すべて ✅ を確認:

- [ ] **リポジトリ可視性の方針が確定している** (現在 PUBLIC。Private 化するか、PUBLIC のまま Direct Upload 運用を継続するか決まっている)
- [ ] **`dashboard/.gitignore` に `public/data/dashboard-latest.json` が含まれている**
- [ ] **workflow ファイルを `main` ブランチに push 済み** (push しないと Actions タブに workflow 自体が表示されず、手動 dispatch もできない)
- [ ] **workflow の `Verify live JSON is gitignored` ステップが成功している** (= 1 回でも CI を走らせて緑になっている)
- [ ] **Cloudflare Pages プロジェクトが Direct Upload で作成済み** (Git 連携を使っていない)
- [ ] **`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` / `CLOUDFLARE_PAGES_PROJECT` を GitHub Secrets に登録済み**
- [ ] **Cloudflare Access の Application domain に以下 2 つを両方登録**:
   - [ ] `<project>.pages.dev` (apex / Subdomain 空欄)
   - [ ] `*.<project>.pages.dev` (Subdomain `*` でサブドメイン側を一括カバー)
- [ ] **Access ポリシーが自分のメール 1 件だけ Allow** (Service Auth / IP / Country 等の追加 Allow が紛れ込んでいない)
- [ ] **シークレットウィンドウで `pages.dev` apex 直アクセスが弾かれる**
- [ ] **シークレットウィンドウで Preview URL (`<sha8>.<project>.pages.dev`) も弾かれる**
- [ ] **シークレットウィンドウで `https://<project>.pages.dev/data/dashboard-latest.json` 直叩きも弾かれる** (JSON エンドポイントが Access 配下に入っていることの確認)
- [ ] **別メールでログイン試行 → 拒否を確認済み**
- [ ] **カスタムドメインを使うなら、そちらも Access で保護済み**
- [ ] **`dashboard-latest.json` (サンプル状態でも) を `git log -- dashboard/public/data/` で確認 → ヒット 0 件** (= 過去 commit にも含まれていない)
- [ ] ⚠️ **GA4 / Search Console の 8 件の Secrets はまだ一切登録しない** (このチェックリストを全部 ✅ にしてから初めて登録する。先に登録するとライブデータが流れ始めてしまう)
- [ ] **サービスアカウントは GA4 / Search Console プロパティに「閲覧者」権限のみ付与** (編集権限はNG / Phase 3 で実施)

このチェックリストをすべて ✅ にしてから初めて Phase 3 (GA4 / Search Console Secrets の登録と fetch-dashboard-data.mjs の実装) に進む。

## ディレクトリ

```
dashboard/
  index.html
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  tsconfig.json
  tsconfig.node.json
  .env.example
  .gitignore                            # public/data/dashboard-latest.json を除外
  README.md
  scripts/
    fetch-dashboard-data.mjs            # Phase 2: sample copy / Phase 3: GA4+SC fetch
  public/
    favicon.svg
    data/
      (dashboard-latest.json は CI ランナー内でのみ存在 / git管理対象外)
  src/
    main.tsx
    App.tsx
    index.css
    components/
      SummaryCards.tsx
      SiteCard.tsx
      ViewsChart.tsx
      TopPagesTable.tsx
      RisingPages.tsx
      SearchInsights.tsx
      ImprovementCards.tsx
      DeltaBadge.tsx
    data/
      sample-dashboard.json             # コミットOK (架空データ)
    lib/
      format.ts
      dataLoader.ts                     # /data/dashboard-latest.json 優先 → sample fallback
    types/
      dashboard.ts
```

## 代替案: リポジトリを Private に切り替えた場合

`gh repo edit hnishimura40/sumalabo --visibility private --accept-visibility-change-consequences` で Private 化すると:

- `dashboard-latest.json` を commit しても外部に出ないため、commit ベース運用に戻せる。
- Workflow の Cloudflare Pages 部分を **Git 連携** + `scheduled-deploy.yml` 流の Deploy Hook trigger に簡略化可能。
- ただし「ブログ本体のソース (`src/content/` の記事原稿等) も Private 化される」ため、外部に公開していたソースが読めなくなる影響を必ず確認すること。
- 切替後も Cloudflare Access による閲覧制御は引き続き必要。

→ 本ファイル冒頭の Direct Upload 構成のままにしておけば、Public/Private のどちらでも安全に運用できる。

## 次フェーズへの作業 (Phase 3: 実 API 連携)

「実データ投入前チェックリスト」がすべて ✅ になってから以下を行う。

1. Google Cloud Console でサービスアカウントを作成 → GA4 Data API と Search Console API を有効化 → JSON 鍵を払い出す。
2. GA4 / Search Console の各プロパティにサービスアカウントメールを「閲覧者」として追加 (3サイト × 2API)。
3. GitHub Secrets に 8 件を登録 (上記 Secrets 表参照)。
4. `dashboard/` に `npm i -D @google-analytics/data googleapis` を追加。
5. `dashboard/scripts/fetch-dashboard-data.mjs` の TODO ブロックを実装:
   - GA4 Data API で PV / users / sessions / topPages / risingPages / dailyViews
   - `googleapis` の `webmasters.searchanalytics.query` で clicks / impressions / ctr / position / topQueries
   - `DashboardSnapshot` 型に詰めて書き出し、`source` を `mixed` (or 個別の `ga4` / `search-console`)
6. workflow を手動 dispatch → 緑になり、画面右上が 🟢「ライブデータ」になることを確認。
7. 別メール / シークレットウィンドウで Access が依然有効か再確認 (Phase 3 投入直後の安全確認は必須)。
