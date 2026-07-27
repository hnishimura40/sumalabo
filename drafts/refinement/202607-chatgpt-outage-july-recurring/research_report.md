# research_report — 202607-chatgpt-outage-july-recurring

## 一次情報（status.openai.com）

- OpenAI公式ステータスページ（status.openai.com/history）を確認。2026年7月に複数のインシデントが記録されている。
- 7/25（土）: 「Elevated errors affecting ChatGPT conversations」等、当日に複数件のインシデント表示。ステータスページ上は "Monitoring the recovery"→その後解消の記載。
- 7/24（金）: 「Elevated Errors in Codex Review」「Elevated API error rates and latency on gpt-image-2 model」等。
- 7/23（木）: 「Some users may experience elevated error rates in ChatGPT」。
- ステータスページのタイムスタンプ表示は環境依存で見え方に差があり、記事執筆時点で秒単位の再現はできない。**日付・曜日・大枠の時間帯（午前/午後）は確定情報として扱い、分単位の時刻は報道ベースとして扱う**。

## 報道（照合・引用元として明記した上で使用）

- BleepingComputer: 7/25の障害は「ChatGPT・API・Codexの3本柱すべてに同時に影響」。開始は米国東部時間（ET）朝5時頃、解消は同6時頃と報道（約50分間）。ユーザーは「too many concurrent requests」エラーに遭遇、サイドバーの読み込みが固まる症状。
- TheNextWeb: 「ステータスページの記録で、2025年秋以降の約9ヶ月間でおよそ166件のインシデント、月平均約18件」という集計を報道（出典はOpenAI公式ステータス履歴）。同記事は7/23にも大きめの障害があったこと、同じ週の水曜（ChatGPT+画像生成）・木曜（API+Codex Review）にもエラー率上昇があったことを報道。
- Unite.AI: 「Global Outage Hits OpenAI's ChatGPT, API and Codex」の見出しで7/25障害を報道、3サービス同時影響を確認。
- DownDetector: 障害報告が急増（数千件規模）と報道されているが、具体的な件数は媒体により差があるため記事本文では概数のみに留める。

## JST換算

- BleepingComputer報道の「米国東部時間（ET/EDT）朝5時頃〜6時頃」をJSTに変換: EDTはUTC-4、JSTはUTC+9のため **JST = EDT + 13時間**。
  - 5:00 AM EDT → **18:00 JST（同日）**
  - 6:00 AM EDT → **19:00 JST（同日）**
  - つまり7/25（土）の大規模障害は「日本時間 7/25（土）18時台〜19時台、約1時間」という扱いにする（報道ベースの時刻のため記事では「報道によれば」を必ず添える）。
- 7/23・7/24の分単位時刻は複数ソースで表記揺れがあり確定できないため、記事では「木曜」「金曜」という曜日レベルの表現に留め、時刻は出さない。

## 事実 / 報道 / 未確定の仕分け（記事化の基準）

| 区分 | 内容 |
|---|---|
| **事実（公式ステータスページで確認）** | 7月に複数回のインシデントが発生したこと（7/23・7/24・7/25を含む）。7/25にChatGPT関連の大きめのインシデントがあり、当日中に緩和・解消の記載があること。 |
| **報道ベース（引用元を明記）** | 7/25障害がChatGPT・API・Codexの3本柱に同時影響したこと。「too many concurrent requests」エラー文言。JST換算の具体時刻（18時台〜19時台）。166件/9ヶ月・月平均18件という集計（TheNextWeb、出典はOpenAI公式ステータス履歴とされる）。同週の水曜・木曜のインシデント内容。 |
| **未確定・断定回避** | 7/23の障害と7/24のCodex Review障害が「同一原因か別原因か」は不明。DownDetectorの正確な報告件数。障害の根本原因（インフラ側か特定モデル側か）は公式に詳細開示されていない。 |

## 断定回避の方針

- 「OpenAIの障害が多い」という一般論的な断定はしない。**事実として「7月下旬に複数回発生した」「約9ヶ月で166件という集計がある」を示し、多い/少ないの評価は読者に委ねる**。
- 「ChatGPTは信頼できない」等のサービス批判に読める結論にしない。締めは「止まる前提の付き合い方」という実用的な提案に置く。
- 筆者の体験談パートは「（この時期の）障害だった可能性が高い」の水準に留め、特定のインシデントと1対1で断定しない（本人が完全に照合できたわけではないため）。

## 出典（引用元・記事内の参考情報に使用）

1. OpenAI Status — https://status.openai.com/history
2. BleepingComputer — 「OpenAI confirms ChatGPT is down worldwide」
3. TheNextWeb — 「OpenAI hit by another outage as ChatGPT, Codex, and APIs go down together」
4. Unite.AI — 「Global Outage Hits OpenAI's ChatGPT, API and Codex」
