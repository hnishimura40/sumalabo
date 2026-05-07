# すまラボ 記事frontmatterテンプレート案

このドキュメントは、すまラボの記事を Markdown / MDX で管理する場合の frontmatter 仕様案です。

まだ `content/articles/_template.mdx` は作成しません。サイト方式を決めた後、この案をもとに実テンプレートへ落とし込みます。

## 基本テンプレート

```yaml
---
title: ""
slug: ""
type: ""
category: ""
description: ""
thumbnail: ""
thumbnailAlt: ""
status: "draft"
priority: 0
characterUse:
  recommended: false
  count: 0
  primary: ""
  secondary: ""
related: []
updated: ""
publishAt: ""
---
```

## 入力例

```yaml
---
title: "eSIMとは何か。初心者向けにやさしく解説"
slug: "what-is-esim"
type: "foundation"
category: "通信費を下げる"
description: "eSIMの意味、普通のSIMカードとの違い、向いている人、注意点を初心者向けに整理します。"
thumbnail: "/images/thumbnails/what-is-esim.webp"
thumbnailAlt: "スマホの通信設定を見ながらeSIMについて考えるひまりとらぼまる"
status: "draft"
priority: 1
characterUse:
  recommended: true
  count: 2
  primary: "himari_question_icon.webp"
  secondary: "labomaru_normal_icon.webp"
related:
  - "what-is-cheap-sim"
  - "rakuten-mobile-vs-ahamo"
updated: "2026-04-29"
publishAt: ""
---
```

## 各項目の意味

### title

- 記事タイトル。
- 検索結果やSNSで見ても意味が分かるタイトルにする。
- 煽りすぎず、読者の判断に役立つ表現を優先する。

例:

```yaml
title: "iPhoneとAndroid、結局どっちが向いている？"
```

### slug

- URL用の英数字スラッグ。
- 原則、小文字英数字とハイフンで管理する。
- 日本語ファイル名とは分けて考える。

例:

```yaml
slug: "iphone-vs-android"
```

### type

- 記事の役割。
- すまラボでは以下の3種類を基本にする。

候補:

- `foundation`: 土台記事
- `revenue`: 収益記事
- `news`: 流入記事・ニュース解説記事

例:

```yaml
type: "foundation"
```

### category

- サイト上のカテゴリ。
- 原則、以下の4カテゴリから選ぶ。

候補:

- `ニュースをかみくだく`
- `スマホの選び方`
- `通信費を下げる`
- `周辺機器・ガジェット`

例:

```yaml
category: "通信費を下げる"
```

### description

- 記事の短い説明。
- メタディスクリプションや記事一覧に使う。
- 80〜120字程度を目安にする。

例:

```yaml
description: "格安SIMが安い理由、大手キャリアとの違い、向いている人と注意点を初心者向けに整理します。"
```

### thumbnail

- 記事サムネイルの公開パス。
- サムネイルは毎回ChatGPT側で作成する。
- Codexは自動生成しない。
- Codexは作成済みサムネイルを所定フォルダへ配置し、この項目に反映する。
- 標準サイズは1200 x 675px、比率は16:9、形式はWebPにする。

推奨:

```yaml
thumbnail: "/images/thumbnails/article-slug.webp"
```

作業中の素材置き場:

- 原本: `assets/thumbnails/original/`
- WebP: `assets/thumbnails/webp/`
- プロンプト: `assets/thumbnails/source-prompts/`

公開時の想定:

- `public/images/thumbnails/`

### thumbnailAlt

- サムネイル画像の代替テキスト。
- 画像の内容と記事テーマが分かるように書く。
- SEOキーワードの詰め込みはしない。

例:

```yaml
thumbnailAlt: "iPhoneとAndroidスマホを見比べながら選び方を考えるひまりとらぼまる"
```

### status

- 記事の作業状態。

候補:

- `idea`: アイデア
- `outline`: 構成案
- `draft`: 下書き
- `review`: 確認待ち
- `ready`: 公開準備済み
- `published`: 公開済み
- `needs-update`: 更新必要

例:

```yaml
status: "draft"
```

### priority

- 優先度。
- 数字が小さいほど優先度が高い運用にする。

目安:

- `1`: 最優先記事
- `2`: 重要記事
- `3`: 通常記事
- `4`: 後回し

例:

```yaml
priority: 1
```

### characterUse

- 記事本文中でキャラクター部品を使うかどうかの目安。
- 実際に使う画像は `assets/characters/character_assets_manifest.md` を参照して選ぶ。

```yaml
characterUse:
  recommended: true
  count: 2
  primary: "himari_question_icon.webp"
  secondary: "labomaru_normal_icon.webp"
```

#### recommended

- キャラクター使用を推奨するか。
- 用語解説、初心者向け、比較整理では `true` になりやすい。
- 短いニュースや速報では `false` でもよい。

#### count

- 記事内で使う予定回数。
- 原則1〜3回まで。
- 4回以上は避ける。

#### primary

- メインで使う派生画像。
- 例: `himari_question_icon.webp`

#### secondary

- 補助的に使う派生画像。
- 例: `duo_guide_half.webp`

### related

- 関連記事のslug一覧。
- 内部リンク導線や `CharacterGuideCard` で使う。

例:

```yaml
related:
  - "what-is-cheap-sim"
  - "rakuten-mobile-vs-ahamo"
```


### publishAt

- 予約投稿用の公開予定日時。
- 任意項目。空または未設定なら通常どおり公開対象になる。
- 未来日時を指定した記事は、指定時刻を過ぎるまでトップページ、記事一覧、カテゴリ、記事詳細、sitemapに出さない。
- 日本時間で予約する場合は、タイムゾーン付きISO形式で書く。

例:

```yaml
publishAt: "2026-05-08T09:00:00+09:00"
```

### updated

- 最終更新日。
- `YYYY-MM-DD` 形式を基本にする。
- 料金、キャンペーン、スペック、発売状況などを扱う記事では特に重要。

例:

```yaml
updated: "2026-04-29"
```

## 記事タイプ別frontmatter例

### 土台記事

```yaml
---
title: "格安SIMとは何か。大手と何が違う？"
slug: "what-is-cheap-sim"
type: "foundation"
category: "通信費を下げる"
description: "格安SIMが安い理由、大手キャリアとの違い、向いている人と注意点を初心者向けに整理します。"
thumbnail: "/images/thumbnails/what-is-cheap-sim.webp"
thumbnailAlt: "スマホ料金を見直しながら格安SIMについて考えるひまりとらぼまる"
status: "draft"
priority: 1
characterUse:
  recommended: true
  count: 3
  primary: "himari_question_icon.webp"
  secondary: "labomaru_worried_icon.webp"
related:
  - "what-is-esim"
  - "rakuten-mobile-vs-ahamo"
updated: "2026-04-29"
---
```

### 収益記事

```yaml
---
title: "格安SIMおすすめ比較"
slug: "cheap-sim-comparison"
type: "revenue"
category: "通信費を下げる"
description: "料金、通信品質、使いやすさ、サポートの違いから、使い方別に向いている格安SIMを整理します。"
thumbnail: "/images/thumbnails/cheap-sim-comparison.webp"
thumbnailAlt: "複数のスマホ料金プランを比較する表とらぼまる"
status: "draft"
priority: 1
characterUse:
  recommended: true
  count: 2
  primary: "labomaru_chart_icon.webp"
  secondary: "duo_guide_half.webp"
related:
  - "what-is-cheap-sim"
  - "what-is-esim"
updated: "2026-04-29"
---
```

### 流入記事

```yaml
---
title: "AIスマホとは何か。何が便利で何がまだ微妙？"
slug: "what-is-ai-smartphone"
type: "news"
category: "ニュースをかみくだく"
description: "AIスマホでできること、便利な場面、まだ期待しすぎないほうがよい点を生活者目線で整理します。"
thumbnail: "/images/thumbnails/what-is-ai-smartphone.webp"
thumbnailAlt: "AI機能付きスマホを見ながら便利さと注意点を考えるひまり"
status: "draft"
priority: 1
characterUse:
  recommended: true
  count: 2
  primary: "himari_device_half.webp"
  secondary: "labomaru_normal_icon.webp"
related:
  - "iphone-vs-android"
  - "budget-smartphone-guide"
updated: "2026-04-29"
---
```

## content/articles/_template.mdx 案

まだファイルは作成しません。作る場合は以下のような構成にします。

```mdx
---
title: ""
slug: ""
type: ""
category: ""
description: ""
thumbnail: ""
thumbnailAlt: ""
status: "draft"
priority: 0
characterUse:
  recommended: false
  count: 0
  primary: ""
  secondary: ""
related: []
updated: ""
---

## 先に結論

本文を書く。

## この記事で分かること

- 
- 
- 

## 本文見出し

本文を書く。

## 注意点

本文を書く。

## まとめ

本文を書く。
```

## 運用メモ

- 料金、キャンペーン、発売日、スペックなど変動情報を含む場合は、公開前に必ず確認する。
- サムネイルはChatGPT側で作成し、Codexは配置とfrontmatter反映だけ行う。
- キャラクター使用数は `characterUse.count` と本文内の実使用数がズレないようにする。
- `related` は記事導線の核になるため、流入記事、土台記事、収益記事の流れを意識して設定する。
