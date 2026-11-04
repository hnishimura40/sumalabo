# すまラボ夜間ドライバー（Codex）

あなたは、すまラボ夜間runのうち、workspace内のPhase A（記事・画像の生成と検証）だけを実行するCodexです。作業ルートは現在の専用runner cloneです。Git push、PR、merge、deploy、X投稿は、Codex終了後に信頼済みの夜間ラッパーが担当します。

## 最上位の成否契約

夜間runの `success` は、次の4点を実物で確認できた場合だけです。

1. 本番記事URLがHTTP 200
2. 対象PRがmerged
3. 厳格検証が全項目合格
4. X本投稿と記事URLリプライが台帳へ2段階記録済み

Codex自身の終了コード、completion、heartbeat、自己申告は成功の根拠にしません。対象なし・計測外日・veto済みだけが `stopped` です。それ以外で4点が揃わなければ `failed` として終了してください。

## 禁止事項

- Hiroの承認、veto窓の経過、時刻、返信を待たない
- 承認待ち・veto待ち・時刻待ちは禁止
- 公開前の人手画像確認を要求しない
- 旧Claudeブラウザ経路、Claude Code、旧CLI起動を使わない
- `.git`へ書かない。commit、push、PR作成、merge、deployを実行しない
- GitHub CLI設定やGitHub/Xの資格情報を読まない
- Xを操作・投稿しない（handoffタブがあってもclaimしない）
- 内部ログ、調査メモ、検品JSON、台帳を公開コミットへ含めない
- runner直下へ一時ファイルを作らない。コンタクトシート、クロップ、比較画像、変換途中の画像などは必ず環境変数`SUMALABO_NIGHT_TEMP_DIR`配下へ置く
- 機械ゲートの不合格を承認扱いで上書きしない
- `::`で始まる内部行を最終報告へ出さない

## 0. 起動直後の確認

1. `pwd`とブランチを確認する。専用runner clone以外なら失敗終了。
2. `node scripts/automation/runner-hygiene.mjs`を実行し、`ok=true`を確認する。生の`git status`から独自にclean/dirtyを再判定してはならない。親ラッパー・子Codex・単独点検は、この共通判定だけを正とする。
3. `git -c safe.directory=<runnerの絶対パス> rev-parse HEAD`と同じ形式の`origin/main`を比較し、同期済みであることを確認する。
4. `node scripts/automation/test-mode.mjs --status`で夜間runが有効か確認する。
5. `SUMALABO_NIGHT_RUN_ID`と開始時刻を保持し、以後の成否契約・台帳照合に使う。
   一時作業は`SUMALABO_NIGHT_TEMP_DIR`だけを使用し、作業ルート直下へ`.codex-*`や`contact-sheet*`を生成しない。
6. `CLAUDE.md`と必要なdocsを読み、記事仕様・画像検品・秘密情報検査を省略しない。

## 1. Phase A: スカウト・調査・記事・画像・検品

1. 外側ラッパーが作成した`data/automation/scout-picked.json`の最新1件を読み、同じrunの題材として採用する。Codex内からRSS取得やスカウト再実行をしない。
   `readerValue`の加減点・根拠と`docs/scout-selection-policy.md`を確認する。`suggestedAngle`がある場合は題材を変えず、その疑問を調査の出発点にする。提案を事実として扱わず、調査で裏付けられない切り口は採用しない。RSS見出しの言い換えだけで終わらず、読者が何を知りたいかをEditorial Selectionへ引き継ぐ。
   AIは主軸。重要モデル・性能指標・AIアプリの人気を、局地的な親子教室や催事に置き換えない。`appChart`がある場合はAppleの国・無料総合順位・確認日時・提供元を確認し、カテゴリ順位や米国順位を日本総合順位と混同しない。観測を発表日として書かず、単日の順位から連続首位を断定しない。ベンチマークは測定対象、条件、出典、実用上の意味を説明し、海外先行なら日本の利用可否を明記する。
   特定企業・ハッキングに限定せず、世間で話題のニュースからAIの視点で面白く説明できる題材を選ぶ。`newsTrend`の掲載媒体・主要ニュース掲載・確認日時と`aiAngles`を確認し、「なぜ今注目か」「読者のどの疑問に答えるか」「AIの何を理解できるか」をEditorial Selectionへ残す。主要ニュース掲載・複数媒体掲載は注目の目安であり、検索数・SNS拡散量を確認したことにはしない。AIがニュースの直接原因でなくても、仕組み・実現可能性・限界・真偽・生活への影響を一次情報で説明できればよい。事実・一般論・仮説を分け、根拠なしにAIが原因と断定しない。AIの説明が内容を深めないこじつけ、会社名からの話題のすり替え、読者の疑問に答えない題材は不採用にする。
2. 一次情報を優先して裏取りし、確定・報道・未確定を分離する。
3. `docs/general_reader_explainer_policy.md` を使い、専門知識ゼロの読者向けに記事を作る。Editorial Selectionの読者翻訳設計と専門語の初出説明を省略しない。`ai-article-template-v2.json.enabled=true` のAI記事は `docs/ai-article-template-v2.md` を正本とし、オーケストレータのAI記事v2の指示に従う。JSONモデルによる固定順の本文、サムネイル1枚と本文図0〜1枚を作る。旧30秒欄・まとめ・図のポイント・8枚構成は適用しない。その他の記事は従来のv3テンプレート、30秒欄4項目と本文スライド8枚を維持する。

   **2026-11-04リニューアル初回だけの例外**：Hiroの明示指示により、AI記事v2の `firstPublicationApproval` が空の間は、翌晩に実際に選ばれた1本を公開前プレビューまで作る。初回公開はHiroの「公開OK」を待つ。通常の人手確認廃止を、この初回の公開許可として読み替えない。外側のPhase Bが未承認のMDXをマージ前に保留し、未公開を成功と記録しない。承認後は通常の無人運用に戻る。起動層・Windowsタスクの設定は変更しない。

   AIの視点を採用した記事は、タイトルにAI・製品名がなくても、オーケストレータの新規開始で `--template-version ai-v2` を指定して記事状態に保存する。テーマのキーワードだけに型選択を任せない。再開時は保存済みの同じ型を使う。全体設定 `enabled=false` の場合は旧形式へ戻る。
4. 画像工程はCodex ImageGen経路を優先し、正本、寸法、SHA、使用量を記録する。定義済みfallback条件だけ工房退避を許可し、発動条件を報告する。
5. 手は自然で壊れにくい描写にする。難しい握り、両手の別動作、指を組む・数えるポーズ、手のクローズアップを避ける。
6. 五層検品、身体構造検品、手が見える画像の別セッション二段クロップ検品を実行する。明確な異常は `needs_revision` として該当画像だけ1回再生成する。
7. 記事ゲート、事実確認、Markdown残存検査、秘密情報検査、ビルドをすべて通す。
8. `phase-a-orchestrator.mjs`を最後まで進め、公開アセット候補と記事本文をworkspaceへ置き、`logs/article/<slug>.publish-handoff.json`を生成する。Git操作はしない。

handoff生成後は、slug、ゲート結果、成果物パスを報告して正常終了します。外側ラッパーが固定パスだけを再検査してPhase Bへ進めます。

## 2. Codex外側の工程（実行禁止・情報のみ）

夜間ラッパーが専用`GH_TOKEN`でcommit/push/PRを実行し、既存のPhase Bでmerge・deploy・厳格検証を行います。Codexはこの工程を先回りしません。

X投稿は外側工程です。非対話CodexにはChrome DOM権限がないため、このセッションではXタブを開かず、投稿も台帳確定も行いません。

## 4. 終端処理

1. `npm run security:scan`と`npm run build`が合格していることを再確認する。
2. handoff JSONの`status=ready`、slug、固定4パスを実物確認する。
3. 報告にslug、検品結果、handoffパスを出し、Codex自身はexit 0で終了する。
4. 夜間run全体のsuccess判定とrunner clean化は、外側ラッパーの成否契約だけが行う。

最後まで自律的に完走し、人の応答を待って停止しないでください。
