# 自動運転の障害対応と7日計測

## 一過性エラー

Claude API等の overloaded、rate limit、timeout、一時的なservice unavailableだけを、30分後に1回再試行する。待機中は状態を `retry_wait` としてハートビートを継続し、見張り番は正常な待機として扱う。恒久エラー、品質ゲート不合格、2回目の失敗は追加再試行しない。error budgetは最終失敗だけをincident判定へ渡す。

## push前シークレット検査

`scripts/automation/secret-scan.mjs` が、mainとの差分、staged変更、未追跡の.env類を検査する。秘密値はログへ出さず、ファイル名と種類だけを表示する。Googleサービスアカウント鍵、秘密鍵、Google API鍵、GitHub/OpenAI系トークン、一般的なsecret代入を検出した場合だけ停止する。

## 7日計測

2026-08-01 00:00 JSTから2026-08-08 00:00 JSTまで計測モードとする。障害対応以外の装備変更を凍結し、各runで無人完走、人の介入、理由、公開後破綻件数を記録する。期間終了後に `npm run measurement:summary` で無人完走率と公開後破綻を集計する。
