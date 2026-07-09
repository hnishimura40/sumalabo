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
D:\work\chrome-automation-profile
```

（環境変数 `SUMALABO_CHROME_PROFILE` で上書き可能。既定はこのパス。）

## セットアップ手順（一度だけ）

1. **通常の Chrome は開いたままで良い**（別プロファイルなので競合しない）。

2. 専用プロファイルで Chrome を起動する（PowerShell）:

   ```powershell
   & "C:\Program Files\Google\Chrome\Application\chrome.exe" `
     --user-data-dir="D:\work\chrome-automation-profile" `
     --remote-debugging-port=9222 --remote-allow-origins=* `
     --no-first-run --no-default-browser-check --start-maximized
   ```

   （Claude に「自動運転プロファイルの Chrome を起動して」と頼めば、この起動だけは代行できる。
   ただしログイン・ペアリングは本人操作が必要。）

3. 開いた Chrome で **ChatGPT にログイン**する（https://chatgpt.com）。
   - ログイン後、画像工房チャット（`data/automation/image-workshop.json` の `conversationUrl`）が
     開けることを確認するとより確実。

4. 同じ Chrome で **X にログイン**する（https://x.com → アカウント **@suma_labo**）。

5. 同じ Chrome に **claude-in-chrome 拡張をインストール＆ペアリング**する。
   - 拡張の Connect を実行し、ペアリングが完了したら **deviceId** を控える。
   - deviceId は Claude 側で `list_connected_browsers` でも取得できる。

6. **`data/automation/night-browser.json` の `deviceId` を、この専用プロファイルの deviceId に更新**する。
   - このプロファイルの Chrome が唯一の接続なら、夜間runの `select_browser` がそれを選ぶ。
   - （Claude に deviceId を伝えれば night-browser.json 更新は代行できる。）

7. 動作確認（testMode を消費しないドライラン）:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\automation\night-run.ps1 -BrowserCheckOnly
   ```

   ログ（`logs/night/{date}.log`）に
   `=== BrowserCheckOnly OK: Chrome起動・DevTools応答・chrome-preflight合格を実測 ===`
   が出れば準備完了。

## 運用上の注意

- 専用プロファイルは `D:\work\` 配下に置く（OS Temp 配下は自動クリーンアップで壊れるため禁止・P7）。
- 専用プロファイルのタブ（ChatGPT / X / 工房チャット）は閉じても `--restore-last-session` で復元される。
  ログインが切れたら夜間runは `chrome-preflight` 不合格で安全停止するので、再ログインする。
- 通常使いの Chrome とアカウントを分けたい場合も、この専用プロファイルに @suma_labo 等を入れておけば
  日常のブラウジングと混ざらない。

## 関連

- `scripts/automation/night-run.ps1` — 専用プロファイルで Chrome 起動（`-BrowserCheckOnly` でドライラン）
- `scripts/automation/chrome-preflight.mjs` — DevTools ポートで ChatGPT/X ログイン生存を検査（リトライ付き）
- `docs/night_driver_prompt.md` 0-bis — 夜間ドライバーのブラウザ選択手順
