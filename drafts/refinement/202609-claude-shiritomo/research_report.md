# Research Pass: Claudeの無料「limit reset」

出所: すまラボ夜間run 20260924T043002.232 / Codex調査 / 2026-09-24 JST確認

## 調査対象

- スカウト元: https://hashout.jp/ai/11248/
- Anthropic公式発表: https://www.anthropic.com/claude-opus-5-5
- Claude Help Center「What is a limit reset?」: https://support.claude.com/en/articles/17007452-what-is-a-limit-reset
- Claude Help Center「How do usage and length limits work?」: https://support.claude.com/en/articles/11647753-how-do-usage-and-length-limits-work
- Claude Help Center「What is the Pro plan?」: https://support.claude.com/en/articles/8325606-what-is-the-pro-plan

## facts（公式で確認できたこと）

1. Anthropicは2026年9月22日のClaude Opus 5.5発表で、Pro・Max・Teamの5時間利用上限を増やすと発表した。増加率は発表ページに記載されていない。
2. 同じ発表で、サブスクリプション利用者へ、保存して好きな時に使えるrate limit resetを提供すると発表した。
3. Help Centerは、limit resetを「対象となるプランへ時折付与され、選んで使うと利用上限を満タンへ戻すもの」と説明している。
4. リセット対象は、画面に表示された種類に応じて「5時間のセッション上限」または「週次上限」のどちらか。両方が必ず同時に回復するとは公式文書に書かれていない。
5. 週次上限へ使っても、通常の週次リセット日時は変わらない。上限到達前でも使用できるが、使用後は取り消せない。
6. 期限がある場合は Settings > Usage に日時が表示される。未使用でもその日時を過ぎれば失効する。
7. Web版またはClaude Desktopの Settings > Usage にある Resets 欄から「Reset for free」を選び、確認すると適用できる。上限到達時の案内にも同じボタンが出る。
8. Claude Mobileと、ターミナル／IDE内のClaude Codeにはリセットボタンがない。Web版またはClaude Desktopで適用後は、同一アカウントで共有される上限がMobileやClaude Code側でも回復する。
9. リセットは、すでに請求された追加利用分を返金せず、usage credits残高も変えない。未使用のままダウングレードまたは解約すると利用できなくなる。
10. 通常の利用上限はメッセージの固定回数ではない。会話の長さ・複雑さ、添付ファイル、使用モデルや機能、effortなどで消費量が変わる。
11. Proのセッション上限は通常5時間ごとにリセットされ、別に固定曜日・時刻の週次上限がある。

## claims（報道・スカウト元の表現）

1. スカウト元は「5時間セッションと週次の利用上限を無料で1回だけフル回復」と要約している。ただし公式Help Centerは「表示されたリセットに応じて、どちらか」としているため、本文では公式の限定表現を採用する。
2. スカウト元は「今すぐ使わない人が多い」とするが、人数や比率を裏づける一次データは示していない。本文では一般化せず、「温存する合理性がある」と編集部判断として説明する。
3. 一部の解説記事は今回の失効日を10月22日としているが、公式Help CenterはアカウントのSettings > Usageに表示された日時を確認するよう案内している。全利用者共通の期限とは断定しない。

## uncertain_points（2026年9月24日時点）

1. 個々のアカウントに、5時間枠用・週次枠用のどちらが表示されるか。
2. すべての有料プラン・すべての地域へ同じ条件で付与されているか。公式発表はsubscription users、Help Centerはeligible plansと表現している。
3. 今回の無料リセットの正確な失効日時。アカウント表示が正本。
4. 5時間上限が何%増えたか。公式発表は増加を認めるが、割合を示していない。

## 結論

読者が先にすべきことは、リセットを押すことではなくWeb版またはDesktopの Settings > Usage を開き、対象枠と失効日時を確認すること。1回性で取り消せないため、残量が十分な時より、上限で作業が止まり、続行する価値が高い時に使う方が無駄が少ない。ただし失効間際まで忘れるリスクもあるので、期限はメモしておく。
