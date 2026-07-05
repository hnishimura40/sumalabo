# X投稿プレイブック（Phase C強化・xPostOptions）

すまラボの X（@suma_labo）投稿の「型」を管理するフラグと、計測・改善の回し方。
実装: `scripts/automation/x-post-options.mjs` ／ 状態: `data/automation/autonomy.json` の `xPostOptions`。

## フラグの意味

```json
"xPostOptions": {
  "attachSlides": false,
  "attachSlidesCount": 3,
  "threadAllSlides": false,
  "postWindow": null
}
```

| フラグ | OFF（既定＝現状維持） | ON のとき |
|---|---|---|
| `attachSlides` | 画像添付なし（OGPカード任せ） | 投稿に**スライドWebPの先頭N枚**を画像添付（サムネではなくスライド優先）。本文+記事リンクは従来どおり。添付は既存のクリップボード/ファイル選択実績方式を流用し、**添付枚数の一致をDOMで検証してから**投稿する |
| `attachSlidesCount` | —（既定3） | 添付する先頭枚数（最大4） |
| `threadAllSlides` | 返信なし | 投稿への**返信ツリー**で残りスライドをぶら下げる（1返信に4枚まで）。実験用 |
| `postWindow` | `null`＝即投稿 | `{"start":"07:20","end":"08:00"}` のように設定すると、Phase C 到達がその窓より前なら**窓の開始まで投稿を保留**。窓を過ぎていた場合は保留せず即投稿（公開済み記事を放置しない安全側）。無人runが早朝に公開→通勤帯に投稿、を実現する |

- ハッシュタグは**上限2個**（`#すまラボ` 必須 + 話題タグ1個。2026-07-05にフラグとは独立して変更済み）
- 禁則語チェック・280加重ガード・二重投稿ガードは**フラグと無関係に常時有効**

## 推奨初期設定（testMode 完了後にユーザーが宣言してON）

```json
"xPostOptions": {
  "attachSlides": true,
  "attachSlidesCount": 3,
  "threadAllSlides": false,
  "postWindow": { "start": "07:20", "end": "08:00" }
}
```

理由: 無人run（4:30起動→5〜6時台公開）の投稿を通勤帯（7:20-8:00）に送らせ、
1枚目のスライド3枚で「開かなくても要点が分かる」型を試す。thread は反応を見てから。

## 計測の見方（variant 台帳）

投稿ごとに `data/social/x-posted.json` に **`variant`** フィールドが記録される:

| variant | 意味 |
|---|---|
| `text_only` | 本文+リンクのみ（OGPカード任せ）＝従来型 |
| `slides3` | スライド3枚添付 |
| `slides3+thread` | スライド3枚+返信ツリーで残り全部 |

比較の回し方:
1. 各型で最低3〜5本たまったら、X アナリティクス（インプレッション・リンククリック・プロフィールアクセス）を投稿URL単位で控える
2. `x-posted.json` の variant と突き合わせ、**リンククリック率**を第一指標に型を選ぶ（インプレッションだけで判断しない）
3. 勝った型を既定に昇格し、次の1変数だけ変えて続ける（同時に2つ変えない）

## 切り替え手順

1. `data/automation/autonomy.json` の `xPostOptions` を編集（上の推奨値をコピー）
2. 変更は次の Phase C 実行から反映（deploy 不要。phase-c-auto が実行時に読む）
3. 戻すときは値を既定（全OFF）に戻すだけ

## 安全上の不変条件

- フラグが全OFFのとき、Phase C の挙動・出力は従来と**完全に同一**（テストで担保: `tests/sumahon/x-post-options.test.mjs`）
- 投稿は常に1回のみ（曖昧な失敗は syndication 照会で実在確認してから判断）
- 添付検証（枚数一致）に失敗したら投稿しない
- `autonomy.json` の level / testMode / xPostMethod はこのプレイブックの対象外（変更しない）
