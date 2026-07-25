# 身体構造破綻の修正・遡及点検（2026-07-25）

## 即時修正

| 記事 | 対象 | before SHA-256 | after SHA-256 | 再生成 | 独立検品 |
|---|---|---|---|---|---|
| `ai-model-benchmark-cost-guide-2026` | `slide04-api-prices.webp` | `ac282c5850e670a5652fe2b4b624e1eb169064dff9f5acc675a579e01133e554` | `3ea91410ce3aec23c181ed92d167699693906a57321cbce19fdde4579d2ac73e` | Codex CLI `slide04` のみ、225.840秒 | pass。ひまりの腕2・手2、らぼまるの左右各1本、文字・数字・$記号を確認 |
| `202607-google-july-30-terms-media-settings` | `slide01-conclusion.webp` | `9cc7621b6736de0ce83d3e9cc90e0263cd0c870e12076dc3e478fa0d58e8694a` | `eace4185f58105dae42aebba0ccf57640794ba6d9824ba2e128f083b6054a735` | Codex CLI `slide01` のみ、239.323秒 | pass。らぼまるの腕は左右各1本、書類保持手は既存の右腕へ接続、第三の手なし |

比較用ファイルは `D:\downloads\sumalabo-codex\repairs\20260725-body-structure\` に保存した。

## 遡及全数点検

対象は演出ブロック導入日の2026-07-22以降に公開した10記事。各記事のサムネ1枚＋本文スライド8枚、合計90枚を目視点検した。

| 記事 | 点検数 | 明確な本数異常 | 微妙な崩れ（報告のみ） | 結果 |
|---|---:|---:|---:|---|
| `202607-yahoo-flea-auction-selling-fee-free-tcg` | 9 | 0 | 0 | 据え置き |
| `password-manager-guide` | 9 | 0 | 0 | 据え置き |
| `202607-carriers-iphone-price-hike` | 9 | 0 | 0 | 据え置き |
| `202607-openai-model-hugging-face-security-incident` | 9 | 0 | 0 | 据え置き。書類を複数扱うslide01/07は原寸再確認済み |
| `202607-apple-klarna-iphone-lease-rumor` | 9 | 0 | 0 | 据え置き。小道具が重なるslide04は原寸再確認済み |
| `202607-windows-11-gdid-privacy-explained` | 9 | 0 | 0 | 据え置き |
| `202607-netflix-poinpy-ios-android-free` | 9 | 0 | 0 | 据え置き。スマホとコインを持つslide05は原寸再確認済み |
| `202607-claude-opus-5-everyday-value` | 9 | 0 | 0 | 据え置き。カードを扱うslide01は原寸再確認済み |
| `ai-model-benchmark-cost-guide-2026` | 9 | 1 | 0 | slide04を修正済み |
| `202607-google-july-30-terms-media-settings` | 9 | 1 | 0 | slide01を修正済み |

## 生成経路

- 破綻2枚の元画像と修正版はすべて `codex_exec`。正本2枚を `--image` で添付した正規経路。
- ベンチマーク記事: 初回9枚＋今回のslide04再生成がCodex製。`image-fallback.json` なし。
- Google 7/30記事: 初回9枚＋既存slide06修正＋今回のslide01再生成の計11回がCodex製。全runの `failureCondition` は `null`、`image-fallback.json` なし。
- 工房チャット製は両記事とも0枚。今回の2件から「工房製に破綻が偏った」とする根拠はない。

## 使用量（今回の再生成）

- ベンチマーク slide04: input 542,529（cached 486,656）、output 3,088、reasoning output 862。
- Google slide01: input 734,730（cached 685,568）、output 3,011、reasoning output 599。

## アバター欠落

- 原因: Google記事だけが `CharacterBubble speaker="himari" mood="serious"` を使用し、`serious` が未定義だったため `face--fallback` の「ひ」が表示された。
- 全記事横断のmood使用値は `aha / curious / explain / point / serious / smile / worried`。未定義は `serious` の1件だけ。
- 互換alias `himari.serious -> explain` を追加。生成プロンプトには正規variant一覧と一覧外禁止を明記し、sourceとbuild後HTMLの両方で文字フォールバックを公開ブロック検出する。
