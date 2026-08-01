# 完了報告の最終フィルタ

2026-08-01以降、Codex対話、夜間run、無人X、修理・復旧セッション、Web Push通知の全経路で、利用者へ届く直前に共通フィルタを通す。

- 実装: `scripts/sumahon/filter-report-output.mjs`
- 除去条件: 行頭の空白を無視し、`::` で始まる行を削除する。
- 通常のURL、検証結果、本文は保持する。
- Web Pushは `scripts/sumahon/notify-review-ready.mjs` の共通送信関数で強制適用する。
- Codex対話・夜間・無人X・修理セッションは、最終文面を `npm run report:filter` に渡した結果だけを送信する。
- 未フィルタの文面を直接送る新経路を追加してはならない。

テストは `tests/sumahon/report-output-filter.test.mjs` と `tests/sumahon/report-route-filter.test.mjs` で、各経路の制御行除去と通常行保持を確認する。
