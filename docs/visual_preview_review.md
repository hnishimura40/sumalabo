# Preview スクショレビュー（見た目 + ファクトチェック）

すまラボの記事 Preview を ChatGPT に見せて、見た目と中身（ファクト）を 2 段階でレビューする工程の手順とチェック観点。

`articleQualityCheck` や `sourceCheck` は本文 MDX を機械的に検査するものだが、レイアウト崩れ・スマホ表示・トーン感・煽りすぎ・サムネと本文の温度差などはスクショで人間/AI が見ないと分からない。Preview スクショレビューはその穴を埋める。

## 役割分担

| チェック | 対象 | 実装 | 検出する観点 |
|---|---|---|---|
| `sourceCheck` (`validateSourceReferences`) | MDX | 機械的 | 参考情報セクションの有無、URL 数、すまほん非露出、報道ベース注意文 |
| `articleQualityCheck` (`validateArticleQuality`) | MDX | 機械的 | タイトル重複、本文 H1、Markdown 残骸、ボックス内見出し、キャラ要素不足、冒頭構造 |
| **`visualPreviewReview` (本ドキュメント)** | Preview スクショ | Claude in Chrome + ChatGPT 2 パス | スマホ表示崩れ、読み味、トーン、煽りすぎ、サムネと本文の温度差、機械検査では拾えないファクトの違和感 |

3 つは並列で動かす前提。`sourceCheck` / `articleQualityCheck` が blocking、`visualPreviewReview` は warning 中心（致命だけ blocking 化する想定）。

## スクショ取得

Preview ブランチが Cloudflare Pages に上がったあと、Claude in Chrome が以下のスクショを撮る:

- mobile-01.png … mobile 表示の冒頭（タイトル + summary-box + 冒頭段落）
- mobile-02.png … mobile 表示の中盤（見出し展開、補助ボックス、キャラ会話付近）
- mobile-03.png … mobile 表示の末尾（## 参考情報 セクション）
- desktop-01.png … desktop 表示の冒頭
- desktop-02.png … desktop 表示の参考情報セクション

保存先:

```
logs/visual-review/{slug}/screenshots/mobile-01.png
logs/visual-review/{slug}/screenshots/mobile-02.png
logs/visual-review/{slug}/screenshots/mobile-03.png
logs/visual-review/{slug}/screenshots/desktop-01.png
logs/visual-review/{slug}/screenshots/desktop-02.png
```

ファイル名のプレフィックス（mobile/desktop, 連番）はそのまま貼り付け順になる。

## ChatGPT への添付

新規 ChatGPT チャットを 1 つ開き、`scripts/automation/chatgpt-attach-files-clipboard.ps1` で **1 ファイルずつ順番に** 貼り付ける。

```
powershell.exe -NoProfile -ExecutionPolicy Bypass -File `
  "D:\documents\動画作成関連\すまラボ\scripts\automation\chatgpt-attach-files-clipboard.ps1" `
  -Files "logs\visual-review\{slug}\screenshots\mobile-01.png", `
         "logs\visual-review\{slug}\screenshots\mobile-02.png", `
         "logs\visual-review\{slug}\screenshots\mobile-03.png", `
         "logs\visual-review\{slug}\screenshots\desktop-01.png", `
         "logs\visual-review\{slug}\screenshots\desktop-02.png"
```

- 1 枚ずつ CF_HDROP → Ctrl+V。2 枚同時 CF_HDROP は ChatGPT が `files[0]` しか拾わないので使わない
- `[data-testid="modal-duplicate-file"]` モーダルが出たら OK で閉じて続行
- 添付件数を DOM で確認: `document.querySelectorAll('button[aria-label^="ファイル"][aria-label*="削除"]').length`

## 2 パスレビュー

同じ ChatGPT チャットの中で **2 回** レビューさせる。1 回目と 2 回目で観点を変える。

### 1 回目: 読みやすさ / 見た目 / スマホ表示

プロンプト雛形:

```
このページは「{記事タイトル}」の Preview スクリーンショットです。
mobile-01〜mobile-03 がスマホ表示、desktop-01〜desktop-02 がPC表示です。
見た目と読み味を厳しめにレビューしてください。

確認してほしいこと:
- スマホで見たときに文字が小さすぎたり長すぎたりしないか
- summary-box / check-box / info-box / table-card のレイアウトが崩れていないか
- 補助ボックスの中に H1〜H3 見出しが入っていないか
- タイトルや見出しが煽りすぎていないか
- 「最終稿として」「初稿」「以下、本文」などのメタ的な残骸が表示されていないか
- 孤立した `**` や ```md フェンスが残っていないか
- ひまり・らぼまるが「ニュース理解後の反応」になっているか（質問→説明の固定構図になっていないか）
- 記事として導入→展開→まとめの流れが読み取れるか
- 末尾に ## 参考情報 セクションが見える位置にあるか

出力は箇条書きで:
- 修正必須（読みにくさ・崩れ・残骸）
- 修正推奨（より読みやすくできる箇所）
- 今回は見送り（次回以降のテンプレ改善でOK）
```

回答完了後、Claude in Chrome が全文コピーして
`logs/visual-review/{slug}/review-1.md` に保存。

### 2 回目: 編集者目線 + ファクトチェック目線

同じチャット内で続けて投げる:

```
ありがとうございます。次に、編集者として厳しめにファクトチェックしてください。
スクショ全体から読み取れる主張と、参考情報セクションから読み取れる出典を照らし合わせて、
以下を厳しめに確認してください。

# 共通チェック
- 公開記事本文・参考情報・リンク欄に「すまほん」「smhn.info」が出ていないか
- ## 参考情報 セクションがあるか
- 参考URLが2件以上あるか
- 公式情報・元報道・関連報道のどれが含まれているか
- 報道ベース・噂ベースの記事なら「公式発表ではない」「今後変わる可能性がある」注意文があるか
- 発売日 / 価格 / 日本展開 / 対応機種 / 料金などを断定していないか
- タイトル・見出しが煽りすぎていないか
- サムネイルに実在ロゴや元記事画像のコピーが入っていないか
- サムネイルの文字がスマホでも読めるか
- キャラクター表現が情報整理に役立っているか（笑いに振りすぎていないか）

# iPhone / Apple系記事の追加チェック
- Apple公式発表と報道・噂を混同していないか
- iPhone 18 Pro など未発表製品の仕様を確定情報として書いていないか
- Dynamic Island / Face ID / 前面カメラ などの部品説明が混同していないか
- 参考情報がApple公式・元報道・信頼できる関連報道に寄っているか
- Apple / iPhone / Siri などの実在ロゴをサムネイルに使っていないか

# AI / ガジェット系記事の追加チェック
- AI機能を実際より万能に見せていないか
- プライバシーや安全面を軽視していないか
- 生活者に関係ある話に落とし込めているか
- 「今すぐ買うべき」などの過剰誘導になっていないか

出力は箇条書きで:
- 修正必須（事実誤認・断定しすぎ・出典不足）
- 修正推奨（より誠実にできる箇所）
- 今回は見送り
- 該当なし（チェックはしたが問題なし）
```

回答完了後、Claude in Chrome が全文コピーして
`logs/visual-review/{slug}/review-2.md` に保存。

### 統合 (merged-fixes.md)

最後に同じチャットで 1〜2 回目を統合させる:

```
1回目と2回目のレビューを統合してください。重複は1つにまとめ、
最終的に Claude Code が機械的に処理できる形に整理してください。

出力:
## 修正必須
- [箇所] [現状] → [期待] [理由]
...

## 修正推奨
...

## 今回は見送り
...

## ファクトチェック注記（今後の参考）
...
```

保存先:
- `logs/visual-review/{slug}/merged-fixes.md`
- ファクトチェック観点だけを切り出した `logs/visual-review/{slug}/factcheck-notes.md`
- Claude Code が反映した修正の記録 `logs/visual-review/{slug}/applied-fixes.json`

## applied-fixes.json のスキーマ

```jsonc
{
  "slug": "202605-iphone-18-pro-dynamic-island-top-left-rumor",
  "reviewedAt": "2026-05-11T14:32:00+09:00",
  "screenshots": [
    "logs/visual-review/{slug}/screenshots/mobile-01.png",
    "..."
  ],
  "reviews": {
    "pass1": "logs/visual-review/{slug}/review-1.md",
    "pass2": "logs/visual-review/{slug}/review-2.md",
    "merged": "logs/visual-review/{slug}/merged-fixes.md",
    "factcheck": "logs/visual-review/{slug}/factcheck-notes.md"
  },
  "fixes": [
    {
      "id": "fix-001",
      "category": "fact",           // fact | layout | tone | meta | thumbnail
      "severity": "blocking",       // blocking | recommended | deferred
      "location": "本文 第2段落",
      "before": "iPhone 18 Pro は左上に Dynamic Island を移動します。",
      "after":  "iPhone 18 Pro では左上に移動する可能性が報じられています。",
      "reason": "Apple公式発表ではなく報道ベースなので断定を避ける",
      "appliedCommit": "abc1234"
    }
  ],
  "deferred": [
    { "id": "def-001", "note": "サムネイルの色味は次回テンプレ改善で調整" }
  ]
}
```

Claude Code は `merged-fixes.md` を読み、`fixes[].severity === "blocking"` を必ず反映、`recommended` は判断して反映、`deferred` は無視する。反映したものを `appliedCommit` 付きで `applied-fixes.json` に追記する。

## ブラウザ操作ポリシー（再掲）

- Chrome のみ。Edge は触らない
- hidden file input を直接クリックしない
- `file_upload` API は使わない
- スクショ添付は `scripts/automation/chatgpt-attach-files-clipboard.ps1` 経由（1 ファイルずつ CF_HDROP → Ctrl+V）
- クリップボード経路が通らない場合のみ UWSC フォールバック（`docs/uwsc_chatgpt_file_attach_test.md`）

## 関連ファイル

- `scripts/automation/chatgpt-attach-files-clipboard.ps1` — 1 ファイルずつクリップボード貼り付けの共通ヘルパー（サムネベース画像にもスクショレビューにも使う）
- `docs/chatgpt_file_attach_clipboard.md` — クリップボード添付の標準フロー
- `docs/uwsc_chatgpt_file_attach_test.md` — UWSC フォールバック
- `scripts/sumahon/validate-generated-article.mjs` — sourceCheck / articleQualityCheck
- `scripts/sumahon/generate-handoff.mjs` — handoff / chrome-steps の生成元
