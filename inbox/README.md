# inbox/ — 未処理の記事素材置き場（user-directed mode）

新しいブログ記事素材は **このフォルダ直下**（または分類サブフォルダ内）に置きます。ブログ化（MDX 化・WebP 化・PR・本番反映）が完了したら、対象フォルダは `../_published_articles/` へ移動する運用です。

> **user-directed mode 運用です**（2026-05-23 〜）。Claude はこのフォルダの中身を自動巡回しません。**ユーザーが Claude に「このフォルダで記事化して」と明示指示したとき** だけ処理が始まります。詳細: `docs/user_directed_mode.md`

## 現在の中身

未処理の素材フォルダのみ（処理済みは `_published_articles/` へ）。

## ワークフロー（3 フェーズ + Checkpoint）

1. **素材を置く**: 下書き `ブログ記事.txt` + 画像（PNG / JPG）をこのフォルダ直下に
2. **Claude に依頼**: フォルダ名を伝えて記事化を依頼
   - 例：「`inbox/<テーマ>/` で記事化して」
   - 補助コマンド：`npm run sumalabo:from-folder -- "<absolute path>"`（ガイド表示のみ）
3. **Phase A**: Claude が自律処理（WebP 化 → MDX → build → PR 作成）
4. **🛑 Human Review Checkpoint**: Claude が **PR URL / Preview URL / 検証結果を提示して停止**。ユーザーが Preview を確認
5. **了承**: 「**記事OK、公開へ**」「承認」「本番反映して」など明示返答
6. **Phase B**: Claude が PR merge → wrangler fallback deploy → strict verify → queue を `published` に
7. **Phase C**: Claude が Chrome で X 投稿（OGPカード / サムネ / @suma_labo 確認後）→ 投稿URL取得 → queue を `x_posted` に
8. **完了**: Claude が対象フォルダを `_published_articles/<元のフォルダ名>` に移動、本番URL・投稿URLを報告

> **Checkpoint で必ず停止します。** ユーザー記事確認・明示了承前の merge / deploy / X 投稿は禁止です。詳細: [`docs/user_directed_mode.md`](../docs/user_directed_mode.md)

## 命名の例

```
inbox/
├── 100ドルAI比較/          # 未処理
├── エージェント型AI比較/    # 未処理
└── README.md               # この説明

../_published_articles/      # 公開済みアーカイブ
├── chatgpt5.5cyber/
├── google ai proの特典/
├── gemini omni/
└── ...
```

## 元素材の扱い

- 元 PNG / JPG / 下書き txt は削除せず、`_published_articles/` 配下に保管
- リポジトリには WebP 化したものだけを配置（`public/images/...`）
- 元素材はバックアップとして温存

## 注意

- `inbox/googleニュース/_published/` のような中間アーカイブは廃止。すべて `_published_articles/` に集約
- ブログ化前に `_published_articles/` 配下を触らない（公開済み素材の改変は別タスク）
- **自動巡回はしない**。ユーザー指示があるまで Claude はここを見にきません
