# ChatGPTサムネイル添付フロー（クリップボード貼り付け）

すまラボ自動化のサムネイル生成工程で、Claude in Chrome がローカル画像（ひまり・らぼまるのベース絵）を ChatGPT へ添付するための **標準フロー**。

`file_upload` API も hidden file input の直接クリックも Claude in Chrome では使えないので、従来は UWSC で OS ファイル選択ダイアログを操作していた（`docs/uwsc_chatgpt_file_attach_test.md`）。
2026-05 の検証で、より単純な経路として **CF_HDROP クリップボードに 1 枚ずつコピーして Ctrl+V を 2 回送る** 方法が安定して動くことが確認できたので、こちらを標準フローとする。UWSC 経路は OS ダイアログまでフォールバックが必要な場合の予備手段として残す。

## 用途

このフローは以下の 2 工程で再利用する:

1. **サムネイル生成チャットへのベース画像添付**
   - `public/images/characters/base/himari-base.png`
   - `public/images/characters/base/labomaru-base.png`
2. **Preview 画面スクショレビュー** (`docs/visual_preview_review.md`)
   - `logs/visual-review/{slug}/screenshots/mobile-01.png` … `desktop-02.png` を順次貼り付け

どちらも「1 ファイルずつ CF_HDROP → Ctrl+V」の共通ヘルパー `scripts/automation/chatgpt-attach-files-clipboard.ps1` を経由する。

## 検証結果（2026-05）

| 方式 | 結果 |
|---|---|
| CF_HDROP に 2 ファイル同時セット → Ctrl+V 1 回 | **失敗**。ChatGPT の onpaste は `clipboardData.files[0]` 相当しか処理せず、1 ファイルしか添付されない |
| CF_HDROP に 1 ファイルずつセット → Ctrl+V を 2 回（間に 3 秒待機） | **成功**。`button[aria-label^="ファイル"][aria-label*="削除"]` が 2 件確認できる |
| UWSC 経由で OS ファイル選択ダイアログにダブルクォート区切りで 2 ファイル指定 | 従来から成功するが、フォーカス・タブ可視性・キー送信タイミングの条件が厳しく失敗時のリトライが必要 |

クリップボード方式は UWSC をまったく使わず、Windows API での Chrome フォアグラウンド化と PowerShell SendKeys だけで成立する。`#32770` ダイアログを待つ必要がない分、失敗ポイントが減る。

## 標準手順（推奨: 共通ヘルパー経由）

`scripts/automation/chatgpt-attach-files-clipboard.ps1` を 1 度呼ぶだけで、引数で渡したファイルを順次 1 枚ずつ CF_HDROP → Ctrl+V してくれる。Chrome のフォアグラウンド化、Edge 拒否、ファイル存在チェック、貼り付け間 2.5 秒待機もヘルパー側で吸収する。

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  "D:\documents\動画作成関連\すまラボ\scripts\automation\chatgpt-attach-files-clipboard.ps1" `
  -Files "D:\documents\動画作成関連\すまラボ\public\images\characters\base\himari-base.png", `
         "D:\documents\動画作成関連\すまラボ\public\images\characters\base\labomaru-base.png"
```

Preview スクショレビュー時の例:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  "D:\documents\動画作成関連\すまラボ\scripts\automation\chatgpt-attach-files-clipboard.ps1" `
  -Files "logs\visual-review\{slug}\screenshots\mobile-01.png", `
         "logs\visual-review\{slug}\screenshots\mobile-02.png", `
         "logs\visual-review\{slug}\screenshots\desktop-01.png"
```

ヘルパー終了後、必ず DOM 側で添付件数を確認:
```js
document.querySelectorAll('button[aria-label^="ファイル"][aria-label*="削除"]').length
```

## 標準手順（手動: ヘルパーを使わない場合の参考）

1. **新規 ChatGPT チャットを開く**
   - `chatgpt.com/` に navigate（プロジェクトチャットや使い回しチャットは使わない）
   - 毎回サムネイル生成専用の新規チャットを使う
2. **新規タブを Chrome ウィンドウの可視タブにする**
   - MCP の `tabs_create_mcp` で作っただけでは Chrome ウィンドウ上は背景タブのまま
   - 古いタブを `tabs_close_mcp` で閉じるか、`document.visibilityState === "visible"` になるまでタブ切替する
   - 可視・かつ `document.hasFocus()` を満たさないと Ctrl+V が ChatGPT に届かない
3. **Chrome ウィンドウを PowerShell でフォアグラウンド化**
   - `AttachThreadInput` + `BringWindowToTop` + `SetForegroundWindow` を組み合わせる（フォアグラウンドロック対策）
   - `GetForegroundWindow()` の戻り値が対象ハンドルになっていることを必ず確認する
4. **ProseMirror（`#prompt-textarea`）にフォーカス**
   - `pm.focus()` の後、`Selection.collapse(false)` で末尾にキャレットを置く
5. **CF_HDROP クリップボードに 1 枚目をセット → Ctrl+V**
   ```powershell
   Add-Type -AssemblyName System.Windows.Forms
   $files = New-Object System.Collections.Specialized.StringCollection
   $files.Add('D:\documents\動画作成関連\すまラボ\public\images\characters\base\himari-base.png') | Out-Null
   [System.Windows.Forms.Clipboard]::SetFileDropList($files)
   [System.Windows.Forms.SendKeys]::SendWait('^v')
   ```
6. **3 秒待機**（ChatGPT がアップロードしてサムネイルを描画するまで）
7. **CF_HDROP クリップボードに 2 枚目をセット → Ctrl+V**
   - 同じ要領で `labomaru-base.png` をセットして Ctrl+V
8. **3 秒待機**
9. **添付確認**
   ```js
   const delBtns = document.querySelectorAll('button[aria-label^="ファイル"][aria-label*="削除"]');
   delBtns.length === 2
   ```
   - 2 件あれば成功
   - 1 件しか無い場合は 7. を再実行
   - `[data-testid="modal-duplicate-file"]` モーダルが出ていたら `OK` ボタンを押して閉じてから再貼り付け
10. **添付 2 件確認後、`{slug}.thumbnail-prompt.md` を入力欄に貼り付けて送信**

## クリップボード操作の注意

- クリップボード自動上書きツール（Ditto, ClipMate 等）が走っていると CF_HDROP がテキスト URL などに上書きされて添付されない。検証中は停止する。
- Ctrl+V を SendKeys で送る前に必ず Chrome を `GetForegroundWindow()` で確認する。フォアグラウンドが Edge や PowerShell ホストの場合は SendKeys がそちらへ送られる。
- ChatGPT は同一コンテンツのファイルを `(2)`, `(3)` のように自動リネームして区別する。アカウント横断で重複検出されるため、過去にアップロード履歴があると `modal-duplicate-file` が出ることがある。OK ボタンで閉じれば添付自体は完了している。

## 失敗時の対処

| 症状 | 原因の候補 | 対処 |
|---|---|---|
| Ctrl+V を送ったが添付 0 件 | Chrome がフォアグラウンドになっていない／別タブが可視状態 | `AttachThreadInput` 付きで再度フォアグラウンド化し、`document.visibilityState` と `document.hasFocus()` を確認してから再送 |
| 添付 1 件しか入らない | 1 回目の Ctrl+V が ProseMirror 外へ送られた／2 回目の SetFileDropList が走らなかった | 7. をもう一度実行する。それでもダメなら 5.〜7. を全て再実行 |
| `modal-duplicate-file` が出る | 同一コンテンツが過去にアップロード済み | モーダルの OK ボタンを押して閉じる。添付済みなのでそのまま続行 |
| CF_HDROP に 2 ファイル入れて Ctrl+V 1 回で済まそうとしたが 1 件しか添付されない | これは仕様。ChatGPT の onpaste は `files[0]` 相当しか拾わない | 1 ファイルずつ 2 回貼り付ける手順に戻す |
| 連続貼り付けで 2 枚目が無視される | 1 回目のアップロード完了前に 2 回目を送った | 7. 前のスリープを 3 秒以上に延ばす |

## UWSC フォールバック

クリップボード経路がどうしても通らない（例: SetFileDropList が COM エラーで失敗する、Chrome 側の paste handler がアップデートで CF_HDROP を読まなくなる、など）場合は `docs/uwsc_chatgpt_file_attach_test.md` の OS ファイル選択ダイアログ + UWSC 経路へ切り替える。UWSC スクリプト `scripts/automation/chatgpt-attach-base-images.uws` は引き続き残してある。

## 関連ファイル

- `scripts/automation/chatgpt-attach-files-clipboard.ps1` — 1 ファイルずつ CF_HDROP 貼り付けの共通ヘルパー（サムネベース画像 + Preview スクショレビューで再利用）
- `docs/visual_preview_review.md` — Preview スクショの 2 パスレビュー + ファクトチェック観点
- `docs/uwsc_chatgpt_file_attach_test.md` — UWSC フォールバック手順
- `scripts/automation/chatgpt-attach-base-images.uws` — UWSC スクリプト（フォールバック用）
- `scripts/sumahon/generate-handoff.mjs` — handoff / chrome-steps 生成元
- `config/sumalabo-automation.json` — ベース画像パスなどの自動化設定
- `docs/thumbnail_workflow.md` — サムネイル制作の全体フロー
