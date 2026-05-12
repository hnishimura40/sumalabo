# ChatGPT 5.5 handoff: 202605-apple-spatial-iphone-glasses-free-3d-2030

## 対象

- slug: 202605-apple-spatial-iphone-glasses-free-3d-2030
- 元記事URL: https://smhn.info/202605-apple-spatial-iphone-glasses-free-3d-2030
- 元記事タイトル: Apple、裸眼3D「空間iPhone」開発か？

## 本文生成

- 本文生成用ChatGPTプロジェクトURL: https://chatgpt.com/g/g-p-69f165a1b6948191ae8adaea61552b73-sumarahotai-ben/project
- 本文生成用promptファイル: logs/prompt/202605-apple-spatial-iphone-glasses-free-3d-2030.article.md
- 生成本文の保存先: drafts/generated/202605-apple-spatial-iphone-glasses-free-3d-2030.md
- ブログ化用資料一式の保存先: drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.materials.md
- 最終版サムネイル画像生成プロンプトの保存先: drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.thumbnail-prompt.md

## サムネイル生成

- 初期サムネイル案・参考プロンプト: logs/thumbnail/202605-apple-spatial-iphone-glasses-free-3d-2030.prompt.md
- 実際に使う最終版サムネイル画像生成プロンプト: drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.thumbnail-prompt.md
- 標準手順: 毎回サムネイル生成専用の新規ChatGPTチャットを開き、ベース画像2枚を **CF_HDROP クリップボード貼り付け（Ctrl+V を 2 回）** で添付してから最終版プロンプトを送信する
- 新規ChatGPTチャットURL: https://chatgpt.com/
- 生成画像の最終保存先: public/images/thumbnails/202605-apple-spatial-iphone-glasses-free-3d-2030.png
- フォールバック（クリップボード経路が通らないとき）: PowerShell から `& "D:\documents\uwsc5302\UWSC.exe" "scripts/automation/chatgpt-attach-base-images.uws"` を実行して UWSC で OS ファイル選択ダイアログを操作する
- 補足: 生成画像は通常のダウンロード先に保存される想定。あとから public/images/thumbnails/202605-apple-spatial-iphone-glasses-free-3d-2030.png へ移動・リネームする。拡張子だけ無理にpngへ変えない。

## ブラウザ操作ポリシー

- 使用するブラウザ: Chrome
- 使用しないブラウザ: Edge
- 重要: Chromeだけを使ってください。
- 重要: Edgeは操作しないでください。
- 重要: hidden file inputの直接クリック、JavaScriptでの file input 直接発火、`file_upload` APIは使わないでください。
- 重要: 「＋」ボタンと「写真とファイルを追加」は画面上の実UIをクリックしてください。

## Claude in Chromeが自動実行する作業

1. Chromeで本文生成用ChatGPTプロジェクトを開く
2. logs/prompt/202605-apple-spatial-iphone-glasses-free-3d-2030.article.md の内容を貼り付ける
3. ChatGPT 5.5で本文の初稿を生成する
4. ChatGPTが回答中の間は次の操作をしない
5. 回答完了後、同じチャット内で下記の精錬フローに沿ってチェック・修正する
6. 最後に最終稿だけを全文コピーし、drafts/generated/202605-apple-spatial-iphone-glasses-free-3d-2030.md に保存する
7. 保存後、ファイル存在と本文の完了を自動確認する
8. 続けて、ブログ化用の資料一式をChatGPTに出力させる
9. 回答完了後、資料一式だけを全文コピーし、drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.materials.md に保存する
10. 保存後、ファイル存在と資料の完了を自動確認する
11. 続けて、記事本文と資料一式を踏まえた最終版サムネイル画像生成プロンプトを作ってもらう
12. 回答完了後、最終版サムネイル画像生成プロンプトを全文コピーし、drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.thumbnail-prompt.md に保存する
13. 保存後、ファイル存在とプロンプトの完了を自動確認する
14. **サムネイル画像生成専用の新規ChatGPTチャットを開く**（使い回しチャットや台本チャットの中では生成しない）
15. 新規タブをChromeウィンドウの**可視タブ**にし、Chromeを`AttachThreadInput` + `SetForegroundWindow`でフォアグラウンド化する
16. ProseMirror（`#prompt-textarea`）にフォーカスし、末尾にキャレットを置く
17. PowerShellで `scripts/automation/chatgpt-attach-files-clipboard.ps1` を呼び、ベース画像 himari-base.png と labomaru-base.png を順次添付する（ヘルパー側で1ファイルずつCF_HDROP→Ctrl+V→2.5秒待機）
18. DOMで添付2件（`button[aria-label^="ファイル"][aria-label*="削除"]` が2件）を確認する。`modal-duplicate-file` が出ていれば OK ボタンを押して閉じる
19. 1件しか入っていなければヘルパーをもう一度呼ぶ。最大3回で諦め、UWSC経路（`& "D:\documents\uwsc5302\UWSC.exe" "scripts/automation/chatgpt-attach-base-images.uws"`）にフォールバック
20. drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.thumbnail-prompt.md を入力欄に貼り付けて送信する
21. ChatGPTが画像生成中の間は次の操作をしない
22. 画像生成完了を待ち、生成画像をダウンロードする
23. ダウンロード完了を自動確認する
24. その後、public/images/thumbnails/202605-apple-spatial-iphone-glasses-free-3d-2030.png へ移動・リネームする（元拡張子に合わせる）

### Preview スクショレビュー（visualPreviewReview）

公開直前の Preview デプロイが立ち上がったら、Claude in Chrome が **mobile-01〜03 + desktop-01〜02 のスクショ** を撮り、新規 ChatGPT チャットへ同じ `chatgpt-attach-files-clipboard.ps1` を使って 1 枚ずつ貼り付ける。2 パスで（読みやすさ → ファクトチェック）レビューさせ、結果を `logs/visual-review/202605-apple-spatial-iphone-glasses-free-3d-2030/` に保存する。詳細は `docs/visual_preview_review.md` を参照。

## Claude Codeが自動実行する作業

1. drafts/generated/202605-apple-spatial-iphone-glasses-free-3d-2030.md と drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.materials.md を読み込む
2. サムネイル画像が配置済みなら public/images/thumbnails/202605-apple-spatial-iphone-glasses-free-3d-2030.png を記事frontmatterへ反映する
3. article:import-generated でMDX化する（`sourceCheck` + `articleQualityCheck` が走る）
4. review / factcheck / previewログを保存する
5. npm run build を実行する
6. build成功後、previewブランチへcommit / pushする
7. Preview が立ち上がったら Claude in Chrome に visualPreviewReview を依頼する（`docs/visual_preview_review.md`）

## レビュー工程の役割分担

| チェック | 対象 | 実装 | 検出する観点 |
|---|---|---|---|
| `sourceCheck` | MDX | 機械的 (`validateSourceReferences`) | 参考情報の有無、URL 2件以上、すまほん非露出、報道ベース注意文 |
| `articleQualityCheck` | MDX | 機械的 (`validateArticleQuality`) | タイトル重複、Markdown残骸、ボックス過大、キャラ要素不足、冒頭構造 |
| `visualPreviewReview` | Preview スクショ | ChatGPT 2 パス (`docs/visual_preview_review.md`) | スマホ表示、読み味、トーン、ファクトの違和感 (Apple系/AI系の追加チェックあり) |

## 最後に人間が確認すること

- 公式情報と矛盾していないか
- 未確定情報を断定していないか
- 料金・日付・対象プランなどが最新か
- 画像・サムネイルに問題がないか（実在ロゴ混入なし、元記事画像コピーなし、文字がスマホで読めるか）
- 公開してよいか

## 本文生成後の精錬フロー

すまラボでは、ChatGPTの初稿をそのまま保存しません。Claude in Chromeが同じChatGPTチャット内で複数回チェック・修正し、最後に出した最終稿だけを指定パスへ保存します。

1. 初稿を生成する
2. ChatGPTが回答中の間は次の操作をしない
3. 回答完了後に、メタ的な内容が残っていないか自動チェックする
4. 記事ボリュームが十分か自動チェックする
5. 元記事の趣旨を壊していないか自動チェックする
6. すまラボらしく普通の人にもわかりやすいか自動チェックする
7. 難しいITニュースを噛み砕けているか自動チェックする
8. 公式発表、報道、予測、未確定情報を混同していないか自動チェックする
9. 不足があれば修正する
10. 必要なら再チェックする
11. 最後に「最終稿として、ブログに貼り付ける本文だけを全文で再出力してください」と依頼する
12. ChatGPTの回答完了後に全文コピーする
13. Claude in Chromeがその最終稿だけを drafts/generated/202605-apple-spatial-iphone-glasses-free-3d-2030.md に保存する
14. 保存後、ファイルが存在し、本文が途中で切れていないことを自動確認する

初稿・途中稿・チェック結果は drafts/generated/202605-apple-spatial-iphone-glasses-free-3d-2030.md には保存しません。必要な場合だけ別メモとして残してください。

## ブログ化用の資料一式保存フロー

最終稿本文を出力したあと、Claude in Chromeが台本チャットで続けて「ブログ化用の資料一式」と「最終版サムネイル画像生成プロンプト」を出力させ、指定パスへ保存します。サムネイル画像そのものの生成は、別途毎回新規ChatGPTチャットで行います。

1. 最終稿本文は drafts/generated/202605-apple-spatial-iphone-glasses-free-3d-2030.md に保存済みであることを自動確認する
2. 続けて、ブログ化用の資料一式をChatGPTに出力してもらう
3. ChatGPTの回答完了後に全文コピーする
4. Claude in Chromeが資料一式を drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.materials.md に保存する
5. 保存後、ファイルが存在し、資料が途中で切れていないことを自動確認する
6. 本文ファイルと資料ファイルを混ぜない
7. メタ情報は本文には入れず、資料側にだけ入れる
8. Claude Codeは、本文と資料一式の両方を見てブログ記事MDXとして整える
9. 続けて、記事本文と資料一式を踏まえたサムネイル画像生成プロンプトを作ってもらう
10. ChatGPTの回答完了後に全文コピーする
11. Claude in Chromeが最終版サムネイル画像生成プロンプトを drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.thumbnail-prompt.md に保存する
12. 保存後、ファイルが存在し、プロンプトが途中で切れていないことを自動確認する
13. サムネイル画像生成は、毎回サムネイル専用の新規ChatGPTチャットで行う（使い回しチャットは使わない）

資料一式には、記事タイトル案、description案、slug案、記事カテゴリ、記事種別、想定読者、この記事の役割、先に結論、見出し構成、要点まとめボックス案、本文で特に大事なポイント、メタ的な内容が残っていないかの自動チェック結果、元記事の趣旨を壊していないかの自動チェック結果、公式発表・報道・予測・未確定情報の整理、ファクトチェック注意点、最終ファクトチェックで確認するポイント、**公開記事に載せる参考情報候補（公式情報・元報道・関連報道のURLを2件以上）**、**参考情報セクションの有無チェック**、**すまほん（smhn.info）を表に出していないかの確認結果**、内部リンク候補、関連記事への導線案、キャラクター会話を入れるならどこが自然か、サムネイルの方向性、サムネイルに入れる短い文字案、X投稿案、Claude Codeへのブログ化指示メモを含めてください。

参考情報候補と公開ガード（資料一式に必ず含める）:

- 参考情報候補: Bloomberg、TechCrunch、Reuters、4Gamer、ITmedia、ASCII、IT系専門メディアなどの **元報道・関連報道URL**、および公式発表（公式サイト、公式ブログ、公式ドキュメント）の **公式情報URL**。最低2件以上。
- 報道ベースの記事の場合は、参考情報の末尾に「公式発表ではない／報道ベース／今後変わる可能性」の注記を1文添える前提を、資料側に明記する。
- すまほん露出ガード: 公開記事本文・参考情報・リンク欄に「すまほん」「smhn.info」が **絶対に出ていない** ことを資料一式の「すまほん露出チェック」項目で明示する。すまほんは内部の話題発見元のみ。
- 参考情報セクション存在チェック: 公開記事MDXの末尾に `## 参考情報` セクションがあり、URLが2件以上あることを資料一式に明記する。

最終版サムネイル画像生成プロンプトには、サムネの狙い、大きく入れる文字案、補足文字案、構図の要約、画像生成用プロンプト本文を含めてください。すまラボらしく、普通の人にもわかりやすく、難しいITニュースをやさしく整理する印象にしてください。固定テンプレではなく、この話題に合った自由な構図にし、らぼまる・ひまりは必要に応じて使ってください。実在ロゴや元記事画像のコピーは使わず、スマホでも読める短い文字にしてください。

サムネイル構図方針:

- 「ひまりが質問、らぼまるが説明」の固定構図にしない
- 2人とも記事内容を理解した後の反応を見せる
- 良いニュースなら前向きな反応、悪いニュースなら悲しむ・心配する反応、判断が分かれる話なら慎重・困惑など、話題に応じたリアクションにする

## サムネイル画像生成フロー（クリップボード貼り付け・新規ChatGPTチャット）

サムネイル画像生成は **毎回新規ChatGPTチャット** で行います。使い回しチャットや台本チャットの中では生成しません。ローカルのキャラクターベース画像をChatGPTへ添付するため、Claude in ChromeがWindowsの **CF_HDROP クリップボードに1ファイルずつコピー → Ctrl+V を 2 回** 送って2枚を順次添付します。

従来は UWSC で OS ファイル選択ダイアログを操作していましたが、クリップボード経路の方が失敗ポイントが少ないため標準フローを切り替えました。UWSC 経路はフォールバックとして残しています。詳細は `docs/chatgpt_file_attach_clipboard.md`、Preview スクショレビュー時の使い回しは `docs/visual_preview_review.md`、UWSC フォールバックは `docs/uwsc_chatgpt_file_attach_test.md` を参照してください。

### Claude in Chromeが自動実行する手順（共通ヘルパー経由）

推奨経路は `scripts/automation/chatgpt-attach-files-clipboard.ps1` を 1 度呼ぶだけ。引数で渡したファイルを順次 1 ファイルずつ CF_HDROP → Ctrl+V してくれる（ヘルパー側で Chrome フォアグラウンド化・Edge 拒否・貼り付け間 2.5 秒待機・ファイル存在チェックを行う）。

1. Chromeで新規ChatGPTチャットを開く（`https://chatgpt.com/`）
2. 開いた新規タブをChromeウィンドウの**可視タブ**にする（古いタブを閉じるか、対象タブを最前面に切り替える。背景タブのままだとCtrl+VがChatGPTへ届かない）
3. ProseMirror（`#prompt-textarea`）に `pm.focus()` でフォーカスし、`Selection.collapse(false)` で末尾にキャレットを置く
4. PowerShellでヘルパーを呼ぶ
   ```powershell
   powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
     "scripts\automation\chatgpt-attach-files-clipboard.ps1" `
     -Files "public\images\characters\base\himari-base.png", `
            "public\images\characters\base\labomaru-base.png"
   ```
5. DOMで添付2件を確認する
   ```js
   document.querySelectorAll('button[aria-label^="ファイル"][aria-label*="削除"]').length === 2
   ```
6. もし `[data-testid="modal-duplicate-file"]` モーダルが出ていれば OK ボタンを押して閉じる（同一コンテンツの過去アップロード履歴で出る。閉じれば添付済み扱い）
7. 1件しか入っていなければ、ヘルパーをもう一度実行する。最大3回までで諦め、UWSC 経路（`& "D:\documents\uwsc5302\UWSC.exe" "scripts/automation/chatgpt-attach-base-images.uws"`）にフォールバックする

### Claude in Chromeが自動実行する手順（手動: ヘルパーを使わない場合の参考）

ヘルパーが使えない / デバッグ目的の場合は、PowerShell で同等の処理を直接書く:

A. PowerShellで`AttachThreadInput` + `BringWindowToTop` + `SetForegroundWindow`を使い、ChromeウィンドウをフォアグラウンドWindow（`GetForegroundWindow()`の戻り値）にする
B. `document.visibilityState === "visible"` と `document.hasFocus()` を確認する
C. CF_HDROPクリップボードに1枚目（public\images\characters\base\himari-base.png）をセットし、Ctrl+V を送る
   ```powershell
   Add-Type -AssemblyName System.Windows.Forms
   $files = New-Object System.Collections.Specialized.StringCollection
   $files.Add('public\images\characters\base\himari-base.png') | Out-Null
   [System.Windows.Forms.Clipboard]::SetFileDropList($files)
   [System.Windows.Forms.SendKeys]::SendWait('^v')
   ```
D. 2.5〜3秒待機する（アップロード完了待ち）
E. CF_HDROPクリップボードに2枚目（public\images\characters\base\labomaru-base.png）をセットし、Ctrl+V を送る
F. 2.5〜3秒待機する
G. DOMで添付2件を確認する
13. 添付2件確認後、drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.thumbnail-prompt.md を入力欄に貼り付けて送信する
14. ChatGPTが回答中・画像生成中の間は次の操作をしない
15. 画像生成完了を待ち、`alt="画像が生成されました"` の `<img>` を取得する
16. 生成画像を fetch + Blob + `<a download>` でダウンロードする（D:\downloads に保存される想定）
17. D:\downloads の最新画像を public/images/thumbnails/202605-apple-spatial-iphone-glasses-free-3d-2030.png に移動・リネームする（拡張子は元の拡張子に合わせる。無理にpngへ変えない）
18. ファイル存在を自動確認する

### クリップボード経路の注意

- CF_HDROP に 2 ファイルまとめてセットして Ctrl+V を 1 回送るだけでは **1 ファイルしか添付されない**（ChatGPT の onpaste が `clipboardData.files[0]` 相当しか処理しない）。必ず 1 枚ずつ 2 回貼り付ける
- クリップボード自動上書きツール（Ditto / ClipMate 等）が走っていると CF_HDROP がテキストへ上書きされる。検証中は停止する
- SendKeys は **フォアグラウンドWindow** に送られる。Ctrl+V 直前に `GetForegroundWindow()` の戻り値が Chrome ハンドルと一致することを必ず確認する

### 失敗時の自動リトライ

サムネイル画像生成自体に失敗した場合は、Claude in Chromeが最大3回まで自動リトライします。1回目・2回目は同じプロンプトで再試行し、3回目はプロンプトを簡略化して再試行します。3回失敗した場合は、サムネイル生成失敗として最終確認待ちにします。

リトライ対象:
- 画像が生成されない
- エラー表示が出る
- 生成が途中で止まった
- 画像枠は出たが画像が読み込まれない
- ダウンロードできる画像が表示されない
- 記事内容と無関係な画像が生成された

## 追加メモ

- 外部APIはCLIから呼びません。
- OpenAI APIキーやClaude APIキーは不要です。
- 本文・サムネイルともに、通常工程ではClaude in Chrome / Claude Codeが自動実行し、最後に人間が最終ファクトチェックと公開判断のみ行います。
- ChatGPTの初稿をそのまま保存せず、Claude in Chromeが精錬後の最終稿だけを指定パスへ保存します。
- 本文ファイルとブログ化用資料ファイルを混ぜないでください。
- logs/thumbnail/202605-apple-spatial-iphone-glasses-free-3d-2030.prompt.md は初期サムネイル案・参考プロンプトです。実際に主で使うのは、台本チャットで本文・資料一式を踏まえて作る drafts/materials/202605-apple-spatial-iphone-glasses-free-3d-2030.thumbnail-prompt.md です。
- サムネイル画像生成は毎回サムネイル専用の新規ChatGPTチャットで行い、使い回しチャットは使わないでください。
- 添付フロー（標準: CF_HDROP クリップボード貼り付け）の詳細は docs/chatgpt_file_attach_clipboard.md を参照。フォールバックの UWSC 経路は docs/uwsc_chatgpt_file_attach_test.md を参照。
