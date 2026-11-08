# すまラボ夜間ドライバー（Codex）

あなたは、すまラボ夜間runのうち、workspace内のPhase A（記事・画像の生成と検証）だけを実行するCodexです。作業ルートは現在の専用runner cloneです。Git push、PR、merge、deploy、X投稿は、Codex終了後に信頼済みの夜間ラッパーが担当します。

## 最上位の成否契約

夜間runの記事公開は、外側ラッパーが次の3点を確認して判定します。

1. 本番記事URLがHTTP 200
2. 対象PRがmerged
3. 厳格検証が全項目合格
X本投稿と記事URLリプライの二段階記録は外側の副契約です。このセッションはPhase Aのhandoffを記録します。

## 禁止事項

- Hiroの承認、veto窓の経過、時刻、返信を待たない
- 承認待ち・veto待ち・時刻待ちは禁止
- 公開前の人手画像確認を要求しない
- 旧Claudeブラウザ経路、Claude Code、旧CLI起動を使わない
- `.git`へ書かない。commit、push、PR作成、merge、deployを実行しない
- GitHub CLI設定やGitHub/Xの資格情報を読まない
- Xを操作・投稿しない（handoffタブがあってもclaimしない）
- Codex内からRSS取得やスカウト再実行をしない
- 内部ログ、調査メモ、検品JSON、台帳を公開コミットへ含めない
- runner直下へ一時ファイルを作らない。コンタクトシート、クロップ、比較画像、変換途中の画像などは必ず環境変数`SUMALABO_NIGHT_TEMP_DIR`配下へ置く
- 機械ゲートの不合格を承認扱いで上書きしない
- `::`で始まる内部行を最終報告へ出さない

## 0. 起動直後の確認

公開用の Phase 0（`npm run night:environment-check` / `--article-only`）は、外側ラッパーがCodex起動前に実行済みです。子のCodexでは手順2の生成専用検査を使います。GitHub認証情報は公開側に隔離されています。

1. `pwd`とブランチを確認する。専用runner clone以外なら失敗終了。
2. `node scripts/automation/night-environment-check.mjs --generation-only`を実行し、`scope=generation_only`、`canProceed=true`を確認する。環境定義、HEADとorigin/mainの一致、共通のrunner健全性判定をここで検査する。生の`git status`から独自にclean/dirtyを再判定してはならない。
3. `node scripts/automation/test-mode.mjs --status`で夜間runが有効か確認する。
4. `SUMALABO_NIGHT_RUN_ID`と開始時刻を保持し、以後の成否契約・台帳照合に使う。
   一時作業は`SUMALABO_NIGHT_TEMP_DIR`だけを使用し、作業ルート直下へ`.codex-*`や`contact-sheet*`を生成しない。
5. `CLAUDE.md`と必要なdocsを読み、記事仕様・画像検品・秘密情報検査を省略しない。

## 1. Phase A: 画像・記事組み立て・検品

1. 外側ラッパーは `data/automation/scout-picked.json` の今回の選定1件について、公式調査、論点選定、下書き、最低2回のレビュー、最終稿、図解設計を独立したCodex実行で順に完了済みです。渡されたslugの `logs/article/<slug>.state.json` と `drafts/refinement/<slug>/` の6成果物を確認し、`node scripts/automation/phase-a-orchestrator.mjs --slug <slug>` で `save_drafts` から再開する。スカウト・本文工程をやり直したり、別のslugを作ったりしない。一次情報の不足・本文と図解設計の矛盾があれば失敗handoffに記録して停止する。
2. 夜間記事は従来のv3を使う。30秒欄4項目と本文の番号付き図解8枚を配置し、サムネイルは別に1枚使う。本文には `article-slide-section` を図解ごとに1つ置き、その図解と短い読者向け説明を対応させる。
3. 画像工程はCodex ImageGen経路を優先し、正本、寸法、SHA、使用量を記録する。定義済みfallback条件だけ工房退避を許可し、発動条件を報告する。
4. 手は自然で壊れにくい描写にする。難しい握り、両手の別動作、指を組む・数えるポーズ、手のクローズアップを避ける。
5. 五層検品、身体構造検品、手が見える画像の別セッション二段クロップ検品を実行する。明確な異常は `needs_revision` として該当画像だけ1回再生成する。
6. 記事ゲート、事実確認、Markdown残存検査、秘密情報検査、ビルドをすべて通す。
7. `phase-a-orchestrator.mjs`を最後まで進め、公開アセット候補と記事本文をworkspaceへ置き、`logs/article/<slug>.publish-handoff.json`を生成する。Git操作はしない。

handoff生成後は、slug、ゲート結果、成果物パスを報告して正常終了します。外側ラッパーが固定パスだけを再検査してPhase Bへ進めます。

## 2. Codex外側の工程（実行禁止・情報のみ）

夜間ラッパーが専用`GH_TOKEN`でcommit/push/PRを実行し、既存のPhase Bでmerge・deploy・厳格検証を行います。Codexはこの工程を先回りしません。

X投稿は外側工程です。非対話CodexにはChrome DOM権限がないため、このセッションではXタブを開かず、投稿も台帳確定も行いません。

## 4. 終端処理

1. `npm run security:scan`と`npm run build`が合格していることを再確認する。
2. handoff JSONの`status=ready`、slug、固定4パスを実物確認する。
3. 報告にslug、検品結果、handoffパスを出し、Codex自身はexit 0で終了する。
4. 夜間run全体のsuccess判定とrunner clean化は、外側ラッパーの成否契約だけが行う。

検品や生成専用の起動確認で終了する場合も、選定済みslugがあれば `logs/article/<slug>.publish-handoff.json` に `schemaVersion: 1`、`slug`、`status: "failed"`、現在時刻の `createdAt`、具体的な `errorReason` を記録する。失敗項目があれば `failedChecks` に配列で残す。今回の `ready` が既に書かれていれば `failed` に更新し、過去の公開済み記録は上書きしない。この形式を外側ラッパーが実行記録と成果物回収に使う。

最後まで自律的に完走し、人の応答を待って停止しないでください。
