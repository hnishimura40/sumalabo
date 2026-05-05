# すまラボ キャラクター表示部品 仕様書

この仕様書は、すまラボの記事内で `らぼまる`、`ひまり`、2人セット画像を使うための表示部品設計です。

まだ実装ファイルは作りません。Astro / MDX / React などのサイト方式を決めた後、この仕様をもとにコンポーネント化します。

## 基本方針

- キャラクター画像は装飾ではなく、理解補助・導線補助として使う。
- 主役は記事本文。キャラクター部品は本文を読みやすくする補助に限る。
- 1記事あたりの使用は原則1〜3回まで。
- 短い速報・短文記事では無理に使わない。
- 本文と同じ内容を繰り返さない。
- 漫才調にしない。
- スマホ表示で本文幅を圧迫しない。
- 画像選定は `assets/characters/character_assets_manifest.md` を参照する。

## 画像選定の基本

### よく使う派生画像

- `assets/characters/icon/himari_question_icon.webp`
  - 用語解説の入口
  - 読者の疑問代弁
  - 「それってどういうこと？」の吹き出し

- `assets/characters/icon/labomaru_normal_icon.webp`
  - 要点整理
  - まとめ前の一言補足
  - 汎用案内

- `assets/characters/icon/labomaru_worried_icon.webp`
  - 注意点
  - 迷いやすいポイント
  - 失敗回避

- `assets/characters/icon/labomaru_chart_icon.webp`
  - 比較表の見方
  - 料金やスペックの整理
  - 比較軸の補足

- `assets/characters/half/himari_device_half.webp`
  - スマホ・AI・ガジェットの説明補助
  - 機能紹介

- `assets/characters/half/duo_talk_half.webp`
  - 記事冒頭の会話ボックス
  - 初心者向け補足
  - 比較の軸整理

- `assets/characters/half/duo_guide_half.webp`
  - 内部リンク導線
  - カテゴリ案内
  - 次に読む記事への案内

## CharacterCallout

### 用途

`CharacterCallout` は、らぼまるまたはひまり単体による短い補足部品です。

主な用途:

- 用語解説
- 注意点
- 要点整理
- 初心者が迷いやすいポイントの補足
- まとめ前の一言

### 想定入力

```ts
type CharacterCalloutProps = {
  character: "labomaru" | "himari";
  image: string;
  tone?: "normal" | "question" | "caution" | "compare" | "guide";
  title?: string;
  text: string;
};
```

### 入力例

```mdx
<CharacterCallout
  character="himari"
  image="/images/characters/icon/himari_question_icon.webp"
  tone="question"
  title="ここが最初のつまずきポイント"
  text="eSIMはカードを差し込む代わりに、スマホの中へ通信契約を書き込む仕組みです。"
/>
```

### 表示方針

- 画像は小さめにする。
- icon画像を基本にする。
- PCでは画像＋テキストの横並び、スマホでは必要に応じて縦積みでもよい。
- 本文より目立たせない。
- 吹き出しまたは補足カード風にする。
- 背景色は薄めにし、強い装飾は避ける。
- 注意系でも煽りすぎない。

### 推奨画像

- normal: `labomaru_normal_icon.webp`
- question: `himari_question_icon.webp`
- caution: `labomaru_worried_icon.webp`
- compare: `labomaru_chart_icon.webp`
- guide: `labomaru_normal_icon.webp`

### 使用ルール

- 1回の `text` は1〜2文まで。
- 本文の見出し代わりにしない。
- 比較表の直前・直後では小さめに表示する。
- 同じ記事で同じtoneを何度も使わない。

## CharacterDialogue

### 用途

`CharacterDialogue` は、ひまりが読者目線で質問し、らぼまるが短く整理する会話部品です。

主な用途:

- 導入直後の疑問整理
- 比較の軸整理
- 初心者の不安解消
- 難しい用語の入口

### 想定入力

```ts
type CharacterDialogueProps = {
  image?: string;
  lines: {
    speaker: "himari" | "labomaru";
    text: string;
  }[];
};
```

### 入力例

```mdx
<CharacterDialogue
  image="/images/characters/half/duo_talk_half.webp"
  lines={[
    { speaker: "himari", text: "eSIMって、普通のSIMカードと何が違うの？" },
    { speaker: "labomaru", text: "カードを差し替えずに、スマホ本体へ通信契約を入れられる仕組みです。" },
  ]}
/>
```

### 表示方針

- 会話は2〜3行まで。
- `duo_talk_half.webp` を優先候補にする。
- 画像は記事中で大きくしすぎない。
- 会話文は本文の代わりにしない。
- 長い説明は本文に戻す。
- ひまりの質問は読者が本当に迷う点に絞る。
- らぼまるの回答は短く、結論から書く。

### 推奨画像

- 基本: `duo_talk_half.webp`
- 画像なしの軽量表示も許可する。
- 2人セット画像が大きすぎる場合は、ひまり・らぼまるのiconを個別に使う実装でもよい。

### 使用ルール

- 1記事に1回、多くても2回まで。
- 導入直後に使う場合は、本文の導入と内容が重複しないようにする。
- 収益記事では、売り込み調の会話にしない。
- 不安をあおる会話にしない。

## CharacterGuideCard

### 用途

`CharacterGuideCard` は、次に読む記事やカテゴリへの導線を自然に案内する部品です。

主な用途:

- まとめ前の関連記事案内
- 内部リンク導線
- カテゴリ案内
- 土台記事から収益記事への橋渡し
- 流入記事から土台記事への橋渡し

### 想定入力

```ts
type CharacterGuideCardProps = {
  image?: string;
  title: string;
  text: string;
  links: {
    label: string;
    href: string;
    description?: string;
  }[];
};
```

### 入力例

```mdx
<CharacterGuideCard
  image="/images/characters/half/duo_guide_half.webp"
  title="次に読むなら"
  text="eSIMの仕組みが分かったら、次は格安SIMとの違いも見ておくと乗り換え判断がしやすくなります。"
  links={[
    {
      label: "格安SIMとは何か。大手と何が違う？",
      href: "/articles/what-is-cheap-sim",
      description: "料金が安くなる理由と注意点を整理します。"
    },
    {
      label: "楽天モバイルとahamoはどっち向き？",
      href: "/articles/rakuten-mobile-vs-ahamo",
      description: "使い方別に向いている人を比較します。"
    }
  ]}
/>
```

### 表示方針

- `duo_guide_half.webp` を優先候補にする。
- 関連記事リンクを自然に案内する。
- 露骨な広告感を出さない。
- 「買わせる」より「次に判断しやすくする」導線にする。
- リンクは2〜4件程度を目安にする。
- スマホ表示では画像を小さめにするか、下部に回してもよい。

### 推奨画像

- 基本: `duo_guide_half.webp`
- 会話感を出したい場合: `duo_talk_half.webp`
- 画像なしのテキストカードも許可する。

### 使用ルール

- まとめ前または記事末尾付近に置く。
- 記事冒頭には原則置かない。
- 収益記事へのリンクは、読者の理解が進んだ後に置く。
- PRや広告リンクとは見た目を分ける。

## 記事タイプ別の使い分け

### 土台記事

- 推奨使用回数: 2〜3回
- 向く部品: `CharacterDialogue`、`CharacterCallout`
- 目的: 疑問整理、用語の言い換え、注意点補足

例:

- 導入直後: `CharacterDialogue`
- 中盤: `CharacterCallout`
- まとめ前: `CharacterGuideCard`

### 収益記事

- 推奨使用回数: 1〜3回
- 向く部品: `CharacterCallout`、`CharacterGuideCard`
- 目的: 比較軸の整理、注意点、関連記事導線

例:

- 比較表の後: `CharacterCallout`
- 購入前チェック前: `CharacterCallout`
- まとめ前: `CharacterGuideCard`

### 流入記事

- 推奨使用回数: 1〜2回
- 向く部品: `CharacterCallout`、必要時のみ `CharacterDialogue`
- 目的: ニュースの意味づけ、生活者目線への変換

例:

- 導入直後: `CharacterCallout`
- まとめ前: 関連土台記事へ `CharacterGuideCard`

## 実装時に決めること

サイト方式を決めた後、以下を具体化します。

- コンポーネントの実装形式: Astro / React / Vue / Web Components など
- 画像パスの公開先: `/images/characters/...`
- CSS設計: グローバルCSS / CSS Modules / scoped style
- MDX内での呼び出し方法
- `characterUse` frontmatterからの使用回数チェック方法
- 画像のalt文生成ルール
