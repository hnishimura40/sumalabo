# AI記事v2：B7の初回公開記録と通常運用

2026-11-05更新。Hiroの「AI記事公開OK」を受領し、[PR #408](https://github.com/hnishimura40/sumalabo/pull/408)をマージして、[LifeVal記事](https://sumalabo.com/articles/202611-ai-lifeval-openai/)を2026-11-05 12:41 JSTに本番公開した。

**B7の初回確認は完了。** 11月5日の公開後レビューを受け、新規AI記事は従来のv3形式で生成する。LifeValは同日の19:47 JSTに改稿版を公開した。

## 公開の証拠

- 初回の実夜間実行：20261105T043002.121。架空の試験モデルを初回記事と数えていない。
- 承認記録：ai-article-template-v2.jsonのfirstPublicationApproval。version=2026-11-04、approvedBy=Hiro、approvedAt=2026-11-05T03:37:48.893Z、message=AI記事公開OK、対象slugとPR #408を記録。
- 承認時のMDX本文が不変であることを照合し、公式発表・論文・対応国一覧を再確認した。
- 公開前320/390/1280pxの横はみ出し0、本文図0枚、3分岐、ひまり・らぼまる1往復を確認。本番画面も白地のAI記事v2として表示。
- 記事ゲート違反0・警告0、関連14テスト、180ページビルドに合格。
- PRはmerged、マージコミットb5d454acafc67009a64a780ac094fcbbba9672fa。本番HTTP 200・strict verify、公開後hard 6項目とsoft 2項目がすべて合格。
- 本番サムネイルは190,724 bytes、承認済みファイルとSHA-256一致。画像を一覧・OGPのサムネイルとして維持。

10チェックIDはheadline-answer-align / answer-with-source / three-way-split / source-badges / one-figure / no-duplicate-summary / next-actions / tool-cards / stance-rule / changelog。初回記事は8項目pass、道具カードと見立ては対応する条件がなく理由付きnot_applicable。数値一致だけで意味の一致を確認済みとはせず、見出しが問う内容と答えの1文目、日本での利用と評価成績の区別も照合した。

## 実runの失敗と復旧を区別する

当初runは空の.gitkeepを非WebP画像と誤判定し、finalizeで失敗した。PR #410で空ファイルだけをGitメタデータとして除外し、正規HTTPSプレビューを復旧した。非空の.gitkeepと実際の非WebP画像は不合格のまま。

当初runのfailed記録を後からsuccessへ書き換えていない。明示承認後にマージ・本番配備を手動復旧し、正規ヘルパーで公開handoffをcompleted、保留記録をresolvedにした。介入台帳へrunId・対象記事・理由を追記し、当初の成否記録ファイルが不変であることを確認した。公開後訂正や新しい無人完走の実績とは数えない。

## 初回公開時点の運用

Scoutが実際に選んだ記事を、調査・読者翻訳設計・セルフレビュー・画像の独立検品を含む正規工程で作る。AI視点の記事は新規開始の--template-version ai-v2を状態へ保存し、再開・応答検品でも同じ型を使う。タイトルのAI関連語だけに型選択を任せない。

JSONモデルの10項目と本文量、サムネイル1枚と本文図0〜1枚、演出指定を検品する。旧形式の記事・調査・選定・セルフレビューの検査は維持する。不合格を短文や旧8枚構成へ変えて回避しない。該当しない見立て・道具カードは省略する。選定対象がなければ既存の安全スキップを維持する。

通常公開では既存の承認範囲・品質ゲートと、PR merged・本番HTTP 200・strict verifyのhard/soft全項目合格の主契約を維持する。Xの副契約は独立扱い。夜間起動スクリプト・Windowsタスク・Codex定期実行設定は変更していない。

## 戻す設定

新規生成を旧形式へ戻す場合はdata/automation/ai-article-template-v2.jsonのenabled=false。既存の公開本文自体を差し替える設定ではない。初回承認を捏造して解除しない。

## LifeVal改稿の本番確認（2026-11-05）

Hiroの「LifeValの改稿版、差し替えOK。公開後の確認まで進めて。」を受け、[PR #417](https://github.com/hnishimura40/sumalabo/pull/417)をマージした。プレビューのコミットは65afbe56931081fe1f63c7aa6950835193c2f732、マージコミットは67432801378a8262ba3f19981cf59d72cb8f092f。11月5日19:47 JSTに本番配備と検証が完了した。

本番HTTP 200、公開後の必須6項目と補足2項目、承認済みプレビューとの本文HTMLの一致を確認した。320/390/1280pxで横はみ出し0、スマホの目次から幼稚園探しの事例へ移動できることを確認した。既存サムネイルは本番画像のSHA-256が初版と一致し、ニュース一覧と共有用画像に使われている。

公開後修正は初回runの運用台帳に追記し、初回runの成否ファイルのハッシュを変更前後で照合した。

同日20:08 JST、改稿版に欠けていた本文図解を[PR #419](https://github.com/hnishimura40/sumalabo/pull/419)で8枚追加した。従来の本文内の配置、画像の拡大と切り替えを復元した。本番HTMLの8枚の順序、全画像と既存サムネイルのハッシュ、320/390/1280pxの表示、公開後の必須6項目と補足2項目を確認した。
