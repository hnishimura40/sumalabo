# キャラクター画像 派生作成計画

このメモは、すまラボのキャラクター画像を記事やサイト内で使いやすくするための画像派生設計です。今回は設計のみで、画像加工はまだ実行しません。

## フォルダの役割

### original

- 置き場所: `assets/characters/original/`
- 役割: 加工前の原本を保管する場所
- 方針: 直接編集しない。派生画像を作るときは必ずここからコピーして加工する。

### full

- 置き場所: `assets/characters/full/`
- 役割: トップページ、カテゴリページ、OG画像、記事冒頭の大きめビジュアル向け
- 推奨サイズ: 幅800〜1200px程度
- 方針: キャラクター全体の印象を残す。背景透過またはシンプル背景が望ましい。

### half

- 置き場所: `assets/characters/half/`
- 役割: 記事中の案内ボックス、会話ボックス、内部リンクカード向け
- 推奨サイズ: 幅360〜600px程度
- 方針: 上半身またはキャラクターが読み取りやすい範囲で切り出す。スマホ表示で圧迫感が出ないことを優先する。

### icon

- 置き場所: `assets/characters/icon/`
- 役割: 吹き出し、短い補足、会話アイコン、注意ボックス向け
- 推奨サイズ: 幅160〜320px程度
- 方針: 顔や表情が分かることを優先する。小さく表示しても誰の発言か分かるようにする。

## 優先して作る派生画像

最初に作るべき派生は以下です。

- `assets/characters/icon/labomaru_normal_icon.webp`
- `assets/characters/icon/labomaru_worried_icon.webp`
- `assets/characters/icon/labomaru_chart_icon.webp`
- `assets/characters/icon/himari_question_icon.webp`
- `assets/characters/icon/himari_joyful_icon.webp`
- `assets/characters/half/himari_device_half.webp`
- `assets/characters/half/duo_talk_half.webp`
- `assets/characters/half/duo_guide_half.webp`

## 画像別の派生方針

### labomaru_normal.png

- 作る派生: full、half、icon
- 優先度: 高
- 主な用途: 汎用案内、導入、まとめ前
- 切り出し方針: icon は顔とアンテナが分かる範囲。half は全体がほぼ見える程度でもよい。

### labomaru_chart.png

- 作る派生: half、icon
- 優先度: 高
- 主な用途: 比較表補足、比較の見方
- 切り出し方針: チャート要素が見える範囲を残す。icon でもチャート感が消えすぎないようにする。

### labomaru_analytics.png

- 作る派生: half、icon
- 優先度: 中
- 主な用途: 分析、数字の意味づけ、料金や性能の整理
- 切り出し方針: 分析・グラフらしさが残る範囲を優先する。

### labomaru_worried.png

- 作る派生: half、icon
- 優先度: 高
- 主な用途: 注意点、初心者が迷いやすいポイント
- 切り出し方針: 表情が最重要。icon は顔中心で、不安そうな雰囲気が伝わる範囲にする。

### himari_joyful.png

- 作る派生: full、half、icon
- 優先度: 高
- 主な用途: 明るい導入、歓迎、初心者向け記事の入口
- 切り出し方針: icon は顔中心。half は上半身と表情が分かる構図にする。

### himari_device.png

- 作る派生: half、icon
- 優先度: 高
- 主な用途: スマホ・AI・ガジェット説明、機能紹介
- 切り出し方針: half ではデバイスが見える範囲を残す。icon は顔中心だが、可能ならデバイスの一部も残す。

### himari_question.png

- 作る派生: half、icon
- 優先度: 高
- 主な用途: 読者の疑問代弁、用語解説の入口
- 切り出し方針: icon は顔と疑問の雰囲気が伝わる範囲。上半身版は吹き出しや会話ボックスに使う。

### himari_teal.png

- 作る派生: full、half
- 優先度: 中
- 主な用途: 華やかな見せ場、SNS、サムネイル、流入記事
- 切り出し方針: 記事本文用よりもOG画像やSNS向けを優先する。派手になりすぎる場合は使用回数を抑える。

### duo_guide.png

- 作る派生: full、half
- 優先度: 高
- 主な用途: トップページ、カテゴリ案内、内部リンク導線
- 切り出し方針: 2人の関係性が分かる構図を維持する。half は横長カードでも使いやすい比率を検討する。

### duo_talk.png

- 作る派生: half、icon候補
- 優先度: 高
- 主な用途: 会話ボックス、記事冒頭の整理、初心者向け補足
- 切り出し方針: 会話している雰囲気を残す。icon化する場合は2人を無理に詰め込まず、会話ボックス用の小さめ横長画像として扱う。

## 顔だけ切り出すべき画像

以下は icon 用に顔中心の切り出しを優先します。

- `labomaru_normal.png`
- `labomaru_worried.png`
- `labomaru_chart.png`
- `labomaru_analytics.png`
- `himari_question.png`
- `himari_joyful.png`
- `himari_device.png`

特に `himari_question.png` と `labomaru_worried.png` は、表情が用途に直結するため、顔の見えやすさを最優先します。

## 上半身だけ切り出すべき画像

以下は half 用に上半身または中景の切り出しを優先します。

- `himari_joyful.png`
- `himari_device.png`
- `himari_question.png`
- `himari_teal.png`
- `duo_talk.png`
- `duo_guide.png`

ひまり単体は上半身にすると記事内の会話・補足に使いやすくなります。2人セットは、顔だけよりも関係性が見える構図を優先します。

## WebP化方針

- 派生画像は原則 `.webp` で作成する。
- 原本の `.png` は `original` に残す。
- full は品質を高めにし、OG画像やカテゴリページで劣化が目立たないようにする。
- half と icon は表示サイズが小さいため、ファイルサイズを抑える。
- ファイル名は `元ファイル名_用途.webp` の形式にする。

例:

- `labomaru_normal_icon.webp`
- `himari_device_half.webp`
- `duo_guide_full.webp`

## 画像加工スクリプトを作る場合の方針

スクリプトを作る場合は `scripts/` に置きます。

想定ファイル:

- `scripts/generate_character_derivatives.mjs`

方針:

- 入力元は `assets/characters/original/`
- 出力先は `assets/characters/full/`、`assets/characters/half/`、`assets/characters/icon/`
- 原本は上書きしない
- 既存の派生画像を上書きするかどうかはオプションで切り替える
- WebP出力を基本にする
- 画像ごとに crop / resize の設定を持てるようにする
- 最初は完全自動トリミングではなく、画像ごとの設定テーブルで安全に処理する

設定イメージ:

```js
{
  source: "himari_question.png",
  outputs: [
    {
      name: "himari_question_icon.webp",
      folder: "icon",
      width: 240,
      crop: "face"
    },
    {
      name: "himari_question_half.webp",
      folder: "half",
      width: 480,
      crop: "upper"
    }
  ]
}
```

## 次回の作業候補

1. 使用する画像加工ライブラリを決める。
2. 既存画像を目視確認し、画像ごとのトリミング方針を微調整する。
3. `scripts/generate_character_derivatives.mjs` を作る。
4. 優先派生8点だけ先に生成する。
5. 生成後、記事中で使う想定サイズで確認する。
