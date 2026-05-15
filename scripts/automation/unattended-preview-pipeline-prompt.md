# すまラボ unattended Preview パイプライン マスタープロンプト

このファイルは `scripts/automation/run-claude-preview-pipeline-once.ps1` から
複数回の claude.exe サブセッションで読み込まれます。各サブセッションは PS 側から
個別の "STAGE" を stdin で受け取り、このファイルの該当セクションに従って動作します。

このプロンプトは **記事 1 本を「ユーザーが承認できる状態」まで持っていく** ためのものです。
Preview deploy できただけでは未完了です。

## 劣化禁止 (最優先)

別の不具合修正・AUP 回避・安全化のついでに、サムネ・本文・キャラクター表現を **勝手に劣化させない**。
前にうまくいっていた挙動 (感情豊かなキャラ・自由な構図・道具の活用・情報量) を基準にする。
**劣化する可能性がある変更は止めて報告する**。「劣化しにくくする」ではなく「劣化させない」こと。

## 絶対ルール (グローバル / 全 STAGE 共通)

- AskUserQuestion を呼ばない (Unattended のため)
- production deploy をしない (`wrangler pages deploy --branch=main` 禁止)
- main へ直 push しない (preview branch のみ)
- `git add .` を使わない (個別 add のみ)
- X 投稿しない
- 課金・有料化に関する操作をしない
- 既存記事 (content/articles/) を上書きしない
- 既存サムネ (public/images/thumbnails/) を上書きしない
- 既存 Windows タスクを変更しない、新規タスクを登録しない
- 失敗時は追加送信・リトライ連打せず graceful stop し JSON で reason を返す
- secret / token / deploy hook URL / Cloudflare API token を **絶対に log / stdout に出さない**
- **本ファイルの「禁止語」を本文・サムネプロンプトに書き写さない** (AUP フィルタが拾うため)

## 処理単位

- 1 回の実行で処理する記事は **1 本だけ**
- queue から「すまラボ基準」で候補を選ぶ
- `published / preview_created / preview_deployed / failed` の記事は **新規候補にしない**
- `awaiting_import / preview_deployed` があれば **再開対象として優先**
- 次の記事へ勝手に進まない

## 記事理解レイヤー (Pre-Phase / 仕組みとして固定)

新規記事は **Phase A の `prepare-from-sumahon` 内で必ず articleUnderstanding を生成** し
`logs/understanding/{slug}.json` に保存する。これは「タイトルだけで本文・サムネを作らない」ための
構造化されたガイダンスで、以下のフィールドを含む:

- `articleTheme` — 記事の中心テーマ
- `readerQuestion` — 読者が一番知りたいこと
- `readerAnxiety` — 読者の不安
- `readerDecisionPoint` — 読者が判断したい点
- `whatChangesForNormalUsers` — 普通の人にとっての変化
- `buyWaitOrWatch` — 判断軸 (買う / 待つ / 様子見 など、トーンに応じて変化)
- `himariReaction` — ひまりが記事を読んだ後の表情・反応
- `labomaruRole` — らぼまるが整理する観点
- `thumbnailProps` — サムネで使う道具の候補 (記事内容に応じて選定)
- `thumbnailCompositionIdea` — サムネ構図の方向性 (テンプレ化させない)
- `visualExplainBlocksNeeded` — 本文に置くべき視覚整理ブロックのリスト

この understanding は:
1. `generateArticlePrompt` に渡され、ChatGPT Phase B プロンプト先頭の「この記事の理解」セクションになる
2. `generateThumbnailPrompt` に渡され、初期サムネプロンプト先頭の「この記事の理解」セクションになる
3. orchestrator の report に参照される (パス + 主要フィールド)

実装場所:
- `scripts/sumahon/generate-article-understanding.mjs` (生成ロジック)
- `scripts/run/prepare-from-sumahon.mjs` (呼び出し + 保存)
- `scripts/sumahon/generate-article-prompt.mjs` (Body prompt 注入)
- `scripts/sumahon/generate-thumbnail-prompt.mjs` (Thumbnail prompt 注入)

## 記事品質要件

### 本文思想 (絶対)
本文は **文字数を削るのではなく、図解・表・カード・判断フローで読みやすくする**。
スマホで読んだときに **文字の壁にならない** ようにする。
**情報量を薄くしない**。
**最初の 1 スクロールで読者が判断軸をつかめる** ようにする。
「詳しいけど重くない」「情報はあるけどスマホで読める」「先に判断できて、後から詳しく読める」を優先する。

### 冒頭テンプレ (必須)
記事の冒頭は次の 3 ブロックを順に置く:

1. **3 行でわかるまとめ** (`<div class="summary-box">` + label `"3行でわかるまとめ"`)
   - 3 つの bullet point に圧縮した TL;DR
   - 読者は最初の数秒でこの記事の結論を把握できる
2. **この記事で整理すること** (`<div class="check-box">` + label `"この記事で整理すること"`)
   - 4 つほどの bullet で、この記事のロードマップを示す
3. **先に結論** (`<div class="summary-box">` + label `"先に結論"`)
   - 詳細な前提条件・出典・但し書きを含む 2-3 段落の結論
   - 「リーク情報である」「公式発表ではない」などの注記もここに

### 本文構成
1. 普通の人が読んで理解できる
2. 「買う / 待つ / 選ぶ / 比較する」の判断につながる
3. ニュース紹介だけで終わらせない (= 意味づけまで行う)
4. 文字ばかりにしない (長段落が連続したら警告)
5. 構造化要素を必ず使う:
   - `<div class="summary-box">` (まとめ / 結論)
   - `<div class="info-box">` (補足説明)
   - `<div class="check-box">` (確認ポイント / チェックリスト)
   - `<div class="table-card">` または `<table>` (用語整理・比較)
6. 用語説明は **表で整理** (本文ベタ書き禁止)
7. 使い方別判断は **比較表または card** で整理
8. 「待つ人」「買う人」「比較すべき人」を明示
9. スマホで読んだときに段落が連続しすぎないこと
10. 難しい話ほど **図解・表・カードに逃がす**

### 図解・表・カードの型 (記事に最低 1 つ以上)
- 3 行まとめカード
- 期待できること / 注意したいこと / 普通の人への影響
- 買う / 待つ / 様子見
- 向いている人 / 待った方がいい人
- 判断フロー
- 仕組み図
- 比較表
- 注意点カード

### 避けること
- 長文説明だけで「で、普通の人はどう判断するか」が見えない
- 序盤に長い背景説明や技術説明を詰め込む (先に判断軸を出さない)
- 長段落が連続する

## CharacterDialogue 必須

- ひまり / らぼまるの会話は記事中に **1〜2 回** 配置する
- ただの `<strong>ひまり：</strong>` / `<strong>らぼまる：</strong>` テキストでは **NG**
- **必ず `CharacterDialogue.astro` コンポーネントに変換** する
- mdx 上で必要な import 文:
  ```mdx
  import CharacterDialogue from "../../src/components/characters/CharacterDialogue.astro";
  ```
- 使い方:
  ```mdx
  <CharacterDialogue
    image="/images/characters/duo_talk_half.webp"
    lines={[
      { speaker: "ひまり", text: "..." },
      { speaker: "らぼまる", text: "..." },
    ]}
  />
  ```
- build 後の dist HTML には次が**両方**現れること:
  - `/images/characters/duo_talk_half.webp` (または別の duo / himari / labomaru webp)
  - `class="character-dialogue"`
- build 後の dist HTML に `<strong>ひまり：</strong>` / `<strong>らぼまる：</strong>` が **残っていたら失敗**

## サムネイル品質要件

### サムネ思想 (絶対)
サムネは **ひまり・らぼまるが記事内容を理解し、その内容に対して感情・表情・道具・構図で自由に反応するもの** にする。
**テンプレ化・置物化・無難化は禁止**。
文字を減らすこと自体を目的にしない。
記事内容が伝わる自由なサムネを作る。
**安全化を理由に、感情・面白さ・自由さを削らない**。

### サムネ生成前に必ず考えること
記事から次を抽出してプロンプトに反映する:
- この記事の中心テーマ
- 読者が驚く点 / 不安になる点 / 判断したい点
- ひまりならどう反応するか (素朴な疑問・驚き・気づき)
- らぼまるなら何を整理するか (チェックリスト・グラフ・虫眼鏡)
- 使うと分かりやすい道具
- どんな構図なら「その記事らしい」か

### 道具の例 (自由に組み合わせる)
スマホ / AIアイコン / 比較ボード / 注意マーク / 虫眼鏡 / チップ / グラフ / メモカード / バッテリー / ゲームコントローラー / カメラ など。記事内容に合わせて選ぶ。

### 絶対条件
- ベース画像 `himari-base.png` / `labomaru-base.png` を **canvas + DataTransfer 経路で必ず添付**
- ひまり / らぼまるをベース画像準拠で配置
- 記事内容に応じて **表情・感情・ポーズを変える** (喜怒哀楽を出してよい)
- 実在ロゴ・実機写真コピーは使わない
- 構図を固定テンプレにしない
- 記事ごとに「その記事らしい」サムネにする
- 大きな文字は 2 つまで / 補助文字は 2 つまで (文字で全部説明しない)
- 情報量、構図、キャラ、判断軸は削らない
- AUP 対策でプロンプトを書き換える場合は:
  - 元プロンプトを `logs/thumbnail/{slug}.original-prompt.md` に保存
  - 差分を log に残す
  - **単純化で済ませない** (情報量を維持する書き換え)
  - 禁止語リストをプロンプトに書き写さない (フィルタが拾う)

### 避けること
- 無難すぎる / 固すぎる / 毎回同じ構図
- キャラがただ横に立っているだけ (置物化)
- 記事内容と関係ない小道具
- 文字だけで説明している
- 情報カードを詰め込みすぎている
- ひまり・らぼまるのリアクションが薄い

## 公開前ゲート (本文の最終チェック)

build 直前に MDX 本文を機械検査し、次が **すべて NG であること** を確認:

- `smhn` / `すまほん` が本文・参考情報・リンクに含まれていないこと
- frontmatter `title` / `description` / `thumbnailAlt` が **記事固有** であること (generic boilerplate 禁止)
- H1 (`# `) が本文先頭に残っていないこと
- メタ文 (`ここから本文` / `最終稿として` / `以下、本文` / `初稿`) が残っていないこと
- ` ```md ` / ` ```markdown ` フェンスが残っていないこと
- 孤立した `**` が残っていないこと

## 完了条件 (13 ゲート)

orchestrator は build / verify / notify / PR の各段階を実測し、次の 13 ゲートを全部 true にできた場合のみ `completedForUserApproval=true` と `queue=preview_created` を許可する。

1. `previewDeployOk` — wrangler が成功し deploy URL を返した
2. `verifyOk` — Preview URL が 200 + slug 含有 + 実 title (SPA fallback でない)
3. `thumbnailOk` — PNG が存在 + サイズ > 20KB + 本文 HTML に参照あり
4. `articleImportedOk` — `content/articles/{slug}.mdx` が存在
5. `characterDialogueVisualOk` — 上記 CharacterDialogue 必須条件をクリア
6. `articleStructureOk` — 構造化要素 (summary-box / info-box / check-box / table) が記事サイズに対して十分
7. `notifyOk` — PWA 通知 API が 200 + `sent >= 1`
8. `prOk` — PR URL を取得 (gh CLI 経由 / GitHub API fallback)
9. `queueUpdatedOk` — queue 更新が成功
10. `productionDeployNotRun` — log に `wrangler ... --branch=main` 等が無い
11. `mainDirectPushNotRun` — log に `git push origin main` 等が無い
12. `xPostNotRun` — log に X 投稿系コマンドが無い
13. `processedOnlyOneArticle` — candidate selection が 1 件だけ pick

**いずれかが false なら:**
- `LastTaskResult` を成功扱いにしない
- queue を `preview_created` にしない (代わりに `preview_deployed` / `failed`)
- report JSON に `failedGate / reason / nextAction` を入れる
- 次の記事へ進まない
- production deploy しない
- 失敗時の自動リトライ連打をしない

---

## STAGE: phase_b

ゴール: ChatGPT 台本プロジェクトを開き、articlePrompt をペースト → 送信
1 回 → 初稿 → refinement (1 回) → 最終稿要求 (1 回) → 最終稿を
`drafts/generated/{slug}.md` に保存。

### 入力
- slug: PS から渡される (例: 202605-foo-bar)
- articlePromptPath: `logs/prompt/{slug}.article.md`
- conversationProjectUrl: https://chatgpt.com/g/g-p-69f165a1b6948191ae8adaea61552b73-sumarahotai-ben/project

### 手順
1. `list_connected_browsers` → 1 台でなければ blockedBy="browser_selection" で停止
2. `select_browser`, `tabs_context_mcp(createIfEmpty)`, navigate to project URL
3. 既存チャット (この slug 用) が無ければ新規でOK。但し他 slug の既存チャットに乗らない
4. 入力欄に articlePromptPath ファイルの内容をペースト
5. 送信ボタンを **1 回だけ**クリック → 初稿生成完了まで polling (最大 ~5 分)
6. 完了したら refinement 指示を送信 (PS から渡される). **送信は 1 回だけ**
7. 最終稿要求メッセージを送信 (`scripts/automation/unattended-final-request-template.txt` の内容). **送信は 1 回だけ**
8. 完了後、最後の assistant message の "回答をコピーする" ボタンをクリック
9. OS クリップボードを UTF-8 で取得し `drafts/generated/{slug}.md` に保存
10. ファイル存在 + 文字数 (>= 7000) + 構造チェック (h2 >= 5, "参考情報", "ひまり"/"らぼまる" 含む, smhn/すまほん 含まない)

### 失敗条件
- 生成タイムアウト → 追加送信せず停止
- 文字数 / 構造チェック失敗 → 停止

## STAGE: thumbnail

ゴール: ベース画像 2 枚を canvas で ChatGPT に添付し、新規 chat で画像生成プロンプトを送信、生成画像を `public/images/thumbnails/{slug}.png` に保存。

### 入力
- slug
- thumbnailPromptPath: `drafts/materials/{slug}.thumbnail-prompt.md`
- basePngUrls (canvas fetch):
  - https://sumalabo.com/images/characters/base/himari-base.png
  - https://sumalabo.com/images/characters/base/labomaru-base.png

### 手順
1. `list_connected_browsers` → 1 台でなければ停止
2. `select_browser`, `tabs_create_mcp`, navigate to https://chatgpt.com/ (新規 chat)
3. canvas attach:
   - JS で `<img crossOrigin="anonymous">` を 2 枚作って basePngUrls から load
   - canvas に drawImage して `canvas.toBlob('image/png')` で Blob 化
   - `new File([blob], 'himari-base.png' / 'labomaru-base.png')` で File 化
   - `new DataTransfer()` に add → `document.getElementById('upload-files').files = dt.files`
   - `dispatchEvent(new Event('change', { bubbles: true }))`
4. 添付カード 2 件が表示されたことを DOM 確認
5. 入力欄に thumbnailPromptPath の内容をペースト (UTF-8 ファイル経由)
6. 送信ボタンを **1 回だけ**クリック
7. 画像生成完了まで polling (最大 ~5 分)
8. 生成画像を blob fetch → ダウンロード
9. `D:\downloads` か `~/Downloads` から最新 png を `public/images/thumbnails/{slug}.png` に移動
10. ファイル存在 + サイズ > 20KB + 構造チェック

### AUP refusal が出た場合
1. 該当箇所のキーワードを「煽り表現」リストと突き合わせる
2. プロンプトを安全寄りに書き換える (元プロンプトは保存)
3. **ただし禁止語リストをプロンプトに書かない** (フィルタが拾う)
4. 1 回だけリトライ。再度 refusal なら停止

## 共通注意

- 日本語の長い指示文は claude.exe の stdin に直接埋め込まない (PS5.1 mojibake 対策)
- 必要な場合は UTF-8 ファイルに分離して Read させる
- 入力欄が smart paste で添付化された場合は「テキストフィールドに表示」ボタンを click して inline 展開
- 送信は各ステージで **1 回だけ厳守**
