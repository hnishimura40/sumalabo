# すまラボ unattended Preview パイプライン マスタープロンプト

このファイルは `scripts/automation/run-claude-preview-pipeline-once.ps1` から
複数回の claude.exe サブセッションで読み込まれます。各サブセッションは PS 側から
個別の "STAGE" を stdin で受け取り、このファイルの該当セクションに従って動作します。

このプロンプトは **記事 1 本を「ユーザーが承認できる状態」まで持っていく** ためのものです。
Preview deploy できただけでは未完了です。

## 新標準記事構成 (絶対)

すまラボの記事は、**「長文を短くする」のではなく、「判断・比較・注意点を、表・カード・図解・フローで先に見せる」** 方針にする。文字数を削るのが目的ではない。情報量は維持し、構造で読みやすくする。

### 3-tier スクロールモデル (全タイプ共通)

| Zone | スマホ表示位置 | 役割 |
|---|---|---|
| Zone 1: 判断ゾーン | 冒頭 1 スクロール以内 | 読者がここだけで「自分に関係あるか / 読む価値あるか」を判定 |
| Zone 2: 理解ゾーン | 記事中盤 | 詳細な意味づけと判断材料。**ここで表・カード・図解を集中投下** |
| Zone 3: 深掘りゾーン | 末尾 | 背景・出典・関連リンク・CTA |

### 全タイプ共通の必須ブロック

冒頭 1 スクロール以内に必ず置く:
1. `<div class="summary-box"><p class="box-label">3行でわかるまとめ</p>` + 3 bullet
2. `<div class="check-box"><p class="box-label">この記事で整理すること</p>` + 4 bullet 前後
3. `<div class="summary-box"><p class="box-label">先に結論</p>` + 2-3 段落

中盤に必ず置く:
4. `<div class="table-card"><table>...</table></div>` または `<table>` (用語整理または比較)
5. `<section class="decision-guide-panel">` + `<ul class="decision-list">` (「○○な人 / ○○な人」を提示)
6. `<CharacterDialogue image="/images/characters/duo_talk_half.webp" lines={[...]}/>` 1 回以上 (内容を理解した後の反応)

末尾に必ず置く:
7. `## 参考情報` (公式情報 + 元報道リンク最低 2 件)

長段落 (400 字超) が続いたら `<div class="info-box">` / `<div class="check-box">` に分割する。

### 記事タイプ別の追加ブロック

**news (ニュース記事)**:
- リーク / 噂 / 公式発表前なら Zone 2 冒頭に `<div class="info-box">` で「公式発表ではない」注記
- Zone 2 に `<div class="check-box">` 「期待できること / 注意したいこと / 普通の人への影響」
- Zone 2 に `<section class="decision-guide-panel">` 「待つ人 / 待たなくてよい人 / 比較すべき人」
- Zone 3 に `## 今すぐできる判断` (現時点で取れるアクション 2-4 個)

**comparison (比較記事)** (slug に "comparison" または "-vs-" を含む foundation):
- Zone 1 末尾に `<div class="decision-guide-grid">` で「あなたはどっち？」2-3 カード並列
- Zone 2 に **メイン比較表** (`<div class="table-card">` で比較対象 × 観点)
- Zone 2 に `<section class="decision-guide-panel">` 「用途別おすすめ」
- Zone 2 に `<div class="info-box">` 「失敗しやすい選び方」
- 任意で価格帯別 / メーカー別の decision-guide-panel

**foundation (基礎解説記事)**:
- Zone 2 の核心位置に **用語表** (`<div class="table-card">` で 用語 × 意味 × 普通の人への影響)
- Zone 2 に「仕組みを 1 段落で」(`<div class="info-box">` または本文)
- Zone 2 に `<section class="decision-guide-panel">` 「向いている人 / 向いていない人」
- Zone 3 に `## 次に読むべき記事` (基礎 → 比較 / ニュース への導線)

### 完了条件 (Hard gate) — 視覚構造関連

以下が **すべて true でない限り** `preview_created` / `completedForUserApproval=true` にしない:

- `hasThreeLineSummary` — Zone 1 に `summary-box` + 「3行でわかるまとめ」
- `hasArticleRoadmap` — Zone 1 に `check-box` + 「この記事で整理すること」
- `hasDetailedConclusion` — Zone 1 に 2 つ目の `summary-box` (先に結論)
- `hasComparisonTable` — 本文に `table-card` または `<table>` が ≥ 1
- `hasDecisionGuide` — 本文に `decision-guide-panel` / `decision-list` / `decision-guide-grid` のいずれか ≥ 1
- `hasReferenceSection` — 末尾に `## 参考情報` セクション
- `characterDialogueVisualOk` — dist HTML に CharacterDialogue 出力 + 残存「<strong>ひまり：</strong>」「<strong>らぼまる：</strong>」 = 0

### 警告 (warning, 単独では block しないがレビュー対象)

- `firstScrollWithinBudget` — 判断ゾーンが 6000 bytes 以内 (1 スクロール想定)
- `tooManyLongParagraphs` — 400 字超段落が 5 個以上 = 警告
- `flowOrDiagramPresent` — 順序付きリストや `<ol>` などの図解相当があるか
- `endingHasCTAOrNextRead` — 末尾に「次に読む」「今すぐできる」などの CTA があるか

## 司令塔と作業員 (アーキテクチャ)

このパイプラインは **State Machine** です。司令塔は PowerShell/Node オーケストレーター (`run-claude-preview-pipeline-once.ps1`)。Claude.exe / sub-claude は **作業員** にすぎません。

### 作業員 (Claude worker) に許可されること
- ChatGPT への入力 / 本文取得
- サムネ生成チャットの操作
- 生成物 (draft / 画像) の保存
- **JSON で結果報告**

### 作業員に禁止されること (絶対)
- 「あとで続きをやる」判断
- `ScheduleWakeup` / `schedule` / `reminder` / `/loop` / `mcp__ccd_session` の使用
- 「待機します」「scheduled wakeup に引き継ぐ」「continue later」と言って exit
- 成果物未作成で `ok=true` を返すこと
- queue status / preview_created / 成功失敗の最終判断
- production deploy / main 直 push / X 投稿
- 別記事への波及
- AskUserQuestion (ユーザーはいない)

### 作業員出力フォーマット (最終行は必ず JSON 1 行)
- 成功: `{"ok": true, "stage": "...", "slug": "...", "outputs": [...], "summary": "..."}`
- 失敗: `{"ok": false, "stage": "...", "slug": "...", "reason": "...", "nextAction": "..."}`

### 司令塔 (orchestrator) が必ず実行すること
1. 作業員 stdout を保存
2. JSON を parse
3. JSON 無し → 失敗
4. `ok=true` でも成果物がなければ失敗
5. 成果物 (size / hash / 内容) を検査
6. 失敗時は queue を実態に合う status に
7. preview_created には絶対に進めない (20 hard gate 全 true 以外)

## State Machine — Stage 一覧 + 成功条件 (artifact-based)

| # | stageName | 主要成果物 | 成功条件 |
|---|---|---|---|
| 1 | `pre_flight` | (git state) | main / pull / clean tree |
| 2 | `candidate_selection` | (pickedTop) | 1 件選定 + resumeStage 決定 |
| 3 | `phase_a_prepare` | `logs/prompt/{slug}.article.md` + `logs/understanding/{slug}.json` | 両ファイル存在 |
| 4 | `queue_awaiting_chatgpt_generation` | queue | status 更新 |
| 5 | `phase_b_chatgpt` | `drafts/generated/{slug}.md` | size>0 + 3行まとめ + この記事で整理すること + 先に結論 + table-card/table + decision-guide + 参考情報 + smhn=0 |
| 6 | `queue_awaiting_import` | queue | status 更新 |
| 7 | `thumbnail_generation` | `public/images/thumbnails/{slug}.png` | exists + size>20KB + 画像として読める |
| 8 | `import_generated` | `content/articles/{slug}.mdx` | frontmatter + thumbnail 参照 + status=review |
| 9 | `preview_branch_push` | preview branch on origin | canonical 1 本 |
| 10 | `preview_deploy` | wrangler URL | deploy URL + alias URL parsed |
| 11 | `verify_notify` | notify result | 200 fetch + non-fallback + notify ok=true + sent>=1 (or idempotent skip) |
| 12 | `pr_create` | PR URL | gh / API で取得 + state=OPEN |
| 13 | `completion_gates` | (20 gates) | すべて true |
| 14 | `queue_update_final` | queue | `preview_created` + completedForUserApproval=true |

### Resume point (artifact-based, queue status 依存ではない)
orchestrator は **実ファイル** を見て resume 地点を決定:

- article prompt なし → `phase_a_prepare`
- article prompt あり / draft なし → `phase_b_chatgpt`
- draft あり / thumbnail なし → **`thumbnail_generation`**
- draft + thumbnail あり / mdx なし → `import_generated`
- mdx あり / preview URL なし → `preview_deploy`
- preview URL あり / notify なし → `verify_notify`
- notify あり / PR なし → `pr_create`
- 全部あり / gates 未評価 → `completion_gates`

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
0. **ブラウザ Chrome 固定確認**:
   - `list_connected_browsers` で候補列挙
   - 候補名 / process に "Microsoft Edge" / "Edge" / "msedge" / "msedge.exe" を含むものは reject
   - Chrome の候補が存在しなければ `chrome_not_connected` で停止
   - `switch_browser` で Edge にフォールバックしない
   - Chrome が見つかった場合のみ次へ
1. `list_connected_browsers` → Chrome が 0 台なら `chrome_not_connected` で停止
2. `select_browser` で Chrome を選択, `tabs_context_mcp(createIfEmpty)`, navigate to project URL
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

## STAGE: slide_plan_finalize (deterministic, no Claude/Chrome)

PR-B で追加された slide pipeline の第 1 段階。本文生成後に決定論的 Node スクリプトで
最終 slidePlan を確定する。Claude/Chrome は使わない。

### 入力
- slug
- understanding: `logs/understanding/{slug}.json`
- draft: `drafts/generated/{slug}.md` (任意。本文要約として活用)

### 手順
1. orchestrator が `node scripts/run/slide-plan-finalize.mjs --slug ... --understanding ... --draft ...` を実行
2. `drafts/slides/{slug}/slide-plan.json` が生成される
3. slidePlan.slides[] は各 slide に `purpose / format / title / mustInclude /
   characterRole.himari / characterRole.labomaru / props / factCaveats` を持つ
4. slideNeeded=false の場合は count=0 で書き出し、後続 slide stage をスキップ

### 失敗条件
- understanding.json が存在しない → no-op で `slideNeeded=false` placeholder を保存
- スクリプト exit != 0 → `Fail-Stage "slide_plan_finalize"`

### 禁止
- 固定枚数の slidePlan を勝手に作らない (記事内容で動的決定)
- 「普通の人」「みんな」「全員」を slidePlan のいかなる文字列にも入れない
- claude.exe / Chrome MCP を呼ばない (この stage は決定論的)

## STAGE: slide_draft_generation (PR-B では prompt 生成まで)

各 slide の画像生成プロンプトを生成し `drafts/slides/{slug}/prompts/{id}.md` に
書き出す。PR-B では **claude.exe carrier の invoke は行わない**。実画像生成は深夜
quiet-window でこの prompt を使って後続実走する。

### 入力
- slidePlan: `drafts/slides/{slug}/slide-plan.json`
- understanding: `logs/understanding/{slug}.json`

### 手順
1. orchestrator が `node scripts/run/slide-prompts-batch.mjs` を実行
2. slide ごとに prompt md を出力
3. queue: `slide_draft_ready` に遷移

### 失敗条件
- スクリプト exit != 0 → `Fail-Stage "slide_draft_generation"`

### 後続 (深夜 carrier で実走)
- prompt を OS clipboard 経由で ChatGPT に渡し、画像生成
- 生成画像を `drafts/slides/{slug}/images/{id}.png` に保存
- Chrome 固定 / Edge 禁止 / clipboard guardian / worker contract を維持
- ScheduleWakeup / later / reminder 禁止

## STAGE: slide_factcheck (PR-B では prompt 生成まで)

slide 全枚数の事実誤認・キャラ整合・道具の意味・文字密度をまとめて点検するプロンプト
を `drafts/slides/{slug}/factcheck-prompt.md` に書き出す。実 factcheck (Claude in
Chrome に画像添付) は別途。

### 入力
- slidePlan, understanding, draft, slide images

### 手順
1. orchestrator が `node scripts/run/slide-factcheck-prompt-build.mjs` を実行
2. prompt md を生成
3. queue: `awaiting_slide_factcheck` に遷移
4. carrier 実走後、結果 JSON を `drafts/slides/{slug}/factcheck.json` に保存
   (slides[].verdict = ok / needs_revision / ok_with_warning)

### 失敗条件
- スクリプト exit != 0
- factcheck.json が空 / unparseable

### 禁止
- 画像未生成のまま factcheck pass 扱いにしない (`slideFactcheckPassed` gate で
  blocking)

## STAGE: slide_revision (PR-B では prompt 生成まで)

factcheck で `needs_revision` の slide だけ修正版 prompt を生成する差分修正型。

### 入力
- slidePlan, understanding, factcheck.json

### 手順
1. orchestrator が `node scripts/run/slide-revision-prompts-build.mjs` を実行
2. needs_revision の slide ごとに `drafts/slides/{slug}/revision-prompts/{id}.md` 出力
3. queue: `slide_ready` に遷移
4. carrier 実走後、修正画像を `drafts/slides/{slug}/images/{id}.png` に上書き

### 失敗条件
- スクリプト exit != 0
- factcheck.json 不在で実行を試みた

### 禁止
- 全 slide を無条件再生成しない (差分のみ)
- 元 slide の title / purpose / format / mustInclude / characterRole を勝手に変えない

## STAGE: thumbnail (carrier mode)

### 設計思想

Stage 7 は **carrier mode (運搬役)** で動かす。Claude.exe / sub-claude に
`drafts/materials/{slug}.thumbnail-prompt.md` の本文を **読ませない**。
読み込ませると Anthropic AUP filter が記事固有のサムネ指示を評価して
refusal を返すことがある (AI ペンダント等の文脈で実例あり)。サムネは
ChatGPT の画像生成チャットで生成されるものであり、Claude は本文評価の
責務を持たない。

**司令塔 (PowerShell orchestrator) の責務:**
- `drafts/materials/{slug}.thumbnail-prompt.md` を `Set-Clipboard` で OS クリップボードに事前ロード
- Claude を carrier として起動し、機械的な手順 (添付・paste・送信・polling・保存) だけを依頼
- 成果物 PNG (size > 20KB, exists) で成否を判定

**carrier (Claude worker) の責務:**
- ChatGPT 新規チャットを開く
- ベース画像 2 枚を canvas + DataTransfer で添付
- 入力欄を focus
- **`Ctrl+V` でクリップボードから paste** (本文は読まない / 表示しない / 要約しない)
- 送信ボタン 1 クリック
- 生成画像を poll → 該当 `<img>` 要素を特定
- blob を fetch → download
- ダウンロードフォルダから target path へ Move
- 成果物 JSON 報告

### carrier に許可されないこと

- `Read` tool / `Bash cat` / `Get-Content` でサムネプロンプト本文を読む
- `mcp__Claude_in_Chrome__get_page_text` / `read_page` で paste 内容を確認する
- サムネプロンプト本文の要約・引用・解釈・評価
- ScheduleWakeup / schedule / cron / reminder / later
- 成果物未作成での `ok=true` 出力

### 入力
- slug
- (PS が事前ロード) **OS clipboard には thumbnail prompt 本文が入っている**
- basePngUrls (canvas fetch):
  - https://sumalabo.com/images/characters/base/himari-base.png
  - https://sumalabo.com/images/characters/base/labomaru-base.png

### 手順
0. **ブラウザ Chrome 固定確認** (Edge 拒否):
   - `list_connected_browsers` で候補列挙
   - "Microsoft Edge" / "Edge" / "msedge" / "msedge.exe" は reject
   - Chrome 候補が無ければ `chrome_not_connected` または `browser_mismatch` で停止
   - **Edge にフォールバックしない**
1. `list_connected_browsers` → Chrome が選べない場合は停止 (reason=chrome_not_connected | browser_mismatch | chrome_mcp_unavailable)
2. `select_browser` で Chrome 固定, `tabs_create_mcp`, navigate to https://chatgpt.com/ (新規 chat)
3. canvas attach:
   - JS で `<img crossOrigin="anonymous">` を 2 枚作って basePngUrls から load
   - canvas に drawImage して `canvas.toBlob('image/png')` で Blob 化
   - `new File([blob], 'himari-base.png' / 'labomaru-base.png')` で File 化
   - `new DataTransfer()` に add → `document.getElementById('upload-files').files = dt.files`
   - `dispatchEvent(new Event('change', { bubbles: true }))`
4. 添付カード 2 件が表示されたことを DOM 確認
5. **クリップボード verify-and-wait loop** (この時間帯は他プロセスが clipboard を上書きする可能性がある):
   - PS orchestrator が STA guardian を 1 秒周期で 30 分起動済み (期待長は PS が prompt 内で通知)
   - `navigator.clipboard.readText()` で長さ取得
   - 期待長 ± 30 以内なら次へ
   - そうでなければ 1.5 秒待って再読み込み (最大 60 回 ≒ 90 秒)
   - 収束しない場合は `clipboard_overwritten` で停止。**深夜帯 (22:00–06:00 JST) の quiet window に再実行する** 旨を nextAction に書く
6. **入力欄を focus → `Ctrl+V` (mcp__Claude_in_Chrome__shortcuts_execute) でクリップボードから paste**
   - **入力欄の内容を読まない / 表示しない**
   - paste 後 500ms 待って入力欄の文字数を確認し、期待長の 80% 未満なら verify-and-wait をもう1回 → Ctrl+V 再試行 (最大3回)
   - それでも反映されなければ `paste_did_not_land` で停止
7. 送信ボタンを **1 回だけ**クリック
8. 画像生成完了まで polling (最大 ~10 分) — `<img alt="生成された画像">` または src に `oaiusercontent` 含む要素を探す
9. 生成画像を blob fetch → ダウンロード
10. `D:\downloads` か `~/Downloads` から最新 png を `public/images/thumbnails/{slug}.png` に Move
11. ファイル存在 + サイズ > 20KB を Bash で確認 → JSON 報告 (dimensions / sha256 も含めると良い)

### 失敗 reason 標準語彙
clipboard 経路を維持する前提で、失敗は以下のいずれかで報告:
- `browser_mismatch` (Edge 等を検出)
- `chrome_not_connected`
- `chrome_mcp_unavailable`
- `clipboard_overwritten` (verify-and-wait が収束せず)
- `clipboard_content_mismatch` (長さは合うが内容 head が違う)
- `paste_did_not_land`
- `image_generation_timeout`
- `image_download_failed`
- `png_too_small`
- `aup_refused`
- `worker_handoff_attempted`

nextAction は **常に「retry in deep-night quiet window (22:00–06:00 JST) with Chrome only」** 系の表現にする。base64 transport / CDP 直接投入 / Edge フォールバックを勝手に提案しない。

### AUP refusal が出た場合
1. 該当箇所のキーワードを「煽り表現」リストと突き合わせる
2. プロンプトを安全寄りに書き換える (元プロンプトは保存)
3. **ただし禁止語リストをプロンプトに書かない** (フィルタが拾う)
4. 1 回だけリトライ。再度 refusal なら停止 (reason=`aup_refused`)

## 共通注意

- 日本語の長い指示文は claude.exe の stdin に直接埋め込まない (PS5.1 mojibake 対策)
- 必要な場合は UTF-8 ファイルに分離して Read させる
- 入力欄が smart paste で添付化された場合は「テキストフィールドに表示」ボタンを click して inline 展開
- 送信は各ステージで **1 回だけ厳守**
