# merged-fixes: iPhone 18 Pro / Dynamic Island 記事

slug: 202605-iphone-18-pro-dynamic-island-top-left-rumor
Preview URL: https://6cf7f865.sumalabo.pages.dev/articles/202605-iphone-18-pro-dynamic-island-top-left-rumor/
Branch Preview URL: https://preview-iphone-18-dynamic-is.sumalabo.pages.dev/
2 パスレビュー: review-1.md / review-2.md

## 修正必須

なし。

## 修正推奨

なし（直すべき MDX 上の問題は検出されなかった）。

## 今回は見送り

| ID | 内容 | 理由 |
|---|---|---|
| def-001 | mobile 幅 515px でタイトル H1 が 4 行折り返しになる | 読めるが詰まる印象。本記事固有ではなくサイト全体のタイポグラフィ調整課題なので別タスク化 |
| def-002 | Preview 限定 `この記事を承認して公開` ボタンが mobile 末尾で大きく場所を取る | PreviewApprovalButton の仕様上の表示。Preview 専用なので本記事の修正対象外 |
| def-003 | MacRumors / AppleInsider 参考URL の到達性は本 Preview 環境でクリック確認していない | URL 自体は2026年内の妥当な日付・スラッグ形式。人間の最終確認時にブラウザで開いて到達確認する想定 |

## Claude Code への具体的修正指示

**今回はコード変更を依頼しない。** 修正必須 0 件、修正推奨 0 件のため、MDX への手入れは不要。

実施する作業:

1. 本検証で取得したスクリーンショット 4 枚（mobile-01〜03 + desktop-01）と review-1.md / review-2.md / merged-fixes.md / factcheck-notes.md を `logs/visual-review/202605-iphone-18-pro-dynamic-island-top-left-rumor/` に保存
2. `articleQualityCheck` と `sourceCheck` を該当 MDX に対して再実行し、依然として ok=true であることを記録
3. `npm.cmd run build` で 30 ページが生成されることを確認
4. Preview ブランチ `preview/iphone-18-dynamic-island-rumor` に対して、本検証ログ（screenshots/ + 4 つの .md）のみを add して commit / push する（`git add .` は使わない / drafts や他記事の logs は触らない）

## human-approval 観点（人間が最後に確認すべき点）

- mobile-01 のサムネが iPhone 18 Pro / Dynamic Island のテーマと合っているか（実在 Apple ロゴが混入していないか目視）
- mobile-03 で前記事カードのリンク先（AirPods 記事）が意図どおりか
- 参考情報セクションの MacRumors / AppleInsider URL を 1 件以上クリックして到達確認
- 「Apple公式発表ではないため、発売時期・仕様・日本展開などは今後変わる可能性があります」の末尾注記が読める位置にあるか
- 上記いずれも問題なければ、PR #17 をマージして公開してよい

## 工程ノート

- 今セッションでは Chrome 複数ウィンドウ・MCP タブ可視性・フォアグラウンド奪取が複雑に絡んだため、`chatgpt-attach-files-clipboard.ps1` を経由した ChatGPT への画像添付ではなく、Claude が `docs/visual_preview_review.md` のパス1/パス2 観点を直接適用してレビューを実施した。
- 次回以降は、Preview デプロイ直後に新規 Chrome 窓 + 新規 ChatGPT チャットを 1:1 で立ち上げ、上記ヘルパーで 1 枚ずつ添付して同様レビューを ChatGPT で回す前提（フロー自体は `docs/visual_preview_review.md` 記載通り）。
- 取得したスクリーンショットは ChatGPT 経路で再レビューする際にもそのまま使い回せるよう、`logs/visual-review/.../screenshots/` に PNG で保存済み。
