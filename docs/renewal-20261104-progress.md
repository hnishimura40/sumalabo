# 2026-11-04 リニューアル導入記録

## 現在地（2026-11-05）

- 本番公開済み：ルーター #392、充電器 #402、バッテリー #403。表の配色修正、サムネイル維持、計測 #406も反映済み。
- イヤホン #404：320/390/PC幅のプレビューと検品済み。「イヤホン公開OK」待ち。
- AI記事 #408：Hiroの「AI記事公開OK」後、2026-11-05 12:41 JSTに[LifeVal記事](https://sumalabo.com/articles/202611-ai-lifeval-openai/)を公開済み。PR merged・本番HTTP 200・strict verifyおよび公開後hard/soft全項目合格。承認時の本文とサムネイルを維持。実run当初の失敗記録は維持し、手動復旧の介入記録を追記。B7初回確認は完了。詳細はdocs/renewal-b7-first-night.md。
- GA4：本番ストリームと既存導線イベントの受信を照合済み。価格クリックは検証用に1回実施し、11月4〜5日のData API照会では受信未確認。AI道具カードの実受信、集計用カスタムディメンションの登録、1か月の観察が残る。
- Fable：公開4記事で月次監査の手順を試行。公式の定期実行で毎月2日09:00 JSTを指定できることを確認。公開ページへのアクセスと条件付き通知の確認後に登録する。運用の詳細は[観察・Fable監査の手順](renewal-observation-and-fable-handoff.md)。

以下は導入時点ごとの履歴。初回承認・公開・観察がすべて完了したとは扱わない。


A1〜A7は段階別PRでmainへ導入済みです。ルーターは2026-11-04にHiroの公開OK後、PR #392をマージして本番公開し、#399で比較表の配色を修正しました。B1〜B6も段階別PRで導入済みです。充電器はPR #402、バッテリーはPR #403をHiroの個別承認後に公開済み。イヤホンはPR #404の初回表示確認待ち、AI記事はB7の実記事確認待ちです。

| 段階 | PR | 主な変更先 | 戻す設定・状態 | 検証 |
|---|---|---|---|---|
| A1 | [387](https://github.com/hnishimura40/sumalabo/pull/387) | docs/editorial-identity-addendum.md、data/automation/product-comparison-picks.json、sumalabo-editorial-identity.json、product-comparison-identity.mjs | renewal.enabled=false | 既存18テスト・秘密情報検査 |
| A2 | [388](https://github.com/hnishimura40/sumalabo/pull/388) | product-comparison-picks.mjs、product-comparison-article.mjs | renewal.enabled=false | verified限定・重複排除・該当なしの回帰テスト |
| A3 | [389](https://github.com/hnishimura40/sumalabo/pull/389) | product-comparison-watch.json、構造化ポリシーの型付きフィールド、validateRenewalFacts | renewal.enabled=false | 必須フィールド・国内窓口・製造国追加調査の検証 |
| A4 | [390](https://github.com/hnishimura40/sumalabo/pull/390) | product-comparison-renewal.mjs、ComparisonRenewalPresentation.astro、ComparisonPriceButtons.astro | renewal.enabled=falseで新規生成を旧形式へ | 最終統合ビルド179ページ、比較記事の回帰テスト |
| A5 | [391](https://github.com/hnishimura40/sumalabo/pull/391) | BaseLayout.astro、src/config/site.ts | scrollNavigation=false | ナビ横スクロール・フェードを表示確認 |
| A6 | [392](https://github.com/hnishimura40/sumalabo/pull/392) | 初回ルーターMDX、ArticleLayout.astro、BaseLayout.astro、記事ルート、renewal-release-gate.mjs | 公開済み。外側レイアウトはrenewalArticleLayout=false | 旧タイトルカード・旧大サムネイル・ダーク背景を撤去。320/390/1280pxを実測。記事ゲート重大違反0、警告5 |
| A7 | [400](https://github.com/hnishimura40/sumalabo/pull/400) | renewal.enabled=true、月次手順書 | falseで旧生成へ | 通常コマンドで新形式生成、34テスト成功。既存の起動設定は変更なし |
| B1 | [393](https://github.com/hnishimura40/sumalabo/pull/393) | docs/ai-article-template-v2.md | 文書のみ | 仕様を配置 |
| B2 | [394](https://github.com/hnishimura40/sumalabo/pull/394) | ai-article-v2.mjs、AiArticleV2.astro、生成プロンプト、phase-a-orchestrator.mjs | ai-article-template-v2.jsonのenabled=false | 固定順の構造化モデル・図0〜1枚・ひまりとらぼまる1往復 |
| B3 | [395](https://github.com/hnishimura40/sumalabo/pull/395) | ai-v2-sources.mjs、generate-article-brief.mjs | enabled=false | 公式ドメイン・確認済み日付。報道は答えと3カラムの根拠に使用不可 |
| B4 | [396](https://github.com/hnishimura40/sumalabo/pull/396) | ai-v2-stance.mjs、設定の4パターン | enabled=false | 一致する型だけを定型で出力。自由生成は拒否 |
| B5 | [397](https://github.com/hnishimura40/sumalabo/pull/397) | ai-v2-tools.mjs、comparison-published-picks.json、公開ack | enabled=false | マージ・本番同一バージョン・strict verify確認後のみ登録。未作成カテゴリは省略 |
| B6 | [398](https://github.com/hnishimura40/sumalabo/pull/398) | ai-v2-checks.mjs、記事ゲート、既存検品のv2対応、回帰テスト | enabled=false | 関連52テスト成功。表示試験用データで320/390/1280pxの横はみ出し0 |
| B7 | [408](https://github.com/hnishimura40/sumalabo/pull/408) | LifeVal実記事・AI初回承認記録 | enabled=falseで新規生成を旧形式へ | 14テスト・180ページビルド・ゲート違反0/警告0、PR merged・HTTP 200・公開後hard/soft全項目合格 |


生成の主設定は比較記事が `data/automation/sumalabo-editorial-identity.json` の `renewal.enabled`、AI記事が `data/automation/ai-article-template-v2.json` の `enabled` です。比較・AI記事ともtrueです。AI記事の初回公開承認はnullのまま、実際の翌晩の1本をプレビューしてから承認を受けます。B7の接続と保留位置は `docs/renewal-b7-first-night.md` を参照。表示済み本文そのものを旧原稿へ差し替える操作とは区別します。

A6では6個のチェックID（editorial-picks / reading-order / no-repeated-cells / origin-escalation / price-buttons / mobile-overflow）を確認しました。製造国は公式の日本製表示がある1候補を確定し、残り9候補は型番別のFAQ・取扱説明書を調べた結果を保存して未確認のまま残しました。国内窓口と製造国は別の判断です。

B6では10個のチェックIDを検品結果に返します。旧Summary30必須検査はv2モデルの10項目へ置き換え、禁則・正式名称・専門語の初出説明・画像参照等の検査を維持します。手書きHTMLで新形式のマーカーだけを付けても、モデルがなければ不合格です。見出しと答えのコード検査は数値・条件語の照合であり、意味の一致は既存のセルフレビューとB7の初回表示確認でも判定します。比較記事の同一セル文言と、audioの「形で選ぶ」1枠内に複数代表が入るケースも回帰検査します。

AI表示試験は架空の試験用データです。実際の翌晩の記事を生成・公開したものではなく、B7の初回確認を完了扱いにはしていません。一時的な試験ページは最終ビルドから削除しています。

初回の本番配備にはカテゴリ・記事種別ごとのHiro承認記録（version、approvedBy、approvedAt）が必要です。承認がないHTMLを含む場合、正規の本番配備処理は停止します。A6のルーター・充電器・バッテリー公開OKを記録済みです。イヤホンとB7のAI記事の初回公開はそれぞれ保留します。承認後に価格・根拠の鮮度と実際の公開結果を再確認します。

A7の通常生成設定は有効化済みですが、翌月の実行結果、1か月の観察、B7の翌晩初回記事の確認はまだ実施していません。夜間起動層・Windowsタスク登録・Codexの定期実行設定・Scoutの選定規則は変更していません。公開後の観察やFable監査を実施済みとは扱いません。


## ルーター公開後の実測

PR #392のマージ、本番HTTP 200、同一比較バージョン36a659401fccf941a7b66594、strict verifyおよび公開後hard/soft全項目合格を確認済み。320/390/1280pxで白背景・黄色見出し・横はみ出し0を確認。既存サムネイルを一覧・OGP・Twitterカードへ維持し、本番画像ハッシュ一致も確認しました。

B5の道具カードは、この実公開の証拠と一致するルーターの今月の1台だけを登録します。他カテゴリは実公開と同一バージョン・strict verifyを照合してから追加します。「迷ったらこれ」が該当なしのカテゴリは空カードを作りません。


## 残りの接続と観察準備

B7準備はPR #405で導入済み。AI生成を有効化し、旧形式と新形式の応答検品を分け、未承認AI記事は固定head SHAのMDX確認後、マージ前で保留します。関連54テストと179ページビルドに合格。翌晩の実記事・Hiroの初回表示確認・初回公開は未実施です。専用runnerの既存エントリが起動時にorigin/mainを取得してdetached checkoutすることを読み取り確認し、runner本体や起動設定は書き換えていません。

公開後のクリック計測とFableへの監査指示はdocs/renewal-observation-and-fable-handoff.mdに記録します。計測のコード検査と実際のGA4受信・1か月の成果は区別します。Fableスケジュールは現在の接続ツールから登録・読み返しできず、登録済みとは扱いません。

AI視点を持つ一般ニュースでも型が旧形式へ戻らないよう、新規開始の--template-version ai-v2を記事状態へ保存する経路を追加しました。AI分類のブリーフも新しい固定構成を出し、旧「先に結論」と混在させません。実際の記事や公開承認をこの設定から生成したことにはしません。


## 2026-11-05の実行確認

今朝の実夜間runはAI記事v2のLifeVal記事を生成し、PR #408まで作成しました。記事状態にはtemplateVersion=ai-v2が保存されています。ただし正規finalizeが、本文図0枚の空フォルダ保持用.gitkeepを非WebP画像として扱い、プレビュー作成前に停止しました。当初の夜間runはouter_publish_failedのまま保持し、後日の修復を当初runのsuccessに書き換えません。

空の.gitkeepだけをGitのメタデータとして除外する修正を追加しました。非空の.gitkeepは従来どおり不合格、PNG等の非WebP判定も維持します。実際のPR #408原稿で180ページをビルドし、記事ゲート違反0・警告0。正規finalizeを再実行し、CloudflareのHTTPSプレビュー・HTTP 200・実記事タイトル・review_waiting登録まで成功しました。これは本番公開ではありません。

未完了は、イヤホンPR #404の初回公開承認、AI記事PR #408の初回表示確認と公開承認・本番検証、Fable監査の登録と読み返し、GA4の実受信確認・1か月の観察です。初回承認を推測して記録しません。夜間起動層・Windowsタスク・Codex定期実行設定は変更していません。


## AI初回公開の実測（2026-11-05）

Hiroの「AI記事公開OK」を2026-11-05に受領し、PR #408へ承認記録を保存。承認時のMDX本文に変更がないことを照合し、公式発表・論文・対応国一覧を再確認しました。初回記事は https://sumalabo.com/articles/202611-ai-lifeval-openai/ 。マージコミットは b5d454acafc67009a64a780ac094fcbbba9672fa、本番配備完了は2026-11-05 12:41 JSTです。

PR merged・本番HTTP 200・strict verify合格、公開後hard 6項目とsoft 2項目がすべて合格。本番画面は白地、AI記事v2の3分岐と固定順で表示され、公開前320/390/1280pxの横はみ出し0を維持。サムネイルは190,724 bytes、SHA-256 ae65ae190bec5bcc998d4a0697e3b77733d85312e48847dbaa5d9658b48cc23f が承認済みファイルと一致しました。

当初の夜間run（20261105T043002.121）のfailed記録は変更していません。正規ヘルパーで公開handoffをcompleted、保留記録をresolvedにし、明示承認後の手動復旧を介入台帳へ追記しました。次回からAI記事v2は既存の通常運用の範囲に戻り、同じ初回表示確認は繰り返しません。夜間起動層・Windowsタスク・Codex定期実行設定は変更していません。

残る未完了はイヤホン初回公開承認、Fable監査の登録・読み返し、GA4実受信確認と1か月の観察です。
