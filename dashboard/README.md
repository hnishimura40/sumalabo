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

## 0 円ローカルデプロイ (GitHub Actions 不使用)

GitHub Actions の Budgets 設定で Actions が停止する状態でも、**ローカルからの Wrangler Direct Upload** だけで配備できる。GitHub Free 維持 / 支払い方法不要 / Secrets ファイル保存なし。

### 前提

- Node.js 20 系
- Wrangler がアカウント認証済み (1 回だけ実行):
  ```bash
  npx wrangler login
  ```
  ブラウザで Cloudflare の OAuth 同意画面 → wrangler が自前のクレデンシャルキャッシュに保存。**API Token をリポジトリや `.env` に保存しない**。
- (代替) `CLOUDFLARE_API_TOKEN=...` を **shell セッションで `export` するだけ**でも可。値はファイルに残さない。

### 手順 (1 コマンド)

```bash
cd dashboard
npm ci            # 初回 / lock 更新後のみ
npm run deploy:local
```

`npm run deploy:local` は以下を順に実行する:

1. `npm run fetch-data` — GA4 Secrets 未設定なら sample fallback で `public/data/dashboard-latest.json` を生成 (gitignore 対象)
2. `npm run build` — Vite で `dist/` を作成 (`dist/data/dashboard-latest.json` も同梱)
3. `npx wrangler pages deploy dist --project-name media-command-center --branch main` — Direct Upload

### 環境変数 (どれもオプション)

| 名前 | 用途 | デフォルト |
|---|---|---|
| `CLOUDFLARE_PAGES_PROJECT` | Pages プロジェクト名 | `media-command-center` |
| `WRANGLER_BRANCH` | Production 扱いするブランチ名 | `main` |
| `CLOUDFLARE_API_TOKEN` | OAuth セッションの代替 | (なくても OAuth で動く) |

### GA4 を 0 円ローカル運用で接続したい場合

GitHub Secrets を使わず、ローカル shell に直接 export する:

```bash
# どのファイルにも書かない。シェルセッション中だけ有効。
export GA4_SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)"
export GA4_PROPERTY_ID_AINITORYU="123456789"
export GA4_PROPERTY_ID_SUMALAB="..."
export GA4_PROPERTY_ID_MIRADIA="..."

cd dashboard
npm run deploy:local
```

- shell を閉じれば変数は消える
- `history` に値が残る可能性があるので、`set +o history` で履歴を切ってから export するか、`HISTFILE=/dev/null` 経由でセッション分離する
- 鍵 JSON ファイルは終わったら削除推奨

### 注意

- `dashboard/public/data/dashboard-latest.json` は **絶対に commit しない**(gitignore で保護済)
- Cloudflare Access の保護 (apex + wildcard) は本ローカルデプロイと無関係に維持される
- workflow の `schedule:` は引き続きコメントアウト維持(GitHub Actions を完全に止めている運用)

## GitHub Actions ワークフロー (現在は使用停止中)

GitHub の Budgets 設定で Actions が account-level で停止しているため、本リポジトリでは上記「0 円ローカルデプロイ」が主経路。
以下の workflow ドキュメントは Actions が復活したら使えるが、現状は参考のみ。

`/.github/workflows/update-dashboard-data.yml` (name: **Build and Deploy Dashboard**)

### 実行方法

- **前提**: **workflow ファイルを `main` ブランチに push しない限り Actions タブには表示されず、手動 dispatch ボタンも出ない**。フィーチャーブランチ上に置いただけでは認識されないので注意。
- **手動**: GitHub → Actions → "Build and Deploy Dashboard" → Run workflow (branch: `main`)
- **自動 (cron)**: JST 06:00 / 12:00 / 18:00 (UTC 21:00 / 03:00 / 09:00) — ⚠️ **現在は本番前セットアップ完了まで一時停止中**。Cloudflare Pages プロジェクト / Secrets 3 件 / Access 設定がすべて完了し、`workflow_dispatch` で 1 回成功確認できたら、ワークフロー内の `schedule:` ブロックのコメントを外して再開する。

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

### GA4 (Phase 3A 用 — このフェーズで段階的に登録)

GA4 Data API は `scripts/fetch-dashboard-data.mjs` で実装済み。**Cloudflare Access の動作確認後に**以下 4 件を登録すると、次回 dispatch でライブデータ取得が始まる。

| Secret 名 | 用途 |
|---|---|
| `GA4_SERVICE_ACCOUNT_JSON` | GA4 Data API サービスアカウント鍵 JSON 全文 (3 サイト兼用) |
| `GA4_PROPERTY_ID_AINITORYU` | AI二刀流の GA4 プロパティID (数値文字列) |
| `GA4_PROPERTY_ID_SUMALAB` | すまラボの GA4 プロパティID |
| `GA4_PROPERTY_ID_MIRADIA` | ミラディアの GA4 プロパティID |

`GA4_SERVICE_ACCOUNT_JSON` がなければ全サイトサンプル fallback。あっても個別 `GA4_PROPERTY_ID_*` がないサイトは当該サイトだけサンプル維持 (画面の `stats.meta.warnings` にメッセージ記録)。

### Search Console (Phase 3B — 実装・連携済み)

`scripts/fetch-dashboard-data.mjs` に実装済み。**専用の Secrets / env は不要**:

- 認証は **GA4 と同じサービスアカウント鍵** (`GA4_SERVICE_ACCOUNT_JSON`) を使い、
  scope `webmasters.readonly` のトークンを `google-auth-library` で取得して
  webmasters/v3 REST を直接叩く (重量級の `googleapis` パッケージは不使用)。
- SC プロパティ識別子はハードコードせず、**起動時に `sites.list` を 1 回呼び、
  各サイトのホスト名 (site.url 由来、www 無視) でマッチして動的解決**する。
  `sc-domain:` プロパティを優先し、なければ URL プレフィックスのホスト一致。
- 解決できない / SC 取得に失敗したサイトは `searchSource: 'none'` として続行し、
  GA4 取得や全体の実行は落とさない (warning を `stats.meta.warnings` に記録)。
- 旧 `SEARCH_CONSOLE_SERVICE_ACCOUNT_JSON` / `SEARCH_CONSOLE_SITE_*` は**廃止**。

前提 (設定済み): Google Cloud プロジェクトで **Search Console API を有効化**し、
サービスアカウントメールを各 SC プロパティに追加しておくこと
(未追加のプロパティは sites.list に出ないため自動的に `none` になる)。

取得内容 (サイトごと、直近28日):
- `type=web`: 日別 clicks/impressions (56日分 → 前28日比較)、合計 CTR / 掲載順位、上位クエリ 10 件
- `type=discover`: 合計 impressions / clicks → `discover.listed` (表示>=1 で true)
- GA4 追加クエリ (`pageReferrer`): サイト内回遊 PV 割合 `internalNavShare` (0〜1)

### Phase 3A の stats JSON 構造

`public/data/dashboard-latest.json` には既存 UI 互換の `sites[]` に加え、`stats` が追加される (Phase 3A 以降):

```json
{
  "generatedAt": "...",
  "sites": [ /* 既存 UI 用 (GA4 + Search Console live。searchSource/discover/internalNavShare 付き) */ ],
  "stats": {
    "generatedAt": "...",
    "dataRange": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "days": 90 },
    "meta": { "warnings": [], "source": "ga4" | "sample" | "mixed" },
    "siteStats": [
      {
        "siteId": "ainitoryu",
        "totals": { "views7d": 0, "views28d": 0, "views90d": 0, "users28d": 0, "sessions28d": 0, "avgEngagementRate28d": 0 },
        "dailySiteStats": [ { "date": "YYYY-MM-DD", "views": 0, "users": 0, "sessions": 0, "engagedSessions": 0, "engagementRate": 0 } ],
        "pageStats":   [ { "path": "/", "title": "...", "views7d": 0, "views28d": 0, "views90d": 0, "users28d": 0, "sessions28d": 0 } ],
        "channelStats":[ { "channel": "Organic Search", "views": 0, "users": 0, "sessions": 0 } ],
        "deviceStats": [ { "device": "mobile", "views": 0, "users": 0, "sessions": 0 } ],
        "trendScores": [ { "path": "/", "title": "...", "views7d": 0, "views28d": 0, "views90d": 0, "trendScore": 1.0 } ],
        "source": "ga4" | "sample",
        "fetchedAt": "..."
      }
    ]
  }
}
```

詳細は [`src/types/dashboard.ts`](src/types/dashboard.ts) を参照。`stats` はオプショナル (`?:`) なので、未取得時は省略可。既存 UI は `stats` を参照していないので破壊的変更はなし。

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

> **注 (完了済み)**: Phase 3A/3B は連携済みのため、このチェックリストは初期セットアップ時の記録。
> 新環境に移設する場合の手順書として残している。

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
- [ ] ⚠️ **GA4 の Secrets (env) はまだ設定しない** (このチェックリストを全部 ✅ にしてから初めて設定する。先に設定するとライブデータが流れ始めてしまう。Search Console 専用 Secrets は Phase 3B で廃止済み — GA4 と同じ鍵で動く)
- [ ] **サービスアカウントは GA4 / Search Console プロパティに「閲覧者」権限のみ付与** (編集権限はNG)

このチェックリストをすべて ✅ にしてから初めて GA4 credentials を設定してライブ取得を開始する。

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

## フェーズ進捗 (Phase 3: 実 API 連携 — 完了)

- **Phase 3A (GA4)**: 実装・連携済み。GA4 Data API で PV / users / sessions /
  topPages / risingPages / dailyViews / チャネル / デバイス / 記事動性を取得。
- **Phase 3B (Search Console)**: 実装・連携済み。上記「Search Console」節のとおり、
  GA4 と同じ鍵 + `webmasters.readonly` + `sites.list` 動的解決で
  検索メトリクス / 上位クエリ / Discover 掲載状況 / 内部流入割合を取得。
  専用 Secrets (`SEARCH_CONSOLE_*`) は不要になったため廃止。
- 運用は GitHub Actions ではなく **0 円ローカル自動更新**
  (Windows タスクスケジューラ → `npm run deploy:local`) が主経路。
