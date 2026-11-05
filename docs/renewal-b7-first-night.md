# AI記事v2：B7の初回公開手順

2026-11-05更新。B1〜B6の型と検品を通常の夜間工程へ接続済み。`ai-article-template-v2.json.enabled=true`、`firstPublicationApproval=null`。今朝の既存夜間実行で実記事を生成し、[PR #408](https://github.com/hnishimura40/sumalabo/pull/408)まで作成した。手動の夜間runや追加スケジュールは開始していない。

現在は[LifeVal記事の初回HTTPSプレビュー](https://eb097687.sumalabo.pages.dev/articles/202611-ai-lifeval-openai/)の表示確認とHiroの「AI記事公開OK」待ち。320/390/1280pxで横はみ出し0、本文図0枚・3分岐・キャラクター1往復を確認。記事PRは未マージ、AI記事の本番公開は未実施。

## 次の実記事

既存Scoutが実際に選んだAI記事を、調査・読者翻訳設計・セルフレビュー・画像の独立検品を含む正規工程で作る。比較用の架空モデルや既存記事の着せ替えを「翌晩の1本」と数えない。選定対象がなければ既存の安全スキップを維持する。

AI本文はJSONモデルの10検品項目と本文量、画像計画はサムネイル1枚と本文図0〜1枚、キャラクターの演出指定で検査する。旧形式の記事・調査・選定・セルフレビューの応答検査は維持する。検品の不合格を短文や旧8枚構成へ変えて回避しない。

AI視点の記事は新規開始時の `--template-version ai-v2` を状態へ保存する。タイトルにAI関連語がない一般ニュースでも、ScoutとEditorial Selectionが採用したAIの視点に従って型を固定できる。記事ブリーフもAIの分類・タグに応じて新しい固定構成を出し、旧「先に結論」の提案と混在させない。

## 公開前に止める位置

正規Phase AでプレビューとPRまで用意する。Phase BはPRの変更MDXをhead SHA指定で読み、AI記事v2の初回承認がなければマージ前に保留する。マージも同じSHAを指定する。取得失敗や不明なSHAは失敗扱いで止める。配信直前のHTML承認検査も残す。

Hiroへ320/390/PC幅のスクリーンショットと、以下のIDを含む検品記録を提示する：headline-answer-align / answer-with-source / three-way-split / source-badges / one-figure / no-duplicate-summary / next-actions / tool-cards / stance-rule / changelog。該当しない項目は理由を記録する。意味の一致と一次情報はコード検査だけで確認済みとしない。

Hiroの明示した公開OKを受けた記事だけ、承認記録のversion・approvedBy・approvedAt・対象記事を保存する。根拠の鮮度を再照合し、記事PRのマージ→本番配備→実HTTP 200・GitHub merged・strict verifyのhard/soft全項目合格を確認する。未公開の初回保留を夜間runのsuccessと記録しない。既存の主契約、Xの副契約と起動層は変えない。

## 戻す設定

新規生成を旧形式へ戻す場合は `data/automation/ai-article-template-v2.json` の `enabled=false`。初回公開承認を捏造して解除しない。既存の公開本文自体を差し替える設定ではない。

## 実施と未実施

接続時の回帰検査54件と179ページのビルドは合格。今朝の実記事は180ページのビルド・記事ゲート違反0/警告0とHTTPSプレビューの検証まで完了した。初回の実runは空.gitkeepの画像誤判定でfinalizeに失敗し、修正後にプレビュー工程を復旧した。当初runの失敗を成功へ書き換えていない。Hiroの初回表示確認・公開承認、記事PRのマージ・本番公開とstrict verifyは未実施。夜間の起動スクリプト、Windowsタスク登録、Codexアプリの定期実行設定は変更していない。
