# Research Report

## 調査日

2026年8月18日（日本時間）

## 公式に確認できた要点

- 対象プランの「最大50％」は週間利用枠におけるFable 5の上限であり、5時間枠の消費率ではない。
- Fable 5はほかのモデルより利用枠を速く使う。1往復ごとの消費率や、2往復50％を正常とする公式基準は公表されていない。
- 会話の長さ、ファイル、モデル、思考の強さ、Research、ツール、Agent、キャッシュ状態が利用量を左右する。
- 2026年4月には、コンテキスト管理とキャッシュミスにより利用枠が想定より速く減る不具合をAnthropicが公式認定し、修正と利用枠リセットを行った。
- 8月12日以降に複数の公式障害記録がある。ただし、8月17日の障害と8月18日のUsage急減の因果関係は公式確認されていない。

## 主な一次情報

- https://support.claude.com/en/articles/15424964-claude-fable-5-on-your-plan
- https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work
- https://support.claude.com/en/articles/9797557-usage-limit-best-practices
- https://code.claude.com/docs/en/costs
- https://status.claude.com/api/v2/incidents.json
- https://www.anthropic.com/engineering/april-23-postmortem

## 利用者報告の扱い

GitHubとRedditから重複しない近似例を抽出した。数字つきの改善前後比較は少なく、「新規セッションで改善」という報告は補助証拠に限定した。利用者報告を公式事実や不具合認定として扱わない。

## 調査上の限界

筆者のプラン、総コンテキスト量、ツール回数、Agent数、キャッシュ状態は未確認。したがって原因を単独仮説へ確定できない。
