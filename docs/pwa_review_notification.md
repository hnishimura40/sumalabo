# PWAレビュー画面 + Web Push通知

すまラボ自動化が新しい Preview 記事を作ったとき、iPhone のホーム画面に追加した PWA から記事確認・承認できるようにする仕組みのドキュメント。

## 全体像

```
[Windows タスク / Claude Code]
       │
       │ 自動処理で記事生成・サムネ生成・Preview push・PR作成 完了
       │
       ▼
POST /api/push/notify-review-ready
   (REVIEW_NOTIFY_SECRET 必須)
       │
       ├── KVへ review:item:{slug} と review:index を upsert
       └── KVに保存済みの全 Web Push 購読へ VAPID 署名付きで通知送信
       │
       ▼
[Service Worker] /sw.js
   - push イベントで通知表示
   - notificationclick で /review/ または Preview 記事URLへ遷移
       │
       ▼
[ホーム画面PWA] /review/
   - GET /api/review-items で確認待ち一覧を表示
   - 「記事を見る」ボタンで Preview 記事へ
   - 承認は Preview 記事ページ末尾の「この記事を承認して公開」ボタンから
```

## 構成ファイル

| ファイル | 役割 |
|---|---|
| `public/site.webmanifest` | PWAマニフェスト。`start_url: /review/?utm_source=pwa`、レビューshortcut追加、maskableアイコン |
| `public/sw.js` | Service Worker。`push` 受信で通知表示、`notificationclick` で画面遷移 |
| `src/pages/review.astro` | 確認待ち記事一覧画面と「通知を有効にする」UI |
| `functions/api/review-items.ts` | GET（一覧）／POST（登録、secret必須） |
| `functions/api/push/subscribe.ts` | Web Push subscription を KV に保存 |
| `functions/api/push/notify-review-ready.ts` | VAPID 署名付きで全購読へ通知。オプションで KV に item 登録 |

## 必要な Cloudflare 環境変数

Cloudflare Pages → Settings → Environment variables（Production と Preview の両方に登録推奨）

| 変数名 | 必須 | 用途 |
|---|---|---|
| `SUMALABO_REVIEW_KV` | 必須（KV binding） | review items と push subscriptions の保存先 |
| `REVIEW_NOTIFY_SECRET` | 必須 | 自動処理側がレビュー登録・通知送信 API を呼ぶときの共有秘密 |
| `VAPID_PUBLIC_KEY` | 必須 | base64url、未圧縮 P-256 公開鍵（65バイト、先頭 0x04） |
| `VAPID_PRIVATE_KEY` | 必須 | base64url、P-256 秘密鍵スカラー（32バイト） |
| `VAPID_SUBJECT` | 必須 | VAPID JWT の `sub`。`mailto:you@example.com` または `https://sumalabo.com/` 等 |

### VAPID鍵の作り方（一例）

ローカルで `web-push` CLI が使える環境なら：

```
npx web-push generate-vapid-keys
```

出力された `Public Key` / `Private Key` を Cloudflare の環境変数に設定する。

### KV namespace の作成と binding

```
wrangler kv:namespace create SUMALABO_REVIEW_KV
# → 生成された id をメモ
```

Cloudflare Pages の Settings → Functions → KV namespace bindings に
`Variable name: SUMALABO_REVIEW_KV` で id を紐付け。

## iPhoneでホーム画面に追加する手順

1. Safariで `https://sumalabo.com/review/` を開く（または本番ドメインの `/review/`）
2. 共有メニュー → 「ホーム画面に追加」
3. 名前は「すまラボ」のまま、追加
4. ホーム画面の「すまラボ」アイコンをタップ → 全画面PWAとして起動

## 通知を許可する手順

1. ホーム画面PWAで `/review/` を開く（スタートURLが `/review/` なので起動と同時）
2. 「通知を有効にする」ボタンをタップ
3. iOS の権限ダイアログで「許可」をタップ
4. 「通知を有効にしました。」のステータスが出れば購読完了
5. 以降、自動処理が通知トリガーAPIを叩くと iPhone のロック画面・通知センターに通知が出る
6. 通知をタップ → PWAが開き `/review/` または該当 Preview 記事へ遷移

注意：

- **iOS/iPadOS 16.4 以降のホーム画面追加版PWAでのみ通知可**。Safariブラウザの通常タブでは通知不可。
- 初回の権限ダイアログは「通知を有効にする」をタップしたユーザー操作の中で出る必要がある（自動で出ない）。

## 自動処理側からの呼び出し

### CLI から（推奨）

`scripts/run/notify-review-ready.mjs` を直接または `npm run sumahon:notify-review-ready` 経由で実行する。`REVIEW_NOTIFY_SECRET` は環境変数から読まれる。

```
REVIEW_NOTIFY_SECRET=<secret> \
npm run sumahon:notify-review-ready -- \
  --slug 202605-xxx \
  --title "..." \
  --branch preview/xxx \
  --previewUrl "https://<host>/articles/202605-xxx/" \
  --prUrl "https://github.com/.../pull/N" \
  --thumbnail "/images/thumbnails/202605-xxx.png" \
  --sourceCheckPassed true
```

`logs/preview/{slug}.notify.json` にAPIレスポンスが保存され、終了コードは以下のとおり：

- `0` … 通知送信成功（API側 `ok: true`）
- `2` … 通知が送れなかったが致命ではない（`REVIEW_NOTIFY_SECRET` 未設定、接続失敗、401など）
- `1` … 引数エラー等で実行不能

呼び出し元（Windowsタスク等）は `2` を **warning** として扱い、後続を継続できる。

### `article:import-generated` からの自動呼び出し

`npm run article:import-generated` の **commit/push 完了直後** に、内部で `notifyReviewReady()` がベストエフォートで呼ばれる。失敗してもimport自体は成功扱いのまま継続する。`logs/preview/{slug}.notify.json` に結果を保存し、最終出力JSONに `notifySent` / `notifySkipped` / `notifySubscribers` / `notifyDelivered` / `notifyFailed` / `notifyLogPath` が含まれる。

ローカルから実行する場合、以下の環境変数を設定しておく：

```
REVIEW_NOTIFY_SECRET=<secret>            # 必須（未設定だと自動でskipされる）
REVIEW_NOTIFY_API_URL=https://sumalabo.com/api/push/notify-review-ready  # 任意（既定この値）
SUMALABO_PREVIEW_BASE_URL=https://sumalabo.com  # 任意（previewUrl組立用）
SUMALABO_PR_URL=https://github.com/hnishimura40/sumalabo/pull/123  # 任意（既知ならcommit時に渡せる）
```

## Windows タスクからの直接呼び出し（手動 / 緊急用）

`article:import-generated` 経由で通知がスキップされたとき、または別フローで通知だけ送りたいときに使う。

PowerShell の例：

```powershell
$secret = $env:REVIEW_NOTIFY_SECRET
$body = @{
  secret = $secret
  item = @{
    slug = "202605-iphone-18-pro-dynamic-island-top-left-rumor"
    title = "iPhone 18 Pro、Dynamic Islandはあんまり変わらない？普通の人向けに要点を整理"
    branch = "preview/iphone-18-dynamic-island-rumor"
    previewUrl = "https://<preview-host>/articles/202605-iphone-18-pro-dynamic-island-top-left-rumor/"
    prUrl = "https://github.com/hnishimura40/sumalabo/pull/17"
    thumbnail = "/images/thumbnails/202605-iphone-18-pro-dynamic-island-top-left-rumor.png"
    status = "review"
    sourceCheckPassed = $true
  }
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Method Post -Uri "https://sumalabo.com/api/push/notify-review-ready" `
  -Headers @{ "X-Notify-Secret" = $secret; "Content-Type" = "application/json" } `
  -Body $body
```

bash の例：

```bash
curl -X POST "https://sumalabo.com/api/push/notify-review-ready" \
  -H "X-Notify-Secret: $REVIEW_NOTIFY_SECRET" \
  -H "Content-Type: application/json" \
  -d @- <<'JSON'
{
  "secret": "...",
  "item": {
    "slug": "...",
    "title": "...",
    "branch": "preview/...",
    "previewUrl": "https://.../articles/.../",
    "prUrl": "https://github.com/.../pull/N",
    "thumbnail": "/images/thumbnails/....png",
    "sourceCheckPassed": true
  }
}
JSON
```

API はレスポンスとして `{ ok, sent, failed, subscribers, item, title, previewUrl, prUrl, failuresSample }` を返す。`failed` が 0 でない場合は `failuresSample` を見て購読切れ（404/410 はKVから自動削除）等を確認する。

## Preview 承認ボタンとの関係

- 通知 → `/review/` または Preview 記事URLへ遷移
- 承認は Preview 記事ページ末尾の「この記事を承認して公開」ボタンから（既存実装）
- そのボタンが `/api/approve-preview` を叩いて PR を main にマージ
- マージ後、本番ビルドが走り、本番反映

PWA 側で承認操作そのものを行わないのは、

1. Preview 記事ページで実際の見た目を確認してから承認したいため
2. 承認 API（`/api/approve-preview`）がブランチ名チェックを行うため、Preview記事ページ側に寄せたほうが自然

## セキュリティ

- `VAPID_PRIVATE_KEY` / `REVIEW_NOTIFY_SECRET` は **Functions 側でのみ参照**。`PUBLIC_` プレフィックスは使わない
- `VAPID_PUBLIC_KEY` は client にも出るが、これは公開してよい値（subscribe 用）
- `/api/push/notify-review-ready` は `REVIEW_NOTIFY_SECRET` がないと拒否
- `/api/review-items` の **GET** は将来 Cloudflare Access / Basic Auth でガード可能（個人運用なのでまずは未保護でよい）
- 通知はpayloadなしで送るため、機密情報は通知本文に含まれない。詳細はService WorkerからAPI再取得で表示

将来パスコードロックを足す場合は、`/review/` ページの最上段にパスフレーズ入力＋localStorage判定を入れる、または Cloudflare Access の Application を `/review/` パスに設定する。

## 失敗時の確認ポイント

| 症状 | 主な原因 | 対処 |
|---|---|---|
| 「VAPID公開鍵が未設定です。」 | `VAPID_PUBLIC_KEY` がCloudflareに無い、またはビルド時に渡っていない | 環境変数を設定して再デプロイ |
| 「通知許可が得られませんでした。」 | iOS側でブラウザ通知拒否、または旧Safariで開いた | ホーム画面追加版PWAで開き直して再試行 |
| 「購読の保存に失敗しました」 | KV namespace 未binding | Cloudflare Pages の Functions → KV bindings 設定 |
| 通知が来ない（API は ok 返す） | iOS デバイスがロックされていて Apple Push Notification Service が遅延 | 数分待つ、画面起こす |
| `sent=0, failed=N` | 古い購読が全て gone (404/410) | 通知許可をやり直して再subscribe |
| 401「secret一致しません」 | `REVIEW_NOTIFY_SECRET` が一致していない | 環境変数とリクエストヘッダーを再確認。下記の `/api/push/check-secret` で一致確認 |
| `failures` に複数のpush serviceエラー | VAPID JWT が拒否されている／鍵不一致 | `VAPID_PUBLIC_KEY` と `VAPID_PRIVATE_KEY` がペアか再確認 |

## secretの一致確認（`/api/push/check-secret`）

Cloudflare 側の Secret 値は管理画面で表示できないため、ローカル側で持っている `REVIEW_NOTIFY_SECRET` と Cloudflare に登録された値が一致しているかは目視で確認できない。これを安全に確認するための専用エンドポイント `POST /api/push/check-secret` を用意している。

このエンドポイントは秘密値そのものは絶対に返さない。`headerLength` と `envSecretLength` だけ返すため、PowerShell 側の文字列に空白や改行が混ざっていないかも分かる。

### curl

```
curl -X POST https://sumalabo.com/api/push/check-secret \
  -H "X-Notify-Secret: $REVIEW_NOTIFY_SECRET"
```

### PowerShell

```powershell
Invoke-RestMethod -Method Post -Uri "https://sumalabo.com/api/push/check-secret" `
  -Headers @{ "X-Notify-Secret" = $env:REVIEW_NOTIFY_SECRET }
```

### 返り値の読み方

| 返り値 | 意味 | 対処 |
|---|---|---|
| `{ ok: true, matched: true, headerLength: n, envSecretLength: m }` | 一致 | OK。`/api/push/notify-review-ready` が動くはず |
| `{ ok: false, matched: false, headerLength: n, envSecretLength: m }` (HTTP 401) | 不一致 | n と m を比べる：等しいなら中身違い、違えば改行・空白混入の可能性 |
| `{ ok: false, envSecretConfigured: false }` (HTTP 500) | Cloudflare側未設定 | Cloudflare Pages → Settings → Environment variables に `REVIEW_NOTIFY_SECRET` を登録（Preview/Production 両方を推奨） |

`headerLength` と `envSecretLength` は **文字数のみ** で、内容そのものや先頭/末尾の文字、hash値は一切返さない。比較は定数時間で行うため、長さ違いによるタイミング差で値を推測できないようになっている。

## 既知の制限

- 本実装は **payload なし Web Push**（VAPID 認証のみ）。通知本文の動的内容（記事タイトル等）は Service Worker で `/api/review-items` を再取得する形にすると、通知バナーに直接出せる。
- 通知バナーに記事タイトルを出すには RFC8291 のペイロード暗号化（aes128gcm + ECDH）が必要。Cloudflare Workers の Web Crypto で実装可能だが、本実装では省略している。
- バナー本文を固定文言「確認待ちの記事があります」にしているのはこの理由。

## 関連ドキュメント

- `docs/preview_approval_button.md` — Preview記事ページ末尾の承認ボタン
- `docs/uwsc_chatgpt_file_attach_test.md` — 自動化サムネ生成フロー
