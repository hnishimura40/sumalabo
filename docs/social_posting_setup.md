# Threads・Bluesky 自動投稿の認証セットアップ

夜間runは、ThreadsとBlueskyの認証をWindowsユーザー専用stateから読み取る。認証が未設定なら、そのplatformだけ `skipped(未設定)` になり、本体runや他platformには影響しない。

認証情報はリポジトリや `.env` へ保存しない。セットアップは、夜間runnerを動かすHiroのWindowsユーザーで行う。

```powershell
cd "D:\documents\動画作成関連\すまラボ"
npm run social:setup-auth
```

## 1. Metaアプリを作る（クリック単位）

画面名はMetaの表示言語により、日本語と英語が混在することがある。括弧内は英語表記。

1. [Meta for Developersのアプリ一覧](https://developers.facebook.com/apps/)を開き、Metaアカウントでログインする。
2. 右上の **アプリを作成**（Create App）をクリックする。
3. ユースケース選択で **Threads APIにアクセス** または **Threads API**（Access the Threads API）を選び、**次へ** をクリックする。
4. アプリ名に `すまラボ SNS投稿` など識別できる名前を入力する。
5. 連絡先メールアドレスを確認し、必要ならBusiness portfolioを選択する。個人テストのみなら未選択で進められる場合がある。
6. **アプリを作成**（Create app）をクリックし、求められた場合はMetaパスワードを再入力する。
7. App Dashboard左側の **ユースケース**（Use cases）を開く。
8. Threads APIの行で **カスタマイズ**（Customize）をクリックする。
9. **設定**（Settings）を開く。
10. **Redirect Callback URLs** に、次を文字単位で同じように入力し、**追加**または **保存** をクリックする。

   ```text
   https://localhost:43821/callback
   ```

11. 左側の **アプリの役割 > 役割**（App roles > Roles）を開く。
12. **ユーザーを追加**（Add People）をクリックし、役割に **Threads Tester** を選択して、投稿に使うThreadsアカウントを追加する。
13. Threadsアプリまたはthreads.netへそのアカウントでログインし、**設定 > アカウント > ウェブサイトのアクセス許可 > 招待**（Settings > Account > Website permissions > Invites）を開く。
14. 作成したMetaアプリからの招待で **承認**（Accept）をクリックする。
15. Meta App Dashboardへ戻り、**アプリ設定 > ベーシック**（App settings > Basic）を開く。
16. **Threads App ID** を控える。通常のMeta App IDではなく、Threads用と表示されたIDを使う。
17. **Threads App secret** の **表示**（Show）をクリックし、求められた場合はMetaパスワードを再入力してSecretを控える。

### Meta設定画面の見え方

- Redirect設定欄: 白い入力ボックスの上または左に `Redirect Callback URLs` と表示され、その下にURLを追加するボタンがある。
- App ID/Secret欄: `Threads App ID` の数値と、伏せ字になった `Threads App secret` が縦に並ぶ。Secretの右側に `Show` がある。
- Tester欄: 追加ダイアログ内のrole選択で `Threads Tester` を指定する。招待を送っただけでは不十分で、Threads側でのAcceptまで必要。

## 2. セットアップスクリプトを実行する

1. PowerShellで `npm run social:setup-auth` を実行する。
2. `Threads App ID:` に手順1で控えたThreads用App IDを貼り付け、Enterを押す。
3. `Threads App Secret:` にSecretを貼り付け、Enterを押す。入力中の文字は画面に表示されない。
4. ブラウザで `https://localhost:43821/start` が開く。
5. 自己署名証明書の警告画面で次の操作をする。
   - Chrome: **詳細設定** → **localhost にアクセスする（安全ではありません）**
   - Edge: **詳細設定** → **localhost に進む（安全ではありません）**
6. 続行すると、自動的にThreadsの認可画面へ移る。
7. 投稿対象のThreadsアカウントを確認する。
8. `threads_basic` と `threads_content_publish` の許可内容を確認し、**許可**／**Authorize**／**Continue** と表示されたボタンをクリックする。
9. ブラウザに **認証コードを受け取りました** と表示されるまで待つ。認可コードのコピーは不要。
10. PowerShellに `[Threads] 保存完了` と表示されたことを確認する。

証明書警告画面は、中央に「接続がプライベートではありません」または「Your connection isn't private」、下部に **詳細設定**（Advanced）が表示される画面。ここで先へ進む操作は、今回のセットアップが起動した `localhost:43821` に対してだけ行う。

Metaが `https://localhost:43821/callback` 自体を拒否した場合は、画面に出たエラー文をそのまま記録して作業を停止する。本番ドメインや外部中継URLへ変更しない。

## 3. Blueskyアプリパスワードを作る

1. [Bluesky](https://bsky.app/)へ投稿対象アカウントでログインする。
2. 左側の **設定**（Settings）をクリックする。
3. **プライバシーとセキュリティ**（Privacy and security）をクリックする。旧表示では **Advanced** の場合がある。
4. **アプリパスワード**（App Passwords）をクリックする。
5. **アプリパスワードを追加**（Add App Password）をクリックする。
6. 名前に `すまラボ夜間投稿` と入力する。
7. DMアクセスを付ける選択肢が出た場合はオフのまま作成する。
8. 表示されたアプリパスワードを一度だけコピーする。通常のBlueskyログインパスワードは使わない。
9. PowerShellの `Bluesky handle:` に、例 `suma-labo.bsky.social` の形式でhandleを入力する。
10. `Blueskyアプリパスワード:` にコピーした値を貼り付け、Enterを押す。入力中の文字は表示されない。
11. `[Bluesky] 疎通確認・保存完了` と、最後の `次にHiroがやること：なし（60日更新は夜間runが自動実行）` を確認する。

## 保存先と安全性

- `%USERPROFILE%\.sumalabo\state\threads-auth.json`: Threads App ID/Secret、長期token、user ID、有効期限、refresh履歴
- `%USERPROFILE%\.sumalabo\state\bluesky-auth.json`: handle、アプリパスワード、疎通確認済みDID
- `%USERPROFILE%\.sumalabo\state\localhost-key.pem`: localhost HTTPS秘密鍵
- `%USERPROFILE%\.sumalabo\state\localhost-cert.pem`: 7日間有効の自己署名証明書
- `%USERPROFILE%\.sumalabo\state\social-posted.json`: platform × slugの二重投稿防止台帳

証明書はGit for Windows付属のOpenSSLで生成し、有効な既存証明書は再利用する。期限が近い場合は次回セットアップで再生成する。認可コードはメモリ上でtoken交換へ渡すだけで、stateやログには保存しない。

環境変数 `THREADS_USER_ID`、`THREADS_ACCESS_TOKEN`、`BLUESKY_HANDLE`、`BLUESKY_APP_PASSWORD` は緊急時の上書き用として引き続き利用できる。通常運用ではstateを使う。

## 再設定とトラブル対応

- Threads App ID/Secretを入れ直す: `npm run social:setup-auth -- --threads-only --replace-threads-app`
- Threadsだけ再認可する: `npm run social:setup-auth -- --threads-only`
- Blueskyを入れ直す: `npm run social:setup-auth -- --bluesky-only --replace-bluesky`
- `threads_callback_port_in_use:43821`: ポート43821を使用中のアプリを閉じてから再実行する。Meta側URLとずれるため別ポートへ自動変更はしない。
- `localhost_certificate_generation_failed`: Git for WindowsのOpenSSLを確認する。別のOpenSSLを使う場合は `SUMALABO_OPENSSL_PATH` に実行ファイルの絶対パスを一時指定して再実行する。
- Threads refreshが日本時間の日付で2日連続失敗: Watchdogに `setup-social-auth.mjs の再実行が必要` と出るため、Threadsだけ再認可する。
