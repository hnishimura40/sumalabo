# 夜間run失敗時の成果物回収と受入判定

失敗runが生成した記事、画像、検品結果、state、handoffは削除・巻き戻ししない。既存の原子的保存とrunner保全規則に従い、原因調査と再開に利用できる状態を維持する。

原因修正後、保存済み成果物が必要な検品に合格している場合は、同じslugのpending地点から再開し、Phase B、公開、strict verify、Phase C、X二段階記録まで完了してよい。完了時の契約評価には `--completion-kind recovery` を付ける。この回収完走は四点契約が揃えば公開処理としては`success`になり得るが、`acceptanceEligible=false`であり、夜間構成の受入実績には数えない。

構成を定刻へ引き渡せるのは、別の実タスクが新規ネタ選定からWatchdogまで最初から一周し、次をすべて満たした場合だけとする。

- Driverの三値が`success`、終了コード0
- HTTP 200、PR merged、strict verify、X本投稿＋返信の四点が当該run由来
- Watchdog `mismatch=false`
- 人の介入なし、`completionKind=fresh_run`、`acceptanceEligible=true`
- runner tracked dirty 0

要約すると、成果物は途中から回収して無駄にしない。一方、構成検証は必ず最初から行う。この二つを同じ受入実績として扱わない。
