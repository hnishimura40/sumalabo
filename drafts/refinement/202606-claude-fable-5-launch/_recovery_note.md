# _recovery_note.md — Claude Fable 5（P7 復旧記録 2026-07-03）

## 経緯
2026-07 の OS Temp クリーンアップで temp worktree（C:\...\Temp\sumalabo-meta）の未コミット drafts が消失。
ChatGPT「すまラボ台本」チャット（c/6a29555d-615c-8321-a61d-60ac4dd62b52）から backend-api 経由で再取得した。

## 復元できたもの（チャット原文ベース）
- turn1_prompt.txt（送信プロンプト。視覚確認済み公式ベンチ表の全数値を含む）
- research_report.md / editorial_selection.md（Turn1 を分割）
- draft_article.md（Turn2 初稿・canvas）
- review_report.md（Turn3 + Turn5(A)）
- revised_article.md（Turn4 修正版・canvas）
- final_article.md（Turn5(B) 確定最終稿）
- slide_plan.md（Turn6）

## 欠損
- image_factcheck.md: **欠損ではなく未生成**（消失時点で画像生成に未着手。スライド生成時に作成する）
- 消失前にローカルで編集していた research_report.md（Chrome視覚確認の注記付き公式ベンチ表を含む版）は逐語復元不能。
  ただし同内容の数値・注記は turn1_prompt.txt に全て残っている。

## 残作業（記事制作の続き）
slide_plan に基づくスライド8枚＋サムネ生成 → image_factcheck → WebP → MDX → build → PR → finalize → Checkpoint
