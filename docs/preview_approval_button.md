# Preview承認ボタン（preview/* ブランチ → main マージ）

すまラボの記事ページに表示される「この記事を承認して公開」ボタンの仕組みと運用メモ。

> **2026-05-27 update — user-directed mode + Human Review Checkpoint：** 現在の標準フローでは、**Phase A 完了時点で Claude が必ず停止し、ユーザーの明示了承（チャット返答）後に Claude 側から `gh pr merge` → `wrangler fallback deploy` → strict verify → X 投稿まで自動実行する** 流れになっています。承認ボタン経由のフローは **既存記事の補助手段** として残しますが、新規記事の標準フローではありません。詳細: [`docs/user_directed_mode.md`](user_directed_mode.md) / [`docs/x_post_workflow.md`](x_post_workflow.md) / [`docs/queue_states.md`](queue_states.md)

## 仕組み（一行で）

Cloudflare Pages Preview の記事ページに置いたボタンを押すと、Cloudflare Pages Functions（`/api/approve-preview`）がサーバー側で **GitHub API で PR merge → Cloudflare Pages Deploy Hook 発火** を順に実行し、その後フロントが **`/api/verify-publication?slug=...` を polling して本番反映を厳格に確認** する。verify が pass した時点で KV review item の status が `published` に更新され、ボタンが「公開完了」に確定する。

```
[承認ボタン押下]
     ↓
[POST /api/approve-preview]
     ├─ GitHub API で PR を merge
     ├─ Cloudflare Pages Deploy Hook を fetch (GitHub Actions 非依存)
     │   ├─ 成功 → KV: status="approved" + deployTriggered=true + deployTriggeredAt
     │   └─ 失敗 → KV: status="approved_deploy_pending" + needsWranglerFallback=true
     └─ レスポンスに needsWranglerFallback / fallbackCommandHint を載せる
     ↓
[フロントが /api/verify-publication?slug=… を 10s ごと polling (最大 6 分)]
     ├─ HTTP 200 / title / slug / body / thumbnail / fallback判定 / index掲載 をチェック
     ├─ 全 pass → KV を status: "published" + publishedAt + productionUrl に更新
     ├─ deployTriggered=false → 即座に status="approved_deploy_pending" + wrangler fallback 案内
     ├─ deployTriggeredAt から DEPLOY_PENDING_TIMEOUT_MS (default 6分) 経過 & verify 未成功
     │     → status="approved_deploy_pending" + wrangler fallback 案内
     ├─ HTTP 200 だが fallback (deploying) → 続行
     └─ HTTP 5xx / 4xx → failed (KV に publicationVerifyError を記録)
```

**重要 (1)**: HTTP 200 だけでは公開成功扱いにしない。homepage fallback (`<title>すまラボ</title>` で記事 body / thumbnail が無い状態) は `deploying` として再 polling する。

**重要 (2)**: Cloudflare Pages の **Git 連携が壊れている** ケース (「The repository cannot be accessed」「Cloning git repository — FAILED」) では、Deploy Hook 経由の production deploy が成立しない。このため:

- approve-preview が deploy hook 発火失敗を検出した場合、または verify-publication が deployTriggeredAt 経過後も未成功と判断した場合、レスポンスに `needsWranglerFallback: true` / `fallbackCommandHint: "node scripts/automation/deploy-production-from-main.mjs --slug=<slug>"` を含める
- フロント側はその時点で polling を停止し、「**承認とPR mergeは完了しましたが、本番反映が未確認です。wrangler fallback が必要です**」を表示する。X 投稿フローには進めない
- 運用者は手元で `npm run deploy:production:fallback -- --slug=<slug>` を実行し、wrangler 経由で再 deploy → strict verify 完了後にのみ KV を published 化

## Wrangler fallback の使い方

Cloudflare Pages Git 連携が「Cloning git repository — FAILED」状態の暫定運用として、`scripts/automation/deploy-production-from-main.mjs` を提供する。

### 前提

- ローカルで `git switch main && git pull --ff-only origin main` 済み（main HEAD と origin/main が一致）
- `CLOUDFLARE_API_TOKEN` 環境変数が設定済み（**値は表示しない**）
- 任意で `CLOUDFLARE_ACCOUNT_ID` 環境変数

### 通常実行（dry-run で先に検査）

```sh
# 事前検査のみ (git sync / build / dist 検査だけ、wrangler は走らせない)
node scripts/automation/deploy-production-from-main.mjs --slug=<slug> --dry-run

# 本番反映
node scripts/automation/deploy-production-from-main.mjs --slug=<slug>
# = npm run deploy:production:fallback -- --slug=<slug>
```

### 処理ステップ

1. `git fetch origin main` → ローカル HEAD と origin/main の一致確認（zonbie diff の警告のみ、致命ではない）
2. `npm run build` → `dist/` 生成
3. `dist/articles/{slug}/index.html` / `dist/articles/index.html` / `dist/index.html` / `dist/images/thumbnails/{slug}.*` の存在を必須チェック
4. `wrangler pages deploy dist --project-name=sumalabo --branch=main --commit-dirty=true` を実行（dry-run のときはスキップ）
5. `/api/verify-publication?slug=<slug>` を 10 秒間隔で polling し、`status: "published"` を確認

### 終了条件

- 全 step OK → exit 0、stdout に `RESULT JSON` を出力（slug / productionUrl / steps 詳細）
- いずれか failure → exit 1、`errorReason` に最初の失敗段階を記録
- 引数エラー → exit 2

### 主要オプション

| オプション | 用途 |
|---|---|
| `--slug=<slug>` | **必須**。dist 検査対象 |
| `--dry-run` | wrangler 実行をスキップ。事前検査だけ通したいとき用 |
| `--skip-build` | 直前に build 済みのテスト用 |
| `--skip-git-sync` | CI 等で既に main 上にいる前提のときだけ |
| `--no-verify` | deploy 後の verify polling をスキップ |
| `--verify-url=URL` | verify endpoint を明示指定 (default `https://sumalabo.com/api/verify-publication?slug=<slug>`) |
| `--verify-timeout-ms=N` | verify polling の合計タイムアウト (default 360000 = 6 分) |
| `--output=PATH` | result JSON の保存先 (stdout には常に出る) |

### 禁止事項

- ❌ main への直接 push はしない（main は既に approve-preview が merge 済み）
- ❌ 記事生成は行わない
- ❌ X 投稿はしない（**verify 成功後に別フローで実行**）
- ❌ queue.json を直接書き換えない（verify-publication が KV → queue 同期する想定）
- ❌ `CLOUDFLARE_API_TOKEN` / Deploy Hook URL / secret の値を ログ / result JSON に出さない（存在フラグ true/false のみ）

## どこでボタンが表示されるか

ボタンは記事ページ（`/articles/{slug}/`）の本文末尾とナビゲーションの間に出る。表示条件はビルド時に決まる。

| 環境 | ビルド時の `CF_PAGES_BRANCH` | ボタン表示 |
|---|---|---|
| 本番 main | `main` | 出さない |
| Cloudflare Preview（feature/* など） | `feature/xxx` | 出さない（`preview/` で始まらないため） |
| Cloudflare Preview（preview/*） | `preview/xxx` | **出す** |
| ローカル `npm run dev` / `npm run build` | 未設定 | 出さない |
| 手動オーバーライド | `PREVIEW_BRANCH_OVERRIDE=preview/xxx` をビルド時に渡す | 出す（ローカル動作確認用） |

`APPROVE_ALLOWED_BRANCH_PREFIX`（環境変数）を変えれば、許可するプレフィックスを切り替えられる（既定値 `preview/`）。

## 必要な Cloudflare Pages 環境変数

Cloudflare Pages の **Settings → Environment variables** で以下を設定する。Preview 環境（必要に応じて Production）両方に登録できる。

| 変数名 | 必須 | 既定値 | 用途 |
|---|---|---|---|
| `GITHUB_TOKEN` | 必須 | なし | GitHub API を叩くための fine-grained personal access token / GitHub App installation token。**Pull requests: Read and Write** 権限を `hnishimura40/sumalabo` リポジトリだけに付与する最小権限を強く推奨。 |
| `GITHUB_OWNER` | 任意 | `hnishimura40` | リポジトリオーナー名 |
| `GITHUB_REPO` | 任意 | `sumalabo` | リポジトリ名 |
| `APPROVE_ALLOWED_BRANCH_PREFIX` | 任意 | `preview/` | 承認対象として許可するブランチ名のプレフィックス。これ以外で始まるブランチはAPI側で拒否する |
| `CF_PAGES_DEPLOY_HOOK_URL` | **強く推奨** | なし | Cloudflare Pages の Deploy Hook URL。承認 API が PR merge 後に fetch(POST) で本番 deploy を発火する。**コード・ログ・レスポンスに値を含めない**。未設定なら `deployTriggered: false` を返し、手動 deploy が必要な旨フロントに表示される |
| `PRODUCTION_HOST` | 任意 | `sumalabo.com` | `/api/verify-publication` が verify 対象とする本番ホスト名 |
| `DEPLOY_PENDING_TIMEOUT_MS` | 任意 | `360000` (6 分) | `/api/verify-publication` が「wrangler fallback 必要」と判定するまでの deploy 経過時間 (ms)。60s〜30min にクランプ |

ボタン側の表示制御に使う変数:

| 変数名 | 必須 | 既定値 | 用途 |
|---|---|---|---|
| `CF_PAGES_BRANCH` | Cloudflare Pagesが自動で設定 | (Cloudflare側で自動付与) | ビルド時の現在ブランチ。これが `preview/` で始まる場合のみボタンを描画する |
| `PREVIEW_BRANCH_OVERRIDE` | 任意 | なし | ローカルでボタン表示を確認したいときだけ使う。例: `PREVIEW_BRANCH_OVERRIDE=preview/test npm run build` |

## トークンの注意

- **GitHubトークンをフロントエンドに絶対に出さないこと。** `PUBLIC_GITHUB_TOKEN` のような Astro の公開向け環境変数（`PUBLIC_` 接頭辞）は使わない。
- このリポジトリでも `PUBLIC_` プレフィックスは使っていない。`GITHUB_TOKEN` は Cloudflare Pages Functions 側でだけ参照する。
- 万が一トークン値が `import.meta.env.GITHUB_TOKEN` で読まれて HTML/JS に展開されると公開漏れになる。Astroは `PUBLIC_` 以外の変数を `import.meta.env` 経由でクライアントへは出さない設計だが、`functions/` 配下のコード以外で `GITHUB_TOKEN` を参照しないよう運用上注意する。
- トークンは GitHub の **fine-grained personal access token** または **GitHub App** を使い、`hnishimura40/sumalabo` 1リポジトリに対する `Pull requests: Read and Write` だけを与える最小構成にする。Repo全体権限や `repo` スコープのclassic PATは避ける。
- 失効や漏洩に備えて、定期的にローテーションする。

## 承認ボタンの使い方（運用フロー）

1. 記事を `preview/` で始まるブランチへ commit / push する（例: `preview/airpods-visual-siri`）。
2. その branch から main 向けに **open PR** を作成しておく。GitHub上で手動でも、`gh pr create` でもよい。Draft でない通常のPRにする。
3. Cloudflare Pages の Preview デプロイが完了するのを待つ（だいたい数分）。
4. Preview URL（例: `https://<deploy-id>.sumalabo.pages.dev/articles/{slug}/`）を開く。
5. 記事末尾に「この記事を承認して公開」ボタンが見える。文言・補助文・対象ブランチ名（`preview/...`）を確認する。
6. ボタンを押す。ボタンは即座に「承認中...」になり、二度押しはできない。
7. 結果が下のステータス欄に表示される。
   - 成功:「承認しました。本番反映を待っています。（PR #N）」
   - 失敗:理由メッセージ（PRが見つからない／コンフリクト／権限不足／他）
8. 成功したら GitHub 側で main に merge され、Cloudflare Pages の本番ビルドが走る。本番反映を待つ。

## サーバー側の検証ロジック

`functions/api/approve-preview.ts` で以下を順にチェックする。どれか1つ落ちたら拒否する。

- HTTPメソッドが POST であること
- リクエストボディが JSON で `branch` を含むこと
- branch が `main` / `master` でないこと
- branch が `APPROVE_ALLOWED_BRANCH_PREFIX`（既定 `preview/`）で始まること
- `GITHUB_TOKEN` が設定されていること
- GitHub API `GET /repos/{owner}/{repo}/pulls?head={owner}:{branch}&base=main&state=open` で対象 PR を取得できること
- 取得したPRが Draftでないこと
- GitHub API `PUT /repos/{owner}/{repo}/pulls/{pr_number}/merge` が成功すること（`merge_method: merge`）

成功・失敗ともに JSON で返す。失敗時の HTTPステータスは GitHub API のステータスをほぼ踏襲する。

## 失敗時の確認ポイント

| 表示メッセージ | 主な原因 | 確認すること |
|---|---|---|
| `GITHUB_TOKENがCloudflare Pagesに設定されていません。` | Cloudflare Pages Settingsで token未登録。Preview環境に登録忘れ。 | Cloudflare Pages → Settings → Environment variables を確認。Preview スコープに `GITHUB_TOKEN` を入れたか |
| `${branch} から main への open PR が見つかりませんでした。` | PRがそもそも作られていない／closeされている／base が main でない | GitHubで該当branchから main向けの open PR があるか |
| `PR #N はドラフト状態です。` | Draft PRはマージ不可 | GitHubで Ready for review にする |
| `mergeできない状態です（コンフリクト・必須チェック未完了など）。` | コンフリクト、CI失敗、required check未通過 | GitHub PR画面で Conflicts / Checks を確認 |
| `mergeコンフリクトが発生しています。` | mainとコンフリクト | ローカルで rebase / merge して push し直す |
| `GitHub tokenの権限が足りないか、ブランチ保護ルールでブロックされています。` | tokenのスコープ不足、main にブランチ保護で必須レビューが効いている等 | tokenのRepository permissions に Pull requests: Read and Write があるか／main の Branch protection の Required reviews 設定 |
| `PRが見つかりませんでした。` | branch名typo、PRが消えた | branch名を再確認 |
| `通信エラーで承認できませんでした。` | クライアント側のネットワーク／Pages Functions未デプロイ | Cloudflare Pages の Functions 一覧に `/api/approve-preview` が出ているか／ネットワーク疎通 |

## コスト（Cloudflare Workers Free 枠）

- Cloudflare Pages Functions は内部的に Cloudflare Workers として実行される。
- **Workers Free プラン**の上限（2024年時点で 100,000 リクエスト/日、CPU 10ms/リクエスト）の内側に収まる想定。
- 承認ボタンは記事公開判断時に1回だけ叩く運用なので、1日数回〜数十回のオーダーであれば Free 枠で十分。
- ただし、**Cloudflare Pages の Functions リクエストは Workers の無料枠を消費する**点は念のため意識する。Preview デプロイの数が増えても Function 自体の呼び出しは「ボタンを押した回数」だけなので、通常は問題にならない。

## ボタンを意図的に出さない／別場所に出すには

- 記事ページに出さない：`src/layouts/ArticleLayout.astro` から `<PreviewApprovalButton />` を外す。
- 記事ページの上部に置く：`<div class="article-content">` の **前** に `<PreviewApprovalButton />` を移動。
- 一覧／トップにも出す：そのレイアウト（`BaseLayout.astro` など）から `import` して描画。ただし最初の指示通り、まずは記事ページだけに限定。

## 関連ファイル

- `functions/api/approve-preview.ts` — Cloudflare Pages Function（POSTハンドラ）
- `src/components/PreviewApprovalButton.astro` — 承認ボタンコンポーネント（ライト/ダーク両対応）
- `src/layouts/ArticleLayout.astro` — 記事ページに上記コンポーネントを差し込む
- `docs/preview_approval_button.md` — 本ドキュメント

## 既存フローとの関係

- 記事生成 (`npm run article:prepare-from-sumahon` / `article:import-generated`)、Preview ブランチへの push、`npm run build` 等の既存自動化ステップは何も変えていない。
- ボタンは「Preview デプロイのHTMLに混ぜる」という追加レイヤーであり、記事生成パイプラインには介入しない。
- main ブランチでは表示自体されないため、本番運用に影響しない。
