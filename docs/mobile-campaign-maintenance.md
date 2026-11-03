# 携帯キャンペーンの毎日チェックと記事更新

対象は`data/automation/mobile-campaign-watch.json`の公式11ブランド。AI主軸の毎日1本の新規記事とは別の保守作業として実行する。毎朝8時（日本時間）のCodexアプリの定期実行で、巡回→公式条件の照合→記事更新→公開確認まで行う。凍結中の夜間起動層・Windowsタスク登録を変更しない。

## 実行と記録

作業の正本はこのリポジトリのmain。ローカルの未コミット変更を消したり、`git add .`したりしない。ランタイム状態はcanonical workspaceの`logs/scout/mobile-campaign-watch/`に置く。公開リポジトリへスナップショット・処理台帳・作業メモ・通知情報を含めない。

1. `node scripts/automation/mobile-campaign-watch.mjs check`を実行する。終了コード2は取得失敗・ブラウザ補完・巡回上限等の要確認であり、キャンペーン終了でも処理成功でもない。`latest-check.json`のcoverage/failuresと、`state.json`のpendingを確認する。
2. `node scripts/automation/mobile-campaign-watch.mjs packet linemo`など、ブランドごとに差分を読む。packetは抜粋なので、変更前後の全文はstate.pagesとpending内で確認する。初回は既存の掲載内容と照合する初期調査であり、既存キャンペーンを新開始と宣伝しない。
3. 一覧に加え、見つかった詳細ページ・公式の公開JSON等も確認する。期限到来はページ内容が変わらなくても未処理に入る。一覧から消えた既知の詳細URLも継続取得する。リンク消失、404、TLSエラーを終了とみなさない。取得失敗でも前回正常な証拠と未処理の変更は保全される。
4. `needsBrowser`、失敗URL、巡回上限超過は、公式の検索・正式なブラウザで必ず補完する。TLS検証を無効にしない。ログイン限定の特典・会員APIを無断取得しない。HTMLに非表示の「終了」バナーが含まれる場合もあるため、単一の文言で終了と断定せず、表示中の条件・日付・公式告知を照合する。確認できなければ開催状況は未確認とし、開催中のおすすめに残さない。

## 何を更新するか

公式情報を読んで「新規」「条件変更」「終了」「記事に関係しない装飾・文言変更」に分類する。独自のおすすめは、読者に向いている理由と受取条件で説明する。広告提携の有無で順位を変えない。最大額を全員分と扱わず、新規番号/MNP/再契約、移行元、対象プラン、端末同時購入、申込経路・エントリー、継続期間、ポイント受取時期・有効期限、併用可否、月額料金、事務手数料を確認する。抽選・クーポン・現金・ポイントを混同しない。今の利用状況で実際に条件を満たせるかを示す。ニュース記事の転載ではなく、公式条件を要約して説明する。

更新対象は既存記事`content/articles/mobile-plan-cost-comparison.mdx`のキャンペーン欄。同じURLを維持し、毎日新しい記事を量産しない。通常料金表・診断・既存画像をキャンペーン更新だけで変更しない。初回に限り「キャンペーン金額は載せない」という説明を設定内の対応文へ置換する。通常料金表の古い確認日とキャンペーンの新しい確認日を混同しない。今後専用のまとめ記事へ移す場合は設定のtargetSlug/articlePathを一緒に変更する。

確認済みの掲載内容をprivateな`reviewed-catalog.json`へ保存する。カタログは記事全体の掲載予定リストであり、差分だけの部分リストで既存のおすすめを消さない。終了・未確認の掲載項目も必要に応じて残し、おすすめ対象から外して理由を説明する。未確認を終了と書かない。

```json
{
  "schemaVersion": 1,
  "campaigns": [{
    "id": "stable-offer-id", "carrier": "linemo", "title": "公式の特典名",
    "status": "active", "benefit": "最大額と特典の種類",
    "eligible": "対象者", "requirements": "開通・継続等の必須条件",
    "exclusions": "対象外・併用条件", "entry": "申込経路とエントリー",
    "receiveTiming": "受取時期・方法・コード期限", "deadlineLabel": "公式の申込期限",
    "endsAt": null, "monthlyCost": "税込月額と必要な割引条件",
    "fees": "事務手数料等", "caveats": "注意点", "suitedFor": "向いている人と理由",
    "verifiedAt": "2026-11-03T08:00:00Z",
    "sources": ["https://www.linemo.jp/campaign/"]
  }]
}
```

値は実際に確認した内容で埋める。この例の日時や説明文を流用しない。statusはactive/ended/unverified。期限が公式に確定しているときだけendsAtへタイムゾーン付きISOを入れ、終了日未定はnullにする。開催中は36時間以内の公式確認が必要。終了・未確認の履歴には古い最後の確認日時を残せるが、新たに終了と分類するときは今回の公式確認が必要。期限を過ぎた項目をactiveで出力すると検証が失敗する。

## 更新から公開まで

5. `node scripts/automation/mobile-campaign-article.mjs <reviewed-catalog.json>`でpreviewを作る。完全な最新mainの記事と照合し、公式リンクと特典・条件を検品する。rendererの`renderCampaignSection`/`updateArticle`を使えば最新mainの本文へ同じ処理を適用できる。`--apply`は作業中の対象記事へ適用する場合だけ使う。管理マーカーの外は初回の明示した説明文とupdated以外を保持し、pubDate/publishAtを動かさない。確認していない金額を補完しない。
6. privateなクリーンcheckout/作業領域で、最新mainを基に対象記事だけの差分を作る。対象外のローカル変更を公開しない。既存の記事ゲート・秘密情報検査・MDX/build検査を通し、PRの対象・ハッシュ・mergeableを確認してマージする。画像を変更しない更新で不要な画像再生成をしない。失敗を成功扱いしたり、検品を飛ばしたりしない。
7. 最新mainに一致するクリーンな作業環境で、既存の`deploy:production -- --slug=mobile-plan-cost-comparison --run-mode=maintenance --output=<private-result.json>`を使い、本番更新・HTTP 200・strict verifyを確認する。既存の認証方式を使い、秘密情報を本文・ログ・PRへ出さない。夜間runnerが実行中ならその作業木へ書き込まず、変更を保留するか別のクリーン環境を使う。起動層や既存スケジュールは変更しない。SNS投稿・メール送信はこの保守作業に含めない。
8. 公開確認後だけ`node scripts/automation/mobile-campaign-watch.mjs ack <receipt.json>`で当該eventIdsを完了にする。ackはGitHubの実マージ、本番HTMLのsectionVersion一致、verify-publicationのpublishedを再取得して確認する。確認できない変更は翌日も未処理として残る。カタログやreceiptだけ作って完了にしない。

receiptにはoutcome=published、処理したeventIds、reason、prUrl、merged=true、articleUrl、httpStatus=200、strictVerifyPassed=true、rendererが出したsectionVersion、**公開した全項目の**campaignsを入れる。campaignsの各項目はid/carrier/title/status/endsAt/url（公式の詳細URL）を持つ。これが翌日の期限到来監視の入力になる。記事に関係しない変更だけはoutcome=no_material_changeと、確認した公式条件が同一である具体的理由・eventIdsを保存して完了にできる。未確認の条件や更新失敗をno_material_changeで消さない。

## 定期実行の報告

変更なし・対応不要なら通知しない。記事の更新完了、新しい取得障害、公開失敗、確認不能で掲載を外した場合、ユーザーの操作が必要な場合だけ、このチャットへ短く報告する。同じ障害が続くだけで毎日同じ通知を繰り返さず、未処理と障害履歴は保全する。公開できたURLと変更点、残る未確認を区別する。

ローカルの定期実行にはPC起動とアプリ起動が必要。Codexアプリの定期実行設定を正本にし、同じ監視のWindowsタスクを重複登録しない。
