# Editorial notes

## 採用タイトル

Claude Fable 5、2回で5時間制限50％消費。異常？原因と対策を徹底検証

## タイトル候補10案

1. Claude Fable 5、2回で5時間制限50％消費。異常？原因と対策を徹底検証
2. Claude Fable 5のUsageが減りすぎ？2往復で50％になった原因を検証
3. Claudeの5時間制限が2回で半分に。Fable 5の仕様・障害・対策を調査
4. Fable 5で利用上限が急減。長いチャット、Agent、障害のどれが原因？
5. Claude Fable 5は本当にUsageを使いすぎる？直った事例と確認手順
6. Claude Usage異常消費を検証。Fable 5で2往復50％は正常なのか
7. Claude 5時間制限が急に減る理由。Fable 5と長大コンテキストを調査
8. Fable 5で5時間枠がすぐ尽きる？世界の報告と有効な対策を整理
9. Claude Maxでも上限が急減？Fable 5のUsage仕様とBug前例を確認
10. Claude利用制限の減りが速いときの対処法。Fable 5実測から検証

## 情報区分

### facts

- Fable 5は他モデルよりplan usageを速く使うと公式Helpに明記。
- 対象planの50%はweekly usage limitの一部であり、5-hour limitの消費率ではない。
- 長いcontext、cache miss、Research、tool、agent team、scheduled taskは公式にUsage増加要因として説明。
- Fable 5はClaude CodeでExtended Thinkingを無効化できない。
- 2026-04にcache missがusage draining faster than expectedを起こした公式前例があり、v2.1.101で修正、全購読者の枠をreset。
- 8/12、13、14、15、17に公式Status上のincidentあり。8/18 07:04 JST時点で新規incidentなし。

### claims

- GitHub、Redditで数分〜数promptの急減報告あり。
- 新規sessionやrole分担で改善した報告はあるが、数値つきBefore/Afterは少ない。

### uncertain

- 筆者の2往復で利用したcontext、tools、agents、plan。
- 8/17 incidentと8/18 usage急減の因果。
- 8/17〜18のusage計算変更。

## 最終判定

- 2往復で5時間枠50%：異常を疑う水準
- ただし高負荷条件なら起こり得るため、明らかな異常とは断定しない。
- 1回だけの統制テストを推奨。

## 画像方針

- サムネ：2往復で50%という違和感。煽らず「異常？」の疑問形。
- 図解1：weekly 50%と5-hour 50%を別のメーターで比較。
- 図解2：Usageを押し上げる6要因。
- 図解3：1回だけの再現テスト手順。
