# Research Report — Windows 11 GDID

## 一次情報

1. 米司法省・刑事訴状PDF（39ページ）
   - URL: https://www.justice.gov/usao-ndil/media/1450651/dl?inline=
   - PDF 34〜35枚目（本文31〜32ページ、段落25〜28）を直接確認。
   - GDIDはWindowsインストールを一意に識別する永続的な端末レベルID。
   - Windows Update後も維持、再インストール時は新しいGDID。
   - 2025-05-12 19:21 UTC、ngrokアカウント作成時刻に同じGDID端末が登録ページへアクセスしたとMicrosoft記録。
   - GDID端末のIP履歴をSNS・Apple・Google・Ubisoft・移動記録等と照合。
   - 訴状は「インストールに結び付く」と説明するが、番号を発行する厳密な瞬間は説明しない。

2. 米司法省プレスリリース
   - URL: https://www.justice.gov/opa/pr/alleged-member-criminal-cyber-hacking-group-scattered-spider-arrested-finland-and-extradited
   - 2026-07-01公開。容疑、逮捕・移送、被害概要を確認。
   - complaintはallegationであり有罪確定ではないとの注意書きあり。

3. Microsoft Learn — UCClient
   - URL: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/ucclient
   - GlobalDeviceId列を「Microsoft internal Global Device Identifier」とだけ説明。

4. Microsoft Support — Diagnostics
   - URL: https://support.microsoft.com/en-us/windows/privacy/diagnostics-feedback-and-privacy-in-windows
   - 必須/オプション診断データの差、オプションには閲覧サイト情報が含まれる場合があることを確認。

5. Microsoft Support — Local account
   - URL: https://support.microsoft.com/en-us/accounts-billing/manage/change-from-a-local-account-to-a-microsoft-account-in-windows
   - Microsoftアカウントからローカルアカウントへの公式切替手順を確認。

## 報道として扱う情報

- Windows Latestは、Microsoftアカウントへのサインイン時にサーバー側が識別子を付与する経路を独自解析で説明。Microsoftの一般向け公式文書では未確認のため「報道段階」。
- Tom's Hardwareは、訴状だけではURLを送信した正確なWindows機能を特定できないと指摘。

## 編集判断

- 「訪問先サイトにGDIDが直接見える」とは書かない。訴状・Microsoft資料はMicrosoft内部の記録として示す。
- 「法的手続き」の具体像は案件ごとに異なり、今回の訴状もMicrosoft criminal referralとrecordsを記すのみ。一般論と今回の事実を分ける。
- 実用設定は情報共有を減らすもので、GDID削除や匿名化を保証しない。
