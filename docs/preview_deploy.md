# Preview deploy 戦略 (PR ブランチ単位の動作確認)

## 背景 — PR #40 で発覚した問題

2026-05-12、PR #40 (Galaxy S27 Ultra 記事) で `notifyReviewReady` が
`previewUrl: https://sumalabo.com/articles/{slug}/` を購読者に通知したが、
このリポジトリの Cloudflare Pages 構成は **GitHub Apps 連携を使っておらず**、
PR ブランチごとの preview deploy が生成されない。

結果、購読者がリンクを開いても以下のような Astro の SPA fallback が返り、
記事本文は表示されない:

```
HTTP/2 200
<title>すまラボ</title>
(galaxy-s27 本文なし、参考情報なし、slug なし)
```

承認運用 (購読者が Preview を確認して "OK" を押すフロー) が成立しないため、
PR #40 は `preview_unavailable` 扱いに降格し、merge せず保留している。

## 現在の Cloudflare 構成

- Production project: `sumalabo.pages.dev` / `sumalabo.com`
- Production branch: `main`
- Deploy 起点: `.github/workflows/scheduled-deploy.yml` の cron (`7,37 * * * *`)
  が `CF_PAGES_DEPLOY_HOOK_URL` を curl で叩く方式
- GitHub Apps 連携 (Source = GitHub) **未使用**
- そのため Pull Request preview / branch preview は自動生成されない

## 対応案

### A. Cloudflare Pages の GitHub 連携を有効化する (推奨)

CF ダッシュボードで一度だけ設定する。それ以降は PR を作るたびに
preview deploy が自動生成され、`gh pr view ... --json statusCheckRollup`
に Cloudflare の `detailsUrl` (= preview URL) が現れる。

最小手順 (CF ダッシュボード):

1. Cloudflare Dashboard → Workers & Pages → 既存プロジェクト `sumalabo`
2. **Settings → Builds & deployments → Branch deployments**
   - Production branch: `main` (現状維持)
   - Preview branches: "All non-Production branches" を選択
3. **Settings → Builds & deployments → Build configuration**
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Node version: 22.12.0 以上 (env var `NODE_VERSION=22.12.0`)
4. **Settings → General → Source** (Git repo) を GitHub に接続
   - 既に deploy hook 方式で動いている場合、GitHub 連携を追加すると
     dual-source になる可能性がある。dashboard 上で hook と GitHub の
     どちらが優先かを確認し、必要なら deploy hook をオフにする。
5. 接続後、PR を新規 push → 1〜3 分で
   `https://<branch-slug>.sumalabo.pages.dev/` が生成され、
   `gh pr view {N} --json statusCheckRollup` に `cloudflare-pages` の
   check が現れる。

確認:

```bash
gh pr view 40 --json statusCheckRollup --jq '.statusCheckRollup[] | select(.context | test("Cloudflare|pages"; "i"))'
```

### B. `wrangler pages deploy` で Claude Code から preview を生成する

CF dashboard 設定を変えずに、PR の build artifact を direct upload する案。

前提:

1. `npm install -D wrangler` (DevDep に追加)
2. CF API token を発行
   - Cloudflare Dashboard → My Profile → API Tokens → Create Token
   - Template: "Edit Cloudflare Workers" (Pages:Edit を含む)
   - 環境変数 `CLOUDFLARE_API_TOKEN` に設定
3. CF Account ID を控える (env `CLOUDFLARE_ACCOUNT_ID`)

実行 (CI / Claude Code から):

```bash
npm run build
npx wrangler pages deploy dist \
  --project-name=sumalabo \
  --branch=auto/imported-202605-galaxy-s27-ultra-camera-bar-redesign-3x-t-202605121348
```

出力に `https://<commit-hash>.sumalabo.pages.dev/` という direct URL と
`https://<branch-slug>.sumalabo.pages.dev/` の alias URL が含まれる。

注意:

- production deploy を上書きしないよう、必ず `--branch` を **`main` 以外**
  にする (上の例では `auto/imported-...`)。
- `main` を `--branch` に渡すと production 反映されるため絶対に渡さない。
- import-generated 側でこれを呼ぶ場合は、`--branch` を `branchName`
  (`auto/imported-...`) で固定する。

### C. preview 専用 CF Pages project を別途作る

A / B のいずれも難しい場合の最終手段。production project と分けて
`sumalabo-preview.pages.dev` を作り、そこに常時 latest preview を上書きデプロイする。
URL が固定 (`https://sumalabo-preview.pages.dev/articles/{slug}/`) になるが、
直前の preview を上書きするため履歴が残らない、Approval UI のリンク先が
1 つしかない、という難点がある。

## 採用方針

**A を採用。B は移行期間中のフォールバックとして実装余地を残す。**

理由:

- A は CF Pages の標準機能で、追加の secret 不要・追加コード不要。
- B は CI もしくは Claude Code 側で wrangler を保守する必要があり、
  CF Pages 側 cache invalidation / build context の再現に手間がかかる。
- C は履歴が消えるためレビュー運用に向かない。

## 補強: notifyReviewReady の事前検証

CF preview deploy が間に合わなかった場合の保険として、
`scripts/sumahon/verify-preview-url.mjs` で:

- HTTP ステータス 200 系
- `<title>` が "すまラボ" だけの SPA fallback でない
- レスポンス本文に slug が含まれる
- レスポンス本文に `## 参考情報` または記事タイトル冒頭が含まれる

を満たさない場合は **notifyReviewReady を呼ばず**、queue を
`preview_unavailable` に降格する。`scripts/run/import-generated.mjs` に組み込み済み。
