# research_report.md — Research Pass

- slug: 202609-claude-fable-5-1-mythos-5-1-explained
- 調査日: 2026-09-02 JST
- 主題: Claude Fable 5.1 / Mythos 5.1発表
- 基準: Anthropicの発表、製品ページ、Claude Platform公式ドキュメントを一次情報として優先

---

## facts（一次情報で確認済み）

1. 発表日は2026年9月1日（米国時間）。
2. Fable 5.1とMythos 5.1は同じ基礎モデルで、安全対策と提供経路が異なる。
3. Fable 5.1はPro / Max / Team / Enterprise、Claude API、対応クラウドで利用可能。無料プランは対象として列挙されていない。
4. Mythos 5.1はCyber Verification ProgramとLife Sciences Verification Programを通じた審査制。発表時点では米国の一部組織が中心。
5. API料金は入力$10、出力$50／100万トークン。キャッシュ読み取りは$1から$0.25へ75％値下げ。
6. Anthropicの実測では典型的ワークロードで約25％、高度にエージェント的な処理で最大約45％のコスト減。
7. Terminal-Bench-Science 0.1はFable 5.1 52.6％、Fable 5 24.7％。標準誤差はモデルごとに±3.5〜4.5ポイント。
8. Terminal-Bench 4.0はFable 5.1 55.8％、Mythos 5.1 60.9％、Fable 5 42.0％、Opus 5 52.3％、GPT-5.6 Sol 37.3％。
9. 信頼できる知識カットオフはFable 5の2026年1月からFable 5.1の2026年6月へ更新。
10. Claude Codeではサイバー安全対策による1セッション当たりの介入が平均約60％減る見込み。
11. Millenniumの事例は、約100万回に1回、4〜5年間原因不明だったクラッシュの根本原因特定。
12. 生成テキストに統計的ウォーターマークを導入。検出APIはプライベートプレビュー。
13. Claude APIモデル名はclaude-fable-5-1。

## 一次情報の補正

- 「誤検知が約60％減」ではなく、厳密には「Claude Codeでサイバー安全対策による1セッション当たりの介入が平均約60％減」。
- 「進捗報告が常に増える」ではない。公式ドキュメントはFable 5より更新が少ない場合を説明し、display: updatesをベータ提供している。
- 文章は定型句や説明のない専門用語が減る一方、密になる場合がある。

## 参考URL

- https://www.anthropic.com/claude-fable-and-mythos-5-1
- https://www.anthropic.com/claude/fable
- https://platform.claude.com/docs/en/models/fable-5-1/overview
- https://platform.claude.com/docs/en/models/fable-5-1/whats-new-fable-5-1
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-fable-5-1
- https://platform.claude.com/docs/en/models/mythos-5/overview
