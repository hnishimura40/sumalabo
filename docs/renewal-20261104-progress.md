# 2026-11-04 リニューアル導入記録

A1〜A5は段階ごとのPRを順番にmainへマージ済みです。A6は表示修正後の公開確認待ち、B1〜B6は依存関係を保ったDraft PRです。本番デプロイは実施していません。

| 段階 | PR | 主な変更先 | 戻す設定・状態 | 検証 |
|---|---|---|---|---|
| A1 | [387](https://github.com/hnishimura40/sumalabo/pull/387) | docs/editorial-identity-addendum.md、data/automation/product-comparison-picks.json、sumalabo-editorial-identity.json、product-comparison-identity.mjs | renewal.enabled=false | 既存18テスト・秘密情報検査 |
| A2 | [388](https://github.com/hnishimura40/sumalabo/pull/388) | product-comparison-picks.mjs、product-comparison-article.mjs | renewal.enabled=false | verified限定・重複排除・該当なしの回帰テスト |
| A3 | [389](https://github.com/hnishimura40/sumalabo/pull/389) | product-comparison-watch.json、構造化ポリシーの型付きフィールド、validateRenewalFacts | renewal.enabled=false | 必須フィールド・国内窓口・製造国追加調査の検証 |
| A4 | [390](https://github.com/hnishimura40/sumalabo/pull/390) | product-comparison-renewal.mjs、ComparisonRenewalPresentation.astro、ComparisonPriceButtons.astro | renewal.enabled=falseで新規生成を旧形式へ | 最終統合ビルド179ページ、比較記事の回帰テスト |
| A5 | [391](https://github.com/hnishimura40/sumalabo/pull/391) | BaseLayout.astro、src/config/site.ts | scrollNavigation=false | ナビ横スクロール・フェードを表示確認 |
| A6 | [392](https://github.com/hnishimura40/sumalabo/pull/392) | 初回ルーターMDX、ArticleLayout.astro、BaseLayout.astro、記事ルート、renewal-release-gate.mjs | 公開OK待ち。外側レイアウトはrenewalArticleLayout=false | 旧タイトルカード・旧大サムネイル・ダーク背景を撤去。320/390/1280pxを実測。記事ゲート重大違反0、警告5 |
| B1 | [393](https://github.com/hnishimura40/sumalabo/pull/393) | docs/ai-article-template-v2.md | 文書のみ | 仕様を配置 |
| B2 | [394](https://github.com/hnishimura40/sumalabo/pull/394) | ai-article-v2.mjs、AiArticleV2.astro、生成プロンプト、phase-a-orchestrator.mjs | ai-article-template-v2.jsonのenabled=false | 固定順の構造化モデル・図0〜1枚・ひまりとらぼまる1往復 |
| B3 | [395](https://github.com/hnishimura40/sumalabo/pull/395) | ai-v2-sources.mjs、generate-article-brief.mjs | enabled=false | 公式ドメイン・確認済み日付。報道は答えと3カラムの根拠に使用不可 |
| B4 | [396](https://github.com/hnishimura40/sumalabo/pull/396) | ai-v2-stance.mjs、設定の4パターン | enabled=false | 一致する型だけを定型で出力。自由生成は拒否 |
| B5 | [397](https://github.com/hnishimura40/sumalabo/pull/397) | ai-v2-tools.mjs、comparison-published-picks.json、公開ack | enabled=false | マージ・本番同一バージョン・strict verify確認後のみ登録。未作成カテゴリは省略 |
| B6 | 本PR | ai-v2-checks.mjs、記事ゲート、既存検品のv2対応、回帰テスト | enabled=false | 関連52テスト成功。表示試験用データで320/390/1280pxの横はみ出し0 |

生成の主設定は比較記事が `data/automation/sumalabo-editorial-identity.json` の `renewal.enabled`、AI記事が `data/automation/ai-article-template-v2.json` の `enabled` です。どちらもfalseを維持しています。表示済み本文そのものを旧原稿へ差し替える操作とは区別します。

A6では6個のチェックID（editorial-picks / reading-order / no-repeated-cells / origin-escalation / price-buttons / mobile-overflow）を確認しました。製造国は公式の日本製表示がある1候補を確定し、残り9候補は型番別のFAQ・取扱説明書を調べた結果を保存して未確認のまま残しました。国内窓口と製造国は別の判断です。

B6では10個のチェックIDを検品結果に返します。旧Summary30必須検査はv2モデルの10項目へ置き換え、禁則・正式名称・専門語の初出説明・画像参照等の検査を維持します。手書きHTMLで新形式のマーカーだけを付けても、モデルがなければ不合格です。見出しと答えのコード検査は数値・条件語の照合であり、意味の一致は既存のセルフレビューとB7の初回表示確認でも判定します。比較記事の同一セル文言と、audioの「形で選ぶ」1枠内に複数代表が入るケースも回帰検査します。

AI表示試験は架空の試験用データです。実際の翌晩の記事を生成・公開したものではなく、B7の初回確認を完了扱いにはしていません。一時的な試験ページは最終ビルドから削除しています。

初回の本番配備にはカテゴリ・記事種別ごとのHiro承認記録（version、approvedBy、approvedAt）が必要です。承認がないHTMLを含む場合、正規の本番配備処理は停止します。A6とB7の「公開OK」は別に扱い、他カテゴリの初回公開もそれぞれ保留します。承認後に価格・根拠の鮮度と実際の公開結果を再確認します。

A7の月次通常運用への復帰、1か月の観察、B7の翌晩初回記事の確認は公開後・初回生成後の工程です。夜間起動層・Windowsタスク登録・Codexの定期実行設定・Scoutの選定規則は変更していません。公開後の観察やFable監査を実施済みとは扱いません。
