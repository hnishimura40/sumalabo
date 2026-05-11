# ChatGPTサムネイル添付フロー（UWSC連携・フォールバック）

> **位置づけ**: 2026-05 以降、すまラボの標準フローは **CF_HDROP クリップボード貼り付け**（共通ヘルパー `scripts/automation/chatgpt-attach-files-clipboard.ps1`、解説 `docs/chatgpt_file_attach_clipboard.md`）に切り替えました。本ドキュメントは以下のケースに使う **フォールバック手順** として残しています:
>
> - `Clipboard.SetFileDropList` が COM エラーで失敗する
> - クリップボードを別アプリが上書きし続けてしまう
> - Chrome の paste handler が CF_HDROP を読まなくなった
>
> Edge は引き続き触らない / hidden file input は触らない / `file_upload` API は使わない、というポリシーはフォールバック時も同じです。

すまラボ自動化のサムネイル生成工程で、Claude in Chromeがローカル画像（ひまり・らぼまるのベース絵）をChatGPTへ添付するための実証済みフロー。

`file_upload` API も hidden file input の直接クリックも、Claude in Chrome では拒否されるかOSダイアログ自体が出ないため、**画面上の実UIをクリックして開いたOSファイル選択ダイアログをUWSCで操作する**経路で確立した。

## 対象ファイル

- `public/images/characters/base/himari-base.png`
- `public/images/characters/base/labomaru-base.png`

## 使うスクリプト

- `scripts/automation/chatgpt-attach-base-images.uws`
- `D:\documents\uwsc5302\UWSC.exe`（UWSC実行ファイル）

## 成功した順序（Claude in Chromeが自動実行）

1. **新規ChatGPTチャットを開く**
   - `chatgpt.com/`に navigate（プロジェクトチャットや使い回しチャットは使わない）
   - 毎回サムネイル生成専用の新規チャットを使う
2. **新規タブをChromeウィンドウの可視タブにする**
   - MCPの `tabs_create_mcp` で作っただけでは、実際のChromeウィンドウ上では背景タブのまま
   - 古いタブを `tabs_close_mcp` で閉じるか、可視タブを新規タブに切り替える
   - **可視タブが新規タブと一致しないとOSダイアログが出ない（最重要）**
3. **ChromeウィンドウをPowerShellでフォアグラウンド化**
   ```powershell
   Add-Type @"
   using System; using System.Runtime.InteropServices;
   public class Fg {
     [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
     [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int s);
   }
   "@
   $chrome = Get-Process chrome | Where-Object {$_.MainWindowTitle -like "*ChatGPT*"} | Select-Object -First 1
   [Fg]::ShowWindow($chrome.MainWindowHandle, 9) | Out-Null   # SW_RESTORE
   [Fg]::SetForegroundWindow($chrome.MainWindowHandle) | Out-Null
   ```
4. **「＋」ボタン（aria-label `ファイルの追加など`）を実UIクリック**
   - hidden file input は触らない
   - JavaScriptで file input を直接 `.click()` しない
   - `file_upload` API は使わない
5. **メニューが開いたら「写真とファイルを追加」menuitem を実UIクリック**
6. **OSファイル選択ダイアログ `#32770` をポーリング**
   - クラス `#32770` の可視ウィンドウをEnumWindowsで列挙
   - 200msごとに最大2秒程度ポーリングして検出
   - 出現が確認できなければクリックが届いていない可能性 → 失敗報告
7. **UWSC実行**
   ```powershell
   & "D:\documents\uwsc5302\UWSC.exe" "D:\documents\動画作成関連\すまラボ\scripts\automation\chatgpt-attach-base-images.uws"
   ```
8. **UWSCの動作**
   - アドレス欄に `D:\documents\動画作成関連\すまラボ\public\images\characters\base` を貼付
   - ファイル名欄に `"himari-base.png" "labomaru-base.png"` を貼付
   - Enterを2回（1回目で確定、2回目で「開く」）
9. **UWSC失敗時のリトライ**
   - 1回目で添付されないことがある（キーが先送りされる、フォーカスズレ）
   - `#32770` がまだ開いていれば**そのまま**もう一度UWSCを実行（既存スクリプトは冪等）
   - 最大3回までで諦め、サムネイル生成失敗・最終確認待ちとして記録
10. **添付確認**
    - DOM上の `input[type="file"]` の `files` プロパティに2件入っているか
    - サムネイルプレビュー要素 `[data-testid*="attachment"]` または `img[alt*="ploaded"]` が表示されているか
    - 2件確認できてからサムネイルプロンプトを貼り付けて送信する

## 成功した順序（人間が事前に整える）

- ChromeにClaude for Chrome拡張をインストールし、Claude Codeセッションとペアリングする
- 接続名はChromeとわかる名前にする（Edgeの拡張は使わない）
- UWSCをインストールし、`D:\documents\uwsc5302\UWSC.exe` から実行できる状態にする
- ベース画像が `public/images/characters/base/{himari,labomaru}-base.png` に存在することを確認

## 確認したいこと（最後に人間が判断）

- 生成されたサムネイル画像の構図・キャラ表現が記事温度感に合っているか
- 実在ロゴ（Apple, AirPodsなど）が混入していないか
- 元記事画像のコピーになっていないか
- サムネ文字がスマホで読めるサイズか
- 公開してよいか

## 失敗時の対処

| 症状 | 原因の候補 | 対処 |
|---|---|---|
| `#32770`が出ない | Chromeウィンドウの可視タブが別タブのまま | 古いタブを閉じる／対象タブを最前面に出す。フォアグラウンド化も再確認 |
| `#32770`が出ない | 「＋」を hidden input 経由でクリックした | aria-label `ファイルの追加など` の visible button を ref経由でクリック |
| `#32770`は出たがUWSCが終了しても閉じていない | キーがフォーカス前に届いた／クリップボードが上書きされた | ダイアログが開いたままUWSCを再実行する（最大3回） |
| `#32770`が出たがファイル名欄に何も入らない | クリップボードを別アプリが上書きしている | クリップボード自動上書きツールを一時停止し、UWSCを再実行 |
| 添付2件にならない（1件のみ） | ファイル名欄のクオート区切りが崩れた | UWSCを再実行。ダブルクォート区切り `"name1" "name2"` が必須 |
| `UWSC.exe`が見つからない | パス違い | 実際のインストール先に合わせてPowerShell呼び出しのパスを変更 |
| Edgeが反応する | 誤ってEdge拡張に接続した | Chromeの拡張に再ペアリングする。Edgeは絶対に操作しない |

## 関連ファイル

- `scripts/automation/chatgpt-attach-base-images.uws` — UWSC本体（このフロー専用）
- `scripts/sumahon/generate-handoff.mjs` — handoff/chrome-stepsの生成元
- `scripts/sumahon/generate-thumbnail-prompt.mjs` — 初期サムネ案・参考プロンプト
- `scripts/sumahon/generate-article-prompt.mjs` — 記事生成プロンプト本文
- `config/sumalabo-automation.json` — UWSCパス、ベース画像パス、ダウンロード先などの自動化設定
- `docs/thumbnail_workflow.md` — サムネイル制作の全体フロー
