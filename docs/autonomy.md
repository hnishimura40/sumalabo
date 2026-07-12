# すまラボ自動化レベル設計書（Autonomy Ladder）

最終更新: 2026-07-04
位置づけ: 「すまラボ記事制作・公開半自動化 引継ぎ文」のPhase A/B/C境界を段階的に緩和し、完全自動運用へ移行するための基幹文書。本文書が引継ぎ文と矛盾する場合、現在有効なレベルの定義が優先する。

## 0. 設計思想

- 停止点は「外す」のではなく「機械の検査+事後是正で置き換える」
- 各レベルへの昇格は、実績(連続クリーン本数)で機械的に判定する
- どのレベルでも、事故ったら自動で1つ下のレベルに戻る(error budget)
- どのレベルでも、ユーザーは即座に全停止できる(kill switch)
- 人間の役割を「事前承認」から「事後監査+例外対応」へ移す

> ゴール状態(L4): ユーザーは何もしなくても記事が出続け、週次ダイジェストを眺めて、気になる時だけ介入する。

## 1. レベル定義

### L0: 現行(停止点3つ)

Phase A完了後に停止 → Preview承認 → Phase B → 停止 → X投稿承認 → Phase C。

### L1: Phase B自動化(停止点2つ→1つ)

**動作:** Phase A完了(gate合格+Preview検証済み)後、Preview URLを通知し、veto窓(初期値30分)内に停止指示がなければ自動でPhase Bへ進む。本番反映後、post-publish verifyを自動実行し、hard failなら自動rollback(キャッシュパージ込み)+通知する。

**前提条件:** P1完了(deploy経路1本道) / P2完了(gate full組み込み) / P7完了(成果物保全) / rollback実測済み / post-publish verify実装済み / パージトークン設定済み+パージ実測1回完了 — 最後の1項目以外は達成済み(2026-07-04時点)。

**昇格条件:** L0運用で直近3本連続、人間のPreviewレビューで修正指示ゼロ(誤字・数値・画像差し替え含めゼロ)。加えてユーザーの明示宣言(autonomy.jsonのlevelを1に変更しmainへpush、REVIEW_NOTIFY_SECRETのActions secrets登録)。

**veto窓の短縮:** L1で3本連続クリーンなら窓を10分に、さらに3本で0分(即時公開+事後通知)にする。

### L2: Phase C自動化(停止点1つ→0、記事だしのみ人間)

**動作:** 本番公開の事後検査合格後、自動でX投稿する。投稿後にカード確認・投稿URL取得・台帳記録まで自動。

**前提条件:**

- X投稿をブラウザ操作からX APIに移行する。理由: ①無人のブラウザ自動投稿は不安定(UI変更・セッション切れ)かつXの自動化規約上のリスクがあり、APIが正規の自動投稿手段。②API投稿ならOGPカードはX側の非同期生成になり「貼り直し」問題そのものが消える。サイト側OGPの正しさはgateのOGP検査で事前保証する
- API利用枠の確認: 週1〜2本の低頻度なら無料枠で足りる可能性があるが、提供条件・料金は変わりやすいため契約前に必ず最新を確認する
- 投稿本文テンプレートの確定(final_articleのdescription+URLから機械生成。煽り表現はgateで検査済み)
- @suma_labo のAPIキーはsecret管理(表示・コミット禁止)

**昇格条件:** L1運用で3本連続、事後検査・rollbackの発動ゼロ。

### L3: Phase A完全無人化(人間はテーマ1行のみ)

**動作:** ユーザーがテーマまたはURLを1行投げると、L2までの全工程が無人で完走する。

**前提条件(技術的な最難関):**

- P5第2段階: Article Refinement LoopをChatGPT UIからAPI実行へ移す。Turn1〜6の役割分担・成果物ファイル構成は不変、実行主体のみ移す。移行判定は「同一テーマで両方式1本ずつ制作→品質比較で遜色なし」を確認してから
- 画像生成のAPI化: スライド8枚+サムネの生成〜保存が無人で回ること。キャラ正本リファレンス(P4)の添付を生成呼び出しに組み込む
- 画像ファクトチェックの機械化: 生成画像をVision系モデルでslide_planと突き合わせ、数値・誤字を検査。不合格スライドのみ自動再生成(最大2回、なお不合格なら停止して通知)
- 引継ぎ文の「停止してよい条件」は全て維持。無人化とは「順調なら止まらない」ことであり「異常でも止まらない」ことではない

**昇格条件:** L2運用で5本連続、人間の事後監査で重大指摘ゼロ。

### L4: 記事だし自動化(完全自動)

**動作:** ニュースソース監視が候補を検出→選定基準で自動採否→採用ならL3パイプラインへ投入。ユーザーは週次ダイジェスト(公開記事・PV・X反応・却下候補一覧)を受け取るのみ。

**前提条件:**

- ソース監視: 公式ブログ・リリースノートのRSS/更新検知。監視リストは data/automation/watch-sources.json で管理
- 選定基準の明文化: すまラボの主軸(難しいニュースをやさしく整理)への適合・確定情報の充足・既報とのdedupe を点数化し、閾値以上のみ採用
- 量の上限: 週N本(初期値2)の公開上限。超過分は候補プールに留めて週次ダイジェストで提示
- 炎上・誤報セーフティ: 訴訟・事故・人事・買収など事実関係が動きやすいカテゴリは自動対象から除外し、必ず人間判断に回す(除外カテゴリをwatch-sourcesに定義)

**昇格条件:** L3運用で5本連続クリーン+ユーザーの明示的なL4移行宣言(最後の一線は実績だけでなく意思決定で越える)。

## 2. 全レベル共通の安全装置

### kill switch

- data/automation/autonomy.json の paused: true で全フェーズが起動しない(実行中のものは現フェーズ完了で停止)
- finalize / Phase B / Phase C の各入口で必ず検査する(実装済み)

### error budget(自動降格)

- 「事故」の定義: 自動rollback発動 / 公開後の重大誤り発見(数値・価格・誤報) / X投稿の削除が必要になった事象
- 直近10本で事故2件以上 → levelを自動で1下げて通知(実装済み)。復帰は昇格カウントをゼロから

### 監査ログ

- finalize.json / verify.json に autonomyLevel と trigger(manual / auto_after_veto)を記録(実装済み)
- ledger(P3)完成後、各記事の公開レベルをledgerにも記録する

### 週次ダイジェスト

- L1運用開始後に実装: 公開記事一覧 / gate警告 / rollback有無 / X投稿結果 /(L4では)採用・却下候補の週1自動レポート

## 3. 実装順序(ロードマップとの接続)

- ✅ P1(deploy 1本道) / P2(gate) / P7(保全) / L1基盤(PR #92) / L1仕上げ(PR #93)
- ⬜ パージトークン設定+パージ実測(rollback訓練2回目と同時、要タイミング承認)
- ⬜ L0で3本クリーン → L1昇格(この間にP3台帳一本化・M1固定ページを並行)
- ⬜ L2実装: X API移行(提供条件確認→アプリ登録→投稿スクリプト→台帳記録)
- ⬜ L1で3本クリーン → L2昇格
- ⬜ L3実装: P5第2段階+画像生成API化+画像ファクトチェック機械化(最大工数。L2運用と並行)
- ⬜ L2で5本クリーン → L3昇格
- ⬜ L4実装: watch-sources+選定スコアラー+週次ダイジェスト
- ⬜ L3で5本クリーン+ユーザー宣言 → L4

> Track 2(M1固定ページ・M2回遊・M3 SEO)はL1〜L2運用期間に並行して進める。完全自動で出し続けるサイトこそAI利用ポリシーの明示(M1)が先に要る。

## 4. 実装ノート(PR #92 / #93 の実態)

- veto窓: finalizeがKV/review itemに previewReadyAt / vetoDeadline を記録し、通知にJST期限を明記。veto手段は承認UIのvetoボタンと functions/api/veto-preview.ts
- 自動起動: .github/workflows/auto-phase-b.yml が5分間隔cronで稼働。npm ciより前の軽量decideステップがautonomyゲートを検査するため、L0/paused中は毎回そこで終了(コスト最小・現行動作の保護)。Actionsはmainのautonomy.jsonを読むため、L1運用中のpaused化はmainへのpushが必要
- rollback: npm run rollback:production。CF Pages APIのdeployment rollbackを第1候補、builds/last-good/dist のwrangler再デプロイを第2候補とする2段構成。本番往復訓練実測: 往路3.8秒 / 復路15.1秒(strict verify込み)。rollback失敗時は paused: true を自動設定
- キャッシュパージ: 個別8URL(記事・トップ・一覧・sitemap2種・サムネ2種)→失敗時purge_everythingフォールバック。rollback成功後・hard fail経路・deploy:production成功直後の3箇所で発火。hard fail経路は --expect-gone で「旧内容が返らないこと」まで実フェッチ確認し、残留時は stale_cache_still_serving で通知+exit 1
- パージ用トークン: 現行 CLOUDFLARE_API_TOKEN はzone不可視のためパージ不可。環境変数 CLOUDFLARE_ZONE_PURGE_TOKEN(必要権限: Zone→Cache Purge→Purge、対象zone限定。CLOUDFLARE_ZONE_ID を直接設定すればZone Read不要)。未設定時は zone_not_visible でgraceful skip(rollback自体は成立)
- Actions secrets(L1昇格時): CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID は登録済み。残りは REVIEW_NOTIFY_SECRET と CLOUDFLARE_ZONE_PURGE_TOKEN
- Windows注意: Nodeはfetchハンドル残存時のprocess.exit()でexit codeが壊れる(0xC0000409)ため、自動化スクリプト群は自然終了方式で統一
- Deploy Hook: コード・運用文書・GitHub secret・Cloudflare設定の全層から撤去済み(2026-07-04)

## 5. 現在の状態

- 現行レベル: **L1**(autonomy.json: level 1 / paused false / vetoWindowMinutes 30)— 2026-07-05 ユーザー宣言により昇格
- L1昇格の根拠: 前提条件全達成(P1/P2/P7/rollback実測2回/post-publish verify/パージトークン+パージ実測)+ usage credits記事(202607)の Phase B/C クリーン完了(rollback 0 / incident 0 / 修正 0)を確認してユーザーが宣言
- Actions secrets: CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_ZONE_PURGE_TOKEN / CLOUDFLARE_ZONE_ID / REVIEW_NOTIFY_SECRET すべて登録済み(2026-07-05)
- クリーンカウント: **1/3**(クリーン1本目 = 202607-claude-fable-5-usage-credits-switch。Fable 5復活記事(202606)は公開前に修正指示があったため対象外)
- veto窓短縮の規定: L1でクリーン3本 → veto窓 30分→10分。さらにクリーン3本 → 0分(即時公開)。短縮の適用はユーザーが宣言する
- L1の動作: Phase A完了通知のveto窓(30分)内に停止操作(PWAのvetoボタン or autonomy.json paused: true)が無ければ、GitHub Actions(auto-phase-b.yml)がPhase Bを自動実行。公開直後にpost-publish verifyが走り、hard failなら自動rollback+incident記録

## 6. 恒久無人運転モード（nightRun・2026-07-11 ユーザー承認）

testMode（3 本限定の実弾テスト）は 3 本完走（Claude Science / ai-assistant / GPT-5.6 ChatGPT Work）して終了し、`autonomy.json` の `nightRun` キーによる **恒久無人運転** に切り替わった。

- **設定**: `nightRun: { enabled, mode: "permanent", scoutMode: "auto", scheduleTime: "04:30", maxPerNight: 1, weeklyCap: 7 }`（毎日 4:30 / 1 晩 1 本 / 週 7 本まで＝毎日 1 本ペース許容）
- **判定**: `test-mode.mjs --status` は nightRun キーがあれば恒久モードを優先判定（CLI 互換維持。night-run.ps1 / night_driver_prompt は無変更で動く）
- **本数制限に代わる恒久ガード**:
  - incident 2 件（`enabledAt` 以降）→ `enabled: false` に自動停止（再開はユーザーが宣言し enabledAt を更新）
  - kill switch（`paused: true`）→ 即 inactive
  - 1 晩 1 本（`logs/night/last-run.json`）
  - weeklyCap（`logs/night/run-history.jsonl` の直近 7 日 completed 数）
  - gate full / 画像ファクトチェック / post-publish verify＋自動rollback / 除外カテゴリは従来どおり（緩めない）
- **scout 品質ガード**: 候補スコアが閾値 50 未満の日は無理に書かず安全スキップ（「候補なし」通知のみ）
- **retract 時**: `npm run retract` は incident 記録に加えて nightRun も自動停止する

## 7. 昼の立ち会い制作も完走型に統一（2026-07-12 ユーザー承認）

夜間の無人 run（§6）と同様に、**ユーザーが対話セッションで記事制作を指示したら、Phase A → B → C（公開・X 投稿）まで確認なしで完走してよい**。Human Review Checkpoint（Phase A 完了時の停止）は昼の立ち会い制作でも**廃止**する。

- **既定の挙動**: 「◯◯のテーマで記事を書いて」等の記事制作指示を受けたら、記事化 → PR → merge → 本番 deploy → strict verify → queue/ledger 更新 → X 投稿までを止めずに実行する。途中で「公開してよいか」を聞き返さない。
- **停止してよい例外は 2 つだけ**:
  1. **除外カテゴリ該当**（訴訟 / 事故 / 人事 / 買収 / 政治 等。`watch-sources.json` の `excludeCategories` 相当）と判断したテーマ → 着手前に 1 度だけ確認
  2. **品質・安全のブロック**（事実確認が取れない / gate 不合格が自動修正後も残る / 画像生成経路が使えない / build・deploy・verify 失敗）→ 中止して報告
- **事後の取り消しは `npm run retract -- --slug <slug>`** で行う（本番記事の取り下げ + 該当 X 投稿の削除 + incident 記録）。公開前の逐一確認に代えて、事後 retract で是正する運用とする。
- **1 日の本数**: 昼の立ち会い制作は無人 run の「1 晩 1 本」ガードとは別枠（ユーザー指示ごとに実行）。ただし weeklyCap（§6・週 7 本）は運用の目安として意識する。
- **deploy 時間帯**: 4:00〜7:00 は引き続き回避する。

> この変更で、CLAUDE.md の「Phase A 完了時に必ず停止（Human Review Checkpoint）」は **ユーザーが記事制作を明示指示した立ち会いセッション**には適用しない（＝完走してよい）。ユーザーがテーマではなく「下書きだけ」「確認したい」等と明示した場合のみ従来どおり途中停止する。
