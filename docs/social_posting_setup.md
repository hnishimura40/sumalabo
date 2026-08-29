# Threads / Bluesky 自動投稿の設定

夜間runは、主契約と検索更新通知の後、X工程の前に `social-post-step.mjs` を実行する。ThreadsとBlueskyは公式HTTP APIだけを使用し、片方の失敗はもう片方および本体runへ影響しない。認証情報がないplatformは `skipped(未設定)` になる。

## 必要な環境変数

| platform | 変数 | 内容 |
| --- | --- | --- |
| Threads | `THREADS_USER_ID` | Threads API user ID |
| Threads | `THREADS_ACCESS_TOKEN` | `threads_basic` と `threads_content_publish` を持つ長期user token |
| Bluesky | `BLUESKY_HANDLE` | 投稿アカウントのhandle |
| Bluesky | `BLUESKY_APP_PASSWORD` | Bluesky設定画面で発行したアプリパスワード |

値はリポジトリや `.env` へ書かない。同じWindowsユーザーで次を対話実行する。

```powershell
npm run social:set-secrets
```

登録後に起動するプロセスとタスクスケジューラはユーザー環境変数を読み取る。確認時も値そのものは表示せず、変数が存在するかだけを確認する。

## ローカルstate

- `%USERPROFILE%\.sumalabo\state\social-posted.json`: `platform × slug` の二重投稿防止台帳
- `%USERPROFILE%\.sumalabo\state\threads-token.json`: Threadsの自動refresh後tokenと有効期限。リポジトリ外のユーザー専用state

Threadsは投稿ごとに `refresh_access_token` を呼び、返されたtokenと有効期限をstateへ保存する。期限切れなどでrefresh不能になった場合は投稿せず、警告に「トークン更新が必要」を含める。その場合はMeta側で長期tokenを再発行し、`npm run social:set-secrets` を再実行する。

## 手動確認

認証設定前（安全なskip確認）:

```powershell
node scripts/automation/social-post-step.mjs --slug=<slug> --output=<result.json>
```

認証設定後は、未投稿の公開済みslugを指定すると実投稿になる。二重投稿台帳に同じplatform・slugがある場合は `skipped(既投稿)` になる。
