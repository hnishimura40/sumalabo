# Codex対話モード X投稿定型手順

最終更新: 2026-07-27

## 目的と経路

Phase Bと全検品を通過した記事を、Codex対話モードから `@suma_labo` へ投稿するための貼り付け用指示文。**Chrome拡張を基本**とし、内蔵BrowserはDOM確認などの補助に使う。画像添付が必要な通常投稿では、ログイン済みChromeを操作する。

`claude-in-chrome` は非常用フォールバック。使った場合は理由を完了報告へ明記し、台帳の `route` を `claude-in-chrome` にする。通常は `route: "codex"`。

## Codexセッションへ貼る定型指示文

以下のコードブロック内を新しいCodex対話セッションへ貼り、`<slug>` などのプレースホルダーを対象記事の値に置き換える。

```text
すまラボのPhase C（X投稿）をCodex対話モードで実行してください。

対象:
- slug: <slug>
- 本番URL: https://sumalabo.com/articles/<slug>/
- 投稿JSON: logs/social/<slug>.x-post.json
- 標準経路: Codex対話モード＋Chrome拡張
- 台帳route: codex

CLAUDE.md、docs/x_post_workflow.md、logs/social/<slug>.x-post.jsonを読み、次を順番どおり実行してください。省略禁止です。

0. 前提と重複防止
- Phase B成功、strict verify 8/8、独立検品、手の二段検品が合格済みであることを確認。
- `node scripts/run/post-to-x.mjs --check --slug <slug>` を実行。既投稿なら何も投稿せず停止。
- Xは専用の新規タブで開く。画像添付があるのでChrome拡張を使う。内蔵Browserだけでファイル添付を完結させない。

1. 投稿前アカウント検証（DOM必須）
- `https://x.com/home` を開く。
- `accountIdentityJs("@suma_labo")` を実行し、現在アカウントを示すDOMのinnerText / aria-label / hrefを取得して `confirmed:true` を確認。
- 目視だけで済ませない。DOMで一致しない、取得できない、別アカウントの場合は投稿もアカウント切替もせず停止して報告。

2. 本投稿の準備
- `https://x.com/compose/post` を専用タブで開く。
- `primary.text` をURLなしで入力し、composerのinnerTextを読み戻して完全一致を確認。
- 読者がその話題で検索する自然な言葉を1つ決める（例: ChatGPT 落ちた / VIVANT AI）。投稿直前にXでその語を1回検索し、表示された話題の投稿内で実際に使われているハッシュタグを収集・集計する。最多のタグを流入タグとして最大2個採用し、見つからなければ0個とする。コードが作った候補語の生存確認はしない。
- npm run social:generate-x-post -- --slug <slug> --search-phrase "<自然検索語>" --discovered-traffic-tags <tag1,tag2> を再実行する（流入タグなしは none）。本文1行目に自然検索語があり、brandHashtags が #すまラボ 1個、trafficHashtags が検索集計結果と一致し、全タグ合計3個以下であることを確認する。カテゴリタグ（#AI・#ガジェット等）は付けない。
- `attachmentPlan.attach` の画像を順番どおり添付。`MEDIA_COUNT_JS` で予定枚数と一致し、`SEND_READY_JS` がreadyになるまで待つ。
- 本文、添付順、添付枚数に不一致があれば送信しない。

3. 本投稿の送信と実在確認
- 「ポストする」をDOM操作で1回クリックし、5秒待つ。
- `https://x.com/suma_labo` を開き、`postExistsJs(primary.textの先頭12〜20文字の一意部分)` を実行。
- `count===1` のときだけ本投稿確定。`count===0` は未投稿として、送信可能状態を再確認してクリックは合計最大2回。`count>=2` は重複なので追加投稿せず停止。
- 本投稿URLを取得する。

4. 本投稿の第1段階記録（確認直後）
- `data/automation/ledger.json` に `status: x_posted` と `xPostUrl` を記録。
- 直ちに次を実行:
  `node scripts/run/post-to-x.mjs --record --slug <slug> --postUrl <本投稿URL> --route codex`
- この記録をリプライ送信後まで先送りしない。

5. リプライの送信
- 本投稿のstatusページで、送信前に `REPLY_COUNT_JS` を実行し親の返信数Nを控える。
- `reply.text`（記事リンク1件）を入力し、innerTextを読み戻して完全一致を確認。
- 返信ボタンをDOM操作で1回クリックし、5秒待つ。
- 同じ親投稿で `REPLY_COUNT_JS` を再実行し、返信数がN+1かつcomposerCleared=trueであることを確認。
- 増えていなければ送信可能状態を再確認し、クリックは合計最大2回。増えない場合はリプライ未投稿として停止し、本投稿済みの状態を維持。

6. リプライ自身の実在確認
- `https://x.com/suma_labo/with_replies` を開く。
- `replyExistsJs(reply.textの先頭12〜20文字の一意部分, 本投稿のstatus ID)` を実行。
- `count===1` のときだけリプライ確定。`count===0` は未投稿、`count>=2` は重複として停止。
- リプライURLを取得する。

7. リプライの第2段階記録（確認直後）
- `data/automation/ledger.json` の同じ記事に `xReplyUrl` を追記。
- 直ちに次を実行し、`data/social/x-posted.json` の同じレコードへ既存の `replyUrl` を追記:
  `node scripts/run/post-to-x.mjs --record-reply --slug <slug> --replyUrl <リプライURL> --route codex`

8. 完了報告
- 本投稿URL、リプライURL、アカウントDOM確認結果をHiroへ報告し、報告後にセッションを終了する。投稿URL2本の報告を省略したまま終了しない。
- メイン `count===1`、リプライ `count===1`、親返信数 `N→N+1` を明記。
- `x-posted.json` の2段階記録完了と `route: codex` を明記。
- フォールバックした場合だけ「claude-in-chrome退避あり（理由）」と記し、routeもclaude-in-chromeにする。
```

## 検証スニペット

DOM検証用の最新版は `scripts/sumahon/x-post-verify.mjs` を正本とする。

- `postExistsJs(uniqueText)`: 本投稿の実在件数。必ず `count===1`
- `replyExistsJs(uniqueText, parentStatusId)`: リプライ自身の実在件数。必ず `count===1`
- `accountIdentityJs(expectedHandle)`: 投稿前アカウントのDOM確認。必ず `confirmed:true`
- `REPLY_COUNT_JS`: 親投稿の返信数。送信前後で必ず `N→N+1`
- `MEDIA_COUNT_JS`: 添付画像枚数
- `SEND_READY_JS`: 送信ボタンとアップロード状態

## 台帳の互換性

`data/social/x-posted.json` の `version` は1のまま。既存レコードは `route` がなくても有効で、新規レコードだけ `route: "codex"` を追加する。本投稿直後は既存の `replyUrl: null`、リプライ確認直後に同じレコードの `replyUrl` を更新するため、レコード形式や重複防止単位は変えない。


## 報告出力フィルタ（必須）
完了報告は送信直前に `npm run report:filter` を通し、行頭（空白を含む）が `::` の行を機械的に除去する。記事URL・投稿URL・検証結果など通常行は保持する。Codex対話、夜間run、無人Xのいずれも未フィルタの報告を直接送らない。
