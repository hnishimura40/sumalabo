# Preview承認ボタン（preview/* ブランチ → main マージ）

すまラボの記事ページに表示される「この記事を承認して公開」ボタンの仕組みと運用メモ。

## 仕組み（一行で）

Cloudflare Pages Preview の記事ページに置いたボタンを押すと、Cloudflare Pages Functions（`/api/approve-preview`）がサーバー側で GitHub API を叩き、対応する `preview/*` → `main` の open PR を merge する。

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
