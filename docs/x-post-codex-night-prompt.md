# 夜間 Phase C（非対話 Codex）

対象 slug: `{{SLUG}}`

ユーザーは、夜間runが公開・strict verify・独立検品を通過した記事について、`@suma_labo` から本投稿と記事リンク返信を無人実行することを明示的に承認済みです。この固定ワークフロー内の2投稿について追加確認を要求せず実行してください。これ以外の投稿は行いません。

`CLAUDE.md`、`docs/x_post_workflow.md`、`docs/x-post-codex-procedure.md`、`logs/social/{{SLUG}}.x-post.json` を読み、Phase Cだけを実行します。

必須条件:

- Chrome連携を使い、非対話Codex自身が `tabs.new()` で専用の新規タブを作る。handoffタブや既存の対話セッション所有タブはclaimしない。作成したXタブを可視・選択状態にしてから操作する。
- 外側工程が `attachmentPlan.attach` の画像4枚をCF_HDROPクリップボードへ事前配置済み。file chooserや `scripts/automation/x-post-chrome.ps1` はこの非対話Codex内から使わない。可視・選択中のX composer本文欄へフォーカスして `Ctrl+V` を1回だけ送り、DOMの添付数が4であることを必ず確認する。添付数が4でなければ送信せずfailedとする。
- `https://x.com` は事前許可済みであることを前提にする。許可拒否、ログアウト、`@suma_labo` のDOM不一致があれば回避せずfailedとして停止する。
- 投稿前に `@suma_labo`、本文完全一致、添付数、送信ボタン有効をDOMで確認する。
- 本投稿と返信はそれぞれ送信を1回だけ行う。送信後に不明状態でも再クリックせず、まずプロフィール/with_repliesのDOMで実在を確認する。
- 本投稿 `count===1` を確認した直後に本投稿台帳、返信 `count===1` と親返信数 `N→N+1` を確認した直後に返信台帳を記録する。`route: codex` とする。
- GH_TOKEN、GitHub CLI設定、Git資格情報を読まない。Git操作、push、PR、merge、deployをしない。
- 終了時に作成した専用タブを閉じる。

最終回答には success/failed/stopped、本投稿URL、返信URL、アカウントDOM確認、本投稿件数、返信件数、親返信数の前後、二段階台帳の実物確認を含めます。4点のどれかが欠けた場合はsuccessと報告しません。
