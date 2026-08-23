# X投稿・単発無人実行手順（claude-in-chrome）

この文書は、Hiroが不在の時間に単発予約された記事だけを、夜間run Phase Cと同じ `claude -p --chrome` + `claude-in-chrome` 経路で投稿するための実行プロンプトです。通常の有人投稿はCodex対話モードを基本とし、この経路は明示予約時だけ使います。

## 実行対象

- slug: `{{SLUG}}`
- 本番URL: `https://sumalabo.com/articles/{{SLUG}}/`
- 投稿JSON: `logs/social/{{SLUG}}.x-post.json`
- route: `claude-in-chrome`
- mode: `{{MODE}}`

## 共通の絶対条件

1. `node scripts/run/post-to-x.mjs --check --slug {{SLUG}}` で既投稿なら、投稿もリプライもせず正常終了する。
2. `data/automation/ledger.json` と `%USERPROFILE%\.sumalabo\state\x-posted.json` のslugも確認し、重複の疑いがあれば止める。
3. Xの現在アカウントをDOMで検証し、`@suma_labo` の `innerText / aria-label / href` を取得して一致を確認する。目視だけで進めない。
4. 本文入力後はcomposerの文字列を読み戻し、投稿JSONの `primary.text` と完全一致させる。
5. 読者が使う自然検索語でXを1回検索し、結果内で実際に使われているタグを収集・集計する。最多の流入タグを0〜2個選び、--search-phrase と --discovered-traffic-tags で再生成する。#すまラボ は常時1個、カテゴリタグは廃止。1行目に自然検索語があることを確認する。
6. `attachmentPlan.attach` の画像を順番どおり添付し、DOMのメディア数が予定枚数と一致するまで送信しない。
7. パスワード、認証コード、Cookieを読んだり記録したりしない。ログイン切れ・別アカウントなら停止する。

## mode=dry-run

- `https://x.com/compose/post` を専用タブで開く。
- アカウントDOM確認、本文入力、画像添付、メディア数確認まで行う。
- 「ポストする」ボタンは絶対に押さない。
- 確認後はcomposeを破棄して専用タブを閉じ、下書きを残さない。終了確認シートではDOMのボタン文言を読み、**「破棄」ボタンを文字で特定して押す**。`confirmationSheetConfirm` / `confirmationSheetCancel` の名前や左右位置だけで判断しない。
- 最終出力は1行JSON: `{"ok":true,"mode":"dry-run","account":"@suma_labo","mediaCount":<数>,"posted":false}`。失敗時は `ok:false` と理由。

## mode=post

- 本番URLがHTTP 200で、記事タイトルとサムネ参照を含むことを先に確認する。
- 本投稿の送信クリックは1回だけ。5秒待ち、プロフィールDOMで本文先頭の一意部分を検索し `count===1` を確認する。0件でも無理に再クリックせず失敗記録へ進む。2件以上なら重複として追加操作を止める。
- 本投稿URLを取得した直後、`data/automation/ledger.json` を `status: x_posted / xPostUrl / xPostedAt / xPostRoute: claude-in-chrome` で更新し、`node scripts/run/post-to-x.mjs --record --slug {{SLUG}} --postUrl <URL> --route claude-in-chrome` を実行する。
- 親投稿の返信数NをDOMで取得してから `reply.text` を入力し、返信クリックは1回だけ。親の返信数がN+1、composerが空、with_replies上のリプライ本文が `count===1` の3点を確認する。
- リプライURLを取得した直後、ledgerへ `xReplyUrl` を追加し、`node scripts/run/post-to-x.mjs --record-reply --slug {{SLUG}} --replyUrl <URL> --route claude-in-chrome` を実行する。
- 失敗時は追加クリックや別経路への退避をしない。`node scripts/run/post-to-x.mjs --error --slug {{SLUG}} --stage <stage> --reason <reason>` と `node scripts/automation/record-x-scheduled-failure.mjs --slug {{SLUG}} --reason <reason>` を実行して終了する。
- 最終出力は1行JSON。本投稿・リプライURL、アカウント確認、main count=1、reply count=1、N→N+1、routeを含める。
