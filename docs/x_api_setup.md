# X API セットアップ手順書（L2: Phase C の API 移行）

ユーザー本人が行う手動作業の手順書。developer 登録・アプリ作成・キー発行は規約同意を
伴うため、Claude は代行しない。**キーの値はチャットに貼らない**こと。

## 現行の提供条件（2026-07-04 実測）

- **無料枠は廃止済み**（2026-02-06 以降、新規は pay-per-use のみ）
- **前払いクレジット制**: Developer Console でクレジットを事前購入
- 投稿単価: **$0.015/件、URL 付き投稿は $0.20/件**（すまラボの投稿は常に URL 付き）
- すまラボの想定コスト: 週 1〜2 投稿 × $0.20 ≒ **月 $0.8〜1.6 程度**
- 認証: 投稿（POST /2/tweets）はユーザーコンテキスト必須。本実装は **OAuth 1.0a**
  （Consumer Keys + Access Token/Secret の固定 4 キー。リフレッシュ不要で無人運転向き）
- 料金は変わりやすい。**購入前に Developer Console の現行表示を必ず確認**

## 手動作業（画面単位）

1. **developer アカウント登録**
   - https://developer.x.com/ を開き、@suma_labo でログイン
   - 「Sign up for pay-per-use」（または Developer Portal への案内）から登録。利用目的は
     「自サイトの新着記事を自分のアカウントに投稿する自動化」の趣旨で回答
2. **クレジット購入**
   - Developer Console の Billing / Credits 画面で前払いクレジットを購入
   - （金額は任意。まず最小額でよい。単価表示をこの画面で再確認する）
3. **アプリ作成**
   - Developer Portal → Projects & Apps → 既定 Project 内に App を作成（名前例: sumalabo-poster）
4. **権限設定（重要）**
   - App の Settings → User authentication settings → Set up
   - **App permissions: Read and write** を選択（投稿に必須。既定の Read only では 403 になる）
   - Type of App: Web App / Automated App or Bot
   - Callback URI / Website URL: `https://sumalabo.com/`（OAuth 1.0a の固定トークン利用では実際には使わないが必須入力）
5. **キー発行（4 つ）**
   - App の Keys and tokens タブで:
     - **API Key / API Key Secret**（= Consumer Key / Secret）を Regenerate → 控える
     - **Access Token and Secret** を Generate（permissions が Read and write になってから生成すること。
       権限変更前に作った Token は Read only のままなので、その場合は Regenerate）
6. **ローカル保存（チャットに貼らない）**
   - リポジトリ直下に `.secrets/x-api.env` を作成し（`.secrets/` は gitignore 済み）、次の 4 行を保存:
     ```
     X_API_CONSUMER_KEY=（API Key）
     X_API_CONSUMER_SECRET=（API Key Secret）
     X_API_ACCESS_TOKEN=（Access Token）
     X_API_ACCESS_TOKEN_SECRET=（Access Token Secret）
     ```
7. **Actions secrets への転送（値は表示されない）**
   - `npm run x:sync-secrets` を実行 → `.secrets/x-api.env` を読み、`gh secret set` で
     GitHub Actions secrets（同名 4 つ）へ登録する。値は stdout に一切出さない
8. **ローカルファイルの扱いを決める**
   - 転送後、`.secrets/x-api.env` を「残す（ローカル実行にも使う）」か「消す（Actions のみで使う）」かを
     Claude に指示する。既定では残す（ローカルからの Phase C 実行に必要）

## 動作確認の段取り

1. `npm run x:post-api -- --slug <slug> --dry-run` — リクエスト組み立てまで（送信なし）
2. **初回実投稿は、次の新記事のユーザー承認済み Phase C 内で行う**（タイムラインを汚さないため
   テスト投稿はしない）
3. 成功を確認したら、ユーザーが `data/automation/autonomy.json` の `xPostMethod` を `"api"` に変更
   （Claude は勝手に変更しない）

## 誤投稿時の是正

- `npm run x:delete -- --id <tweetId> [--slug <slug>] [--reason <why>]`
- 削除は incident（`x_post_deleted`）として autonomy.json に記録される（error budget 対象）
