# 夜間run 専用 Chrome プロファイルの初回セットアップ（一度だけ）

## なぜ必要か

Chrome 136 以降（実測: Chrome 150 / 2026-07-09）、**既定（デフォルト）プロファイルでの
`--remote-debugging-port` は無効化**された（マルウェアの Cookie 窃取対策）。

- デフォルトプロファイル + `--remote-debugging-port=9222` → ポートが listen しない
- **専用 `--user-data-dir` + `--remote-debugging-port=9222` → 正常に listen する**

そのため夜間run（`night-run.ps1`）は**専用の自動運転プロファイル**で Chrome を起動する。
このプロファイルには一度だけ ChatGPT / X のログインと拡張ペアリングが必要（＝この手順）。
一度やれば以後は永続する。ユーザーの通常 Chrome とは独立して共存する（通常 Chrome は一切触らない）。

## 専用プロファイルの場所

```
D:\work\sumalabo-x-chrome
```

正本は `config/night-environment.json` の `chrome.userDataDirectory`。個人用Chromeの
`%LOCALAPPDATA%\Google\Chrome\User Data` は指定しない。

## セットアップ手順（一度だけ）

1. **通常の Chrome は開いたままで良い**（別プロファイルなので競合しない）。

2. 専用プロファイルで Chrome を起動する（PowerShell）:

   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" `
     --user-data-dir="D:\work\sumalabo-x-chrome" `
     --profile-directory="Profile 2" `
     --no-first-run --no-default-browser-check --start-maximized
   ```

   （Claude に「自動運転プロファイルの Chrome を起動して」と頼めば、この起動だけは代行できる。
   ただしログイン・ペアリングは本人操作が必要。）

3. 開いた Chrome で **ChatGPT にログイン**する（https://chatgpt.com）。
   - ログイン後、画像工房チャット（`data/automation/image-workshop.json` の `conversationUrl`）が
     開けることを確認するとより確実。

4. 同じ Chrome で **X にログイン**する（https://x.com → アカウント **@suma_labo**）。

5. 同じ Chrome に **Codex Chrome拡張**をインストールし、接続を確認する。このインストールと
   Xへのログインは資格情報を扱うため、初回だけユーザー本人が行う。

6. 動作確認（記事生成・X投稿を行わない）:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\automation\night-x-profile-check.ps1
   ```

   ログ（`logs/night/{date}.log`）に
   `"reason":"x_profile_confirmed"` と終了コード0が出れば準備完了。不一致は終了コード20で、
   X投稿だけを止める。

## 運用上の注意

- 専用プロファイルは `D:\work\` 配下に置く（OS Temp 配下は自動クリーンアップで壊れるため禁止・P7）。
- ログインが切れたらX工程内のDOMゲートがfatalとなり、pending bundleを保存してXだけ安全停止する。
  記事生成・公開の主契約は失敗にしない。
- 通常使いの Chrome とアカウントを分けたい場合も、この専用プロファイルに @suma_labo 等を入れておけば
  日常のブラウジングと混ざらない。

## 関連

- `scripts/automation/night-x-post-step.ps1` — 主契約完了後にだけ専用プロファイル検査を呼び出す。記事公開フローはChromeに依存しない
- `scripts/automation/chrome-preflight.mjs` — DevTools ポートで ChatGPT/X ログイン生存を検査（リトライ付き）
- `docs/night_driver_prompt.md` 0-bis — 夜間ドライバーのブラウザ選択手順
