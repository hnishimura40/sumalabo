# research_update_20260704.md — Claude Fable 5 公開前リフレーム用の公式再取得

実施: 2026-07-04（Claude Code による WebSearch / WebFetch 実取得）
目的: 中断記事の再開にあたり公式情報の鮮度チェック。記事の軸を「登場」→「復活と7/7の変更」へリフレームするための facts / claims / uncertain 再区分。

---

## 取得ソース（到達確認済み）

| ソース | URL | 種別 |
|---|---|---|
| Anthropic公式: Redeploying Claude Fable 5 | https://www.anthropic.com/news/redeploying-fable-5 | 一次 |
| Anthropic公式: More details on Fable 5's cyber safeguards and our jailbreak framework（7/2） | https://www.anthropic.com/news/fable-safeguards-jailbreak-framework | 一次 |
| Anthropic公式X: 輸出規制の説明 | https://x.com/AnthropicAI/status/2065597531644743999 | 一次 |
| CNBC: 規制解除報道 | https://www.cnbc.com/2026/06/30/anthropic-says-trump-admin-has-lifted-export-controls-on-claude-fable-5-and-mythos-5.html | 報道 |
| BleepingComputer: サブスク変更は恒久ではない | https://www.bleepingcomputer.com/news/artificial-intelligence/claude-fable-5-isnt-permanently-leaving-subscriptions-anthropic-says/ | 報道 |
| Al Jazeera / VentureBeat / TheHackerNews ほか | （検索で複数到達） | 報道 |

## facts（公式発表で確認できた確定情報）

1. **6/12 提供停止**: 米政府が国家安全保障権限に基づく輸出規制指示を発出。外国籍（国内外・Anthropic の外国籍従業員含む）の Fable 5 / Mythos 5 アクセス停止を要求。即時発効かつ国籍のリアルタイム検証手段がないため、Anthropic は**全ユーザーへの両モデル提供を停止**した。
2. **契機**: Amazon の研究者が Fable 5 の safeguards を迂回する手法を報告（ソフトウェア脆弱性を特定させ、一部ケースで悪用コードまで生成）。
3. **6/30 規制解除 → 7/1 グローバル再開**: Claude Platform / Claude.ai / Claude Code / Claude Cowork で再開。AWS / Google Cloud / Microsoft Foundry は「できるだけ早く再有効化」（再開発表時点では未完了）。
4. **再開後の提供条件（旧条件から変更）**: Pro / Max / Team / 一部 Enterprise では **7/7 まで週次利用上限の最大 50% の範囲で追加費用なし**。**7/8 以降（7/7 の期限後）は usage credits が必要**。
5. **API 価格は不変**: 入力 $10 / 出力 $50（100万トークンあたり、米ドル）。Opus 4.8 は $5 / $25。
6. **分類器の改善**: 報告された迂回手法を **99%超のケースでブロック**する改善済み分類器を導入（Redeploying 記事）。defense in depth、safety margin を従来のどのローンチより拡大。
7. **7/2 公式解説記事**: 分類器はサイバー用途を 4 カテゴリ（禁止用途／高リスク二重用途／低リスク二重用途／良性用途）に区分。Cyber Jailbreak Severity (CJS) 0〜4 の評価フレームワークを提案。HackerOne で報告受付。

## claims（関係者発言・報道ベース。断定しない）

- サブスクからの除外は**一時的**で「キャパシティが許せば標準サブスクへ早期復帰を目指す」（Claude Code リードエンジニアの発言として BleepingComputer 報道）
- 停止期間は約 19 日（報道の計算）
- 需要が「非常に高く予測困難」なことがクレジット移行の背景（Anthropic 説明として報道）
- 利用者の不満（PCWorld 等）— 記事では扱わないか、事実として存在に触れる程度

## uncertain（未確定。断定禁止）

- 標準サブスクへの復帰時期（公式に時期未定）
- 7/8 以降の usage credits の具体的な必要量・金額感・日本円価格
- 日本での画面表示・提供の見え方
- AWS / Google Cloud / Microsoft Foundry の再有効化完了時期

## 旧記事（6/9 登場フレーム）との差分 = 直すべき箇所

| 旧記載 | 現状 | 対応 |
|---|---|---|
| 6/9〜6/22 はサブスクに追加費用なし → 6/23 以降 usage credits | 6/12 に提供停止 → 7/1 再開 → **7/7 まで週次上限の50%枠 → 7/8 以降 usage credits** | 本文・Slide 6・Slide 8 を書き換え |
| 「登場」フレーム（何が発表されたか） | **「復活と 7/7 の変更」フレーム** | タイトル・description・見出し・Slide 1・サムネ |
| 安全分類器の説明（5%未満/95%超/1,000時間/refusal） | 有効なまま + 迂回事案と99%超ブロック・4カテゴリ・safety margin拡大の新情報 | Slide 7 は維持、本文に追記 |
| ベンチ・実例・Fable/Mythos 比較・価格表 | 変更なし | Slide 2/3/4/5 は維持 |
