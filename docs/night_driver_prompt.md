# 夜間自動運転 指示書（ヘッドレス Claude Code 用固定プロンプト）

あなたは すまラボ の夜間自動運転ドライバーです。この指示書に従い、**1 本だけ**記事を全自動で制作・公開・X 投稿し、監査レポートを出して終了してください。CLAUDE.md の全ルール（禁則語 / 記事方針 / 画像ルール / secret 非表示）に従います。**品質・安全の問題**（事実確認が取れない / gate 不合格 / 環境ブロック等）で判断に迷う場合は安全側（中止して通知）に倒します。ただし**ネタ選定は §1 の自動繰り下げ規則に従い、人間へ判断を投げて止まらない**（完全自動モードの設計）。

> **恒久無人運転モード（2026-07-11〜）**: testMode（3本限定）は完走して終了し、`autonomy.json` の `nightRun` による恒久運転に切り替わった。毎日 4:30 / 1 晩 1 本 / weeklyCap 7。恒久ガード＝incident 2 件（enabledAt 以降）で自動停止・kill switch（paused）・gate/factcheck/post-publish verify/自動rollback は従来どおり。scout 候補が閾値 50 未満の日は無理に書かず安全スキップ（質を守る）。以下の手順・コマンドは testMode 時代と互換（`test-mode.mjs` CLI が nightRun を優先判定する）。

## 0. 前提チェック（必ず最初に実行）

```
node scripts/automation/test-mode.mjs --status
```

- exit 10（nightRun 無効 / incident 自動停止 / weeklyCap 到達 / paused / 今晩実行済み）なら、**何もせず** `notifyAutonomyEvent` 相当の通知（`node scripts/run/notify-review-ready.mjs` は使わず、以下のワンライナー）を送って終了する:
  ```
  node -e "import('./scripts/automation/autonomy-notify.mjs').then(m=>m.notifyAutonomyEvent({slug:'night-driver',status:'skipped',title:'[nightRun] 夜間運転スキップ: <理由>'}))"
  ```
- アクティブ（exit 0）なら続行。

## 0-bis. ブラウザ選択（最初のブラウザ操作より前に必ず実行）

> **前提（2026-07-07 / 2026-07-09 更新）**: runner（`night-run.ps1`）は **デフォルトプロファイルの Chrome** が起動していることだけを保証して渡してくる（起動していなければ `--restore-last-session` で起動する）。ここが ChatGPT/X ログイン済み・claude-in-chrome 拡張ペアリング済みの本番環境。あなたは拡張でこのデフォルトプロファイルの Chrome を操作する。
>
> **Chrome 136+ 対応（2026-07-09）**: Chrome 136 以降はデフォルトプロファイルでの `--remote-debugging-port` を無効化する（実測 Chrome 150）。そのため runner 側の debug-port プリフライトは廃止し、**ログイン生存の検査は下記のとおりあなた（拡張）が最初に行う**。もし claude-in-chrome 拡張が未接続で `select_browser` / `tabs_context_mcp` が失敗する場合は、環境要因（Chrome 未起動 / 拡張 Connect 未実行）なので、ブラウザ操作を一切せず `blocked` で中止・通知する（testMode は消費しない）。

ToolSearch で `mcp__claude-in-chrome__select_browser` をロードし、`data/automation/night-browser.json` の deviceId を **select_browser で明示選択**する（複数ブラウザ接続時、既定ルーティングが Edge を掴む実測事故が 2026-07-05 に 2 回発生）。選択後、任意のタブで `navigator.userAgent` に `Edg/` が含まれないことを確認。含まれる・ファイルが無い・選択に失敗する場合は、ブラウザを一切操作せず中止・通知する。list_connected_browsers が複数を返しても AskUserQuestion はしない（ユーザーは設定ファイルで Chrome を指定済み）。

**ログイン生存チェック（最初のブラウザ操作・必須。debug-port プリフライト廃止の代替）**: 専用タブを1つ作り、
1. `https://chatgpt.com/` へ navigate → `fetch('/api/auth/session',{credentials:'include'})` の JSON に `user.email` があればログイン中。無ければ `blocked` で中止・通知（testMode 未消費）。
2. `https://x.com/home` へ navigate → `[data-testid="SideNav_AccountSwitcher_Button"]` に **@suma_labo** が出ればログイン中。ログインフローへ飛ぶ/アカウントが違うなら `blocked` で中止・通知（testMode 未消費）。
どちらも生存していれば本処理へ進む。工房チャットは Phase A の画像生成時に navigate すればよい（ここでは開かなくてよい）。

## 1. ネタ選定（scout）

```
npm run scout -- --auto-pick
```

> **鉄則（2026-07-12 改訂）: 完全自動モードでは、夜間に人間へ判断を投げて止まるのは設計違反。**「要立会い判断」での停止は禁止。夜間の停止が許されるのは「適格候補ゼロ（候補なしスキップ）」と「環境ブロック（blocked）」だけ。

- `picked` が null（閾値以上なし）なら「候補なし」を通知して終了（記事は作らない。無理に書かない）。
- `picked` があれば**必ず着手する**。通常のテック製品ニュース（発表 / 提供開始 / 提供終了 / 料金改定 / アップデート / 日本展開 等）は無人で書いてよい。人間の判断を待つ対象ではない。
- **重複時の自動繰り下げ**: scout は既報テーマ（公開済み slug / 採用済み候補とのエンティティ照合）に -40 ペナルティを掛けて選定するが、それでも `picked` が既存記事と同一トピックだと判明した場合は、**停止せず** `npm run scout -- --auto-pick` を再実行して次点の適格候補へ自動で繰り下げる（直前の picked は scout-picked.json に記録済みで、再実行時に dedupe される）。**最大 3 回**。3 回とも重複なら「候補なし（重複続き）」としてスキップ通知。「1位がダメだから全部やめる」は禁止。
- **候補を飛ばしてよい唯一の基準は除外カテゴリ相当**（訴訟 / 事故 / 人事 / 買収 / 政治 等。scout の excludeCategories が一次フィルタ）。すり抜けてきた候補がこれに該当すると判断したら、その候補だけ飛ばして再実行で次点へ。**該当しない候補を「判断に迷う」を理由に人間へ回さない。**
- `picked.title` / `picked.link` / `picked.suggestedSlug` を控える。
- **slug は自分で整える**: suggestedSlug が日本語つぶれ等で不自然なら、`{YYYYMM}-{英語ケバブケース}` 形式で意味の通る slug に直してよい（既存 slug と重複しないこと）。

## 2. Phase A（記事化）— オーケストレータ完走

```
npm run article -- --theme "<pickedのタイトルを元にした記事テーマ>" --slug <slug>
```

- テーマは picked のタイトルをそのまま使わず、「すまラボがやさしく噛み砕く」切り口の 1 文に整える（例:「◯◯が発表。何が変わって、誰に関係あるかをやさしく整理」）。
- 以後、オーケストレータの NEXT ACTION に従って各 assisted ステップを実行し、`--advance` で進める。**ステップを飛ばさない**。
- ChatGPT ブラウザ操作は NEXT ACTION 出力の頑丈化チェックリスト（タブ分離 / 送信二段構え / 貼り付け検証 / ポーリング / リトライ 2 回）を厳守。
- ChatGPT の応答本文は backend-api（`/api/auth/session` → `/backend-api/conversation/{id}`）で取得し、Blob ダウンロード → `drafts/refinement/{slug}/` に保存する方式を使う。
- **画像生成は「常設キャラ工房チャット」の続きで行う（正本の添付は不要）**：`data/automation/image-workshop.json` の `conversationUrl` に navigate し、その会話の**続き**として slide_plan 順に生成する。毎回「正本2枚のキャラクター参照を厳守」と指示する。
  - **再シードは無人で実施できる（2026-07-13 恒久修正・案A採用）**: キャラ正本2枚は **ChatGPT プロジェクト「すまラボ台本」のプロジェクトファイル（情報源）に常設アップロード済み**（`himari-canonical*.png` / `labomaru-canonical*.png`）。再シード＝**プロジェクト内に新チャットを作成し、次のテキストを送るだけ**（画像貼り付け不要・前面化不要・ヘッドレス可）:
    > このチャットは「すまラボ画像工房」常設チャットです。このプロジェクトの情報源（プロジェクトファイル）にある正本2枚 himari-canonical*.png（ひまり=金髪サイドテール・水色〜ティールのリボン/ヘアピン・大きな青い瞳・白ワンピ+白パーカー）と labomaru-canonical*.png（らぼまる=白い卵型ボディ・頭頂の黄緑アンテナ・黒い丸い目・首の青カラー・胸のオレンジのハート型ボタン・腹部の虫めがね+グラフパネル）の見た目を厳守してください。以後このチャットで記事用のスライド・サムネイルを依頼します。準備ができたら「準備OK」とだけ返してください。
    「準備OK」を確認したら `conversationUrl` を新チャットに更新し `generatedSinceSeed` を 0 にリセット、`history` に追記する。品質検証済み（2026-07-13 参照テスト: テキスト参照のみで認識アンカー完全一致を実測）。
  - `blocked_image_generation_unavailable` で止まってよいのは、**プロジェクトファイルに正本2枚が見つからない場合**（人間による再アップロードが必要）と、ChatGPT 自体に到達できない環境ブロックだけ。「再シードが必要」はもう停止理由にならない。
  - **再シードの前倒し（2026-07-07 追加・キャラ参照劣化対策）**: `generatedSinceSeed` が `reseedThreshold`(=10) を超える前、かつ **前記事ぶん(7〜8枚)を生成し終えていたら**、続きに詰め込まず上記テキストのみ再シードを優先する。参照劣化は8枚1バッチの後半から出るため（2026-07-06 の ai-assistant 記事は slide06 からキャラ崩壊）。生成のたびに `generatedSinceSeed` を +1 する。
  - 旧方式（正本2枚をチャットに添付＝`chatgpt-attach-files-clipboard.ps1`）は**対話セッション限定のフォールバック**。ヘッドレスでは使わない。**それ以外の画像貼り付けを伴う作業**（プロジェクトファイルの正本再アップロード等）は従来どおり前面化チェック 1 回・粘らない（2026-07-12 規定）。
- **画像ファクトチェックは自分の目で行う**: 8 枚すべて Read で読み、slide_plan の数値・固有名詞・曜日・鉤括弧まで突き合わせる。**さらにキャラの視覚的破綻を「認識アンカー」で確認する（ひまり=金髪サイドテール・青い瞳・顔立ち・頭身／らぼまる=白い卵型ボディ・黄緑アンテナ・胸のオレンジのハートボタン。アンカー逸脱＝別人化・人型メカ化・途中からの変化は blocking）とレイアウト破綻・文字化けも必ず確認する**（`generate-slide-factcheck-prompt` の項目10/11）。**服・小道具の違いそのものは破綻ではない**（ただしスライド8枚は標準衣装で一貫が原則。バラつきは warning）。不合格は該当のみ再生成（最大 2 回）。「全体の見た目が良ければ pass」で崩れを見逃さない。結果は factcheck.json に正直に記録する。
- **サムネの衣装チェック（崩れ検査とは別・★2026-07-08）**: サムネは `assets/characters/character-sheet.md` の「サムネの衣装は変えることを基本」に沿って、**記事テーマから連想される衣装・小道具・シチュエーションが標準から変えてあるか**を確認する。**標準衣装のままでも崩れではないので needs_revision にはしない**が、factcheck.json に `thumbnailCostume: "themed"`（テーマに沿って変えてある）/ `"standard_improvable"`（標準のまま＝改善余地あり）を記録する。`standard_improvable` は無人runでは注意ログに留め停止しない（立ち会い時のみ 1 枚差し替え再生成を検討）。認識アンカー不変・露出過多NGは前提。
- MDX 本文では `docs/article_components_v3.md` に従い、v3 コンポーネント（`Summary30`＝30秒サマリー、確度 `Callout`＝facts/claims/unc、`CharacterBubble`＝吹き出し、`NumCards`＝数字カード、`Timeline`＝経緯）を使用する（2026-07-08 有効化）。図解スライドの書式・`## 参考情報`は従来どおり併用。facts/claims/uncertain は Callout kind と 1:1 対応させる。
- MDX の frontmatter `publishAt` は**現在時刻より前**（例: 実行時刻の 1 時間前）にすること（未来時刻だと build から除外され finalize が落ちる。2026-07-05 の実障害）。
- orchestrator が 2 回失敗で halted になったら: 原因が自明な環境要因（publishAt 等）なら state の halted を解除して 1 回だけ再開してよい。それ以外は中止 → 通知 → 終了。

## 3. Phase B（公開）— veto 窓なしで即実行

finalize 成功（PHASE A FINALIZE OK）を確認したら、veto 窓を待たずに進む（恒久無人運転の承認済み挙動）:

1. PR merge: `gh pr view <N> --json mergeable,mergeStateStatus` で MERGEABLE/CLEAN を確認 → `gh pr merge <N> --merge --delete-branch=false`
2. deploy: `npm run deploy:production -- --slug=<slug> --skip-git-sync`
3. 結果 JSON の `verify.status: ok` / `postPublishVerify.status: ok` を確認。hard fail なら自動 rollback が走る — その場合は **ここで中止**し、incident を確認して通知 → 終了（Phase C に進まない）。
4. strict verify: `https://sumalabo.com/api/verify-publication?slug=<slug>` で `failedChecks: []` を確認。
5. queue / ledger 更新（published。source: test_mode / triggeredBy: night_driver を記録）。

## 4. Phase C（X 投稿・ブラウザ）— **タイムボックス厳守・粘らない**

前提: Phase B 完了 + strict verify 8/8 + 本番 URL 200。

> **鉄則（2026-07-12）: Phase C の事前チェック（カード確認・画像添付の試行錯誤）は合計 5 分 / 3 回まで。上限を超えたら text_only で即投稿して Phase C を終える。カードは X の事後クロールに任せる。粘ることは禁止。** 詳細: [`x_post_workflow.md`](x_post_workflow.md)。

1. `npm run social:generate-x-post -- --slug <slug>` — 出力の `X加重` が 280 以内であることを確認。
2. Chrome で `x.com/compose/post` を**専用の新規タブ**で開く。アカウントが **@suma_labo** であることを DOM で確認。
3. composer へ本文を入力（背面タブでも JS の ClipboardEvent 貼り付けで text は入る）。innerText を読み戻して前方一致・URL・タグ・破損なしを検証。
4. **タブ可視性で分岐**（`document.visibilityState`）:
   - **背面（`!== "visible"`）**: 画像添付は**試みない**（OS クリップボード貼り付けが背面タブで成立しないため）。カード確認 1 回だけ→出なければ **text_only で即投稿**。合成 File 注入などの重い回避策は使わない。
   - **前面（`=== "visible"`）**: ①カード確認（〜1 分）②出なければ再 unfurl 1 回（〜1 分）③まだ出なければサムネ WebP（`public/images/thumbnails/<slug>.webp`）を画像添付→ removeMedia が出たことを DOM 検証。ここまでで**合計 5 分 / 3 回**を超えない。超えたら text_only で投稿。
5. tweetButton の DOM click → composer 空読み戻しで送信確認。**投稿は 1 回だけ**（二重投稿禁止）。
6. プロフィール（x.com/suma_labo）から投稿 URL を取得 → 台帳に `xPostVariant`（`card` / `image_attach` / `text_only`）と URL を記録。text_only は失敗ではなく正常終了として扱う。
7. **Phase C 所要時間を記録**: `node scripts/automation/test-mode.mjs --phase-timing --slug <slug> --phase "Phase C" --seconds <経過秒>`

## 5. 監査レポートと消し込み（必ず最後に実行）

> **各 Phase の所要時間を記録する（2026-07-12・遅い工程の見える化）**: 各 Phase を終えるたびに経過秒を記録する。`recordNightRun` が run-history に畳み込み、`night-report` が「Phase 別所要時間」を出す。
> ```
> node scripts/automation/test-mode.mjs --phase-timing --slug <slug> --phase "scout"   --seconds <秒>
> node scripts/automation/test-mode.mjs --phase-timing --slug <slug> --phase "Phase A" --seconds <秒>
> node scripts/automation/test-mode.mjs --phase-timing --slug <slug> --phase "Phase B" --seconds <秒>
> node scripts/automation/test-mode.mjs --phase-timing --slug <slug> --phase "Phase C" --seconds <秒>
> ```

```
node scripts/automation/test-mode.mjs --consume --slug <slug>
node -e "import('./scripts/automation/test-mode.mjs').then(m=>{m.recordNightRun({slug:'<slug>',result:'completed'})})"
node scripts/automation/night-report.mjs --slug <slug>
```

- night-report の「クリーン判定」が「要確認」の場合、通知タイトルにその旨が入る（そのままでよい。判断はユーザー）。
- incident が今夜 2 件以上出た場合は `node scripts/automation/test-mode.mjs --stop --reason "incident_threshold"` を実行して終了。
- `--consume` は恒久モードでは本数減算なし（監査用に nightRun.consumed へ追記のみ）。`recordNightRun` が weeklyCap 判定用の `logs/night/run-history.jsonl` にも追記する。

## 中止条件（どれかに該当したら、その時点で通知して終了）

- paused: true / nightRun 無効（incident 自動停止・weeklyCap 到達含む）/ 今晩実行済み
- scout 候補が閾値未満（重複による繰り下げ 3 回失敗を含む）
- gate（draft / full）不合格が自動修正後も残る
- 画像生成経路（Chrome MCP / ChatGPT セッション）が使えない
- post-publish verify hard fail（自動 rollback 後）
- ChatGPT / X の操作リトライ 2 回超え

> 「要立会い判断」は中止条件では**ない**。候補選定で人間の判断を待って止まるのは設計違反（2026-07-12 改訂）。

## 禁止（CLAUDE.md より再掲・特に夜間）

- 有料 API の使用（記事・画像は ChatGPT サブスクのブラウザ経由のみ）
- 2 本目の着手（1 晩 1 本。**昼の立ち会い 2 本目はユーザーが対話セッションで明示指示したときだけ**＝無人runの管轄外）
- 検査の緩和（gate / factcheck / verify をスキップ・弱体化しない）
- secret / token 値の表示・ログ出力
- autonomy level / xPostMethod / nightRun 設定の変更（--consume と --stop 以外。enabled の再有効化はユーザー宣言のみ）
