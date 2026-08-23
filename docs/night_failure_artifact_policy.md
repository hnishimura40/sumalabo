# 夜間run失敗時の成果物回収と受入判定

失敗runが生成した記事、画像、検品結果、state、handoffは削除・巻き戻ししない。既存の原子的保存とrunner保全規則に従い、原因調査と再開に利用できる状態を維持する。

原因修正後、保存済み成果物が必要な検品に合格している場合は、同じslugのpending地点から再開し、Phase B、公開、strict verify、Phase C、X二段階記録まで完了してよい。完了時の契約評価には `--completion-kind recovery` を付ける。この回収完走は主契約3点が揃えば公開処理としては`success`になり得るが、`acceptanceEligible=false`であり、夜間構成の受入実績には数えない。X二段階記録は副契約として別に報告する。

構成を定刻へ引き渡せるのは、別の実タスクが新規ネタ選定からWatchdogまで最初から一周し、次をすべて満たした場合だけとする。

- Driverの三値が`success`、終了コード0
- 主契約のHTTP 200、PR merged、strict verifyが当該run由来
- 副契約のX本投稿＋返信は独立して成功・失敗を記録
- Watchdog `mismatch=false`
- 人の介入なし、`completionKind=fresh_run`、`acceptanceEligible=true`
- runner tracked dirty 0

## X環境警告時の下限運転

第0工程では、記事工程を成立させる検査とX投稿だけに必要な検査を分離する。

- 致命検査: `GH_TOKEN`、runner HEAD/origin main一致、runner tracked dirty 0、環境定義とrunnerの健全性。不合格なら記事工程へ入らず `failed`。
- X警告検査: Xログインhref、x.comサイト許可、ファイルURL許可、拡張/native-host接続、DOM読取、Chromeプロファイル、外部X台帳I/O。不合格でも記事生成・公開・PR merge・strict verifyまで続行する。

記事3点が実物確認でき、Xだけが環境警告で実行できない場合も本体は `success`（終了コード0）とする。副契約は `skipped` または `failed` とし、「本体成功／X失敗」を通知する。

X投稿文、URLだけの返信文、既存画像4枚と各ハッシュは `logs/social/<slug>.<runId>.x-pending.json` に保全する。朝の回収は次の1コマンドで実行し、`completionKind=recovery`、`acceptanceEligible=false` として記録する。

```powershell
npm run social:recover-x-pending -- --slug <slug>
```

pending bundleは上書き・削除せず、回収前に本文・返信URL・画像4枚・ハッシュを再検証する。X上の実在確認前に台帳へ記録しない既存のfail-closedを維持する。

要約すると、成果物は途中から回収して無駄にしない。一方、構成検証は必ず最初から行う。この二つを同じ受入実績として扱わない。
