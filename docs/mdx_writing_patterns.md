# すまラボ MDX記述パターン集

このドキュメントは、すまラボの記事でよく使うMDXパターンをまとめたものです。

土台記事の標準例は `content/articles/what-is-esim.mdx` です。新しい基礎記事を作るときは、このファイルと `content/articles/_template.mdx` を参照します。

## import

キャラクター部品を使う記事では、frontmatterの下に以下を入れます。

```mdx
import CharacterCallout from "../../src/components/characters/CharacterCallout.astro";
import CharacterDialogue from "../../src/components/characters/CharacterDialogue.astro";
import CharacterGuideCard from "../../src/components/characters/CharacterGuideCard.astro";
```

## 30秒でわかる結論ボックス

```mdx
<div class="summary-box">
  <p class="box-label">30秒でわかる結論</p>
  <ul>
    <li>結論を1行で書く</li>
    <li>読者に関係するポイントを書く</li>
    <li>注意点を短く書く</li>
    <li>初心者が先に確認することを書く</li>
  </ul>
</div>
```

使い方:

- 導入文の直後に置く
- 4項目程度に抑える
- 長文にしない

## CharacterDialogue

```mdx
<CharacterDialogue
  image="/images/characters/duo_talk_half.webp"
  lines={[
    { speaker: "ひまり", text: "それって、結局どういうこと？" },
    { speaker: "らぼまる", text: "ざっくり言うと、ここに短く整理します。" },
  ]}
/>
```

使い方:

- 導入直後に使いやすい
- 会話は2〜3行まで
- 本文の代わりにしない

## CharacterCallout

```mdx
<CharacterCallout
  character="ひまり"
  image="/images/characters/himari_question_icon.webp"
  tone="caution"
  title="ここは先に確認"
  text="読者がつまずきやすいポイントを短く補足します。"
/>
```

おすすめ画像:

- 用語や疑問: `himari_question_icon.webp`
- 要点整理: `labomaru_normal_icon.webp`
- 注意点: `labomaru_worried_icon.webp`
- 比較表の見方: `labomaru_chart_icon.webp`

## CharacterGuideCard

```mdx
<CharacterGuideCard
  image="/images/characters/duo_guide_half.webp"
  title="次に読むなら"
  text="この記事の次に読むと判断しやすくなる記事を案内します。"
  links={[
    {
      label: "記事一覧を見る",
      href: "/articles/",
      description: "公開中の記事を一覧で確認できます。"
    },
    {
      label: "通信費を下げるカテゴリを見る",
      href: "/categories/mobile-plan/",
      description: "eSIM、格安SIM、乗り換え判断の記事をまとめます。"
    }
  ]}
/>
```

使い方:

- まとめ前か記事末尾に置く
- リンクは2〜4件まで
- 未作成記事へは直リンクしない

## 比較表

```mdx
| 項目 | A | B |
|---|---|---|
| 形 | Aの説明 | Bの説明 |
| 使いやすさ | Aの説明 | Bの説明 |
| 初心者向け | Aの説明 | Bの説明 |
| 注意点 | Aの説明 | Bの説明 |
```

使い方:

- 表の前に「何を比べるのか」を短く書く
- 表の後に「どちらが向くか」を補足する
- スマホでは横スクロールになるため、セル内の文章は短くする

## メリットカード

```mdx
<div class="point-grid">
  <section>
    <h3>メリット1</h3>
    <p>短い説明を書く。</p>
  </section>
  <section>
    <h3>メリット2</h3>
    <p>短い説明を書く。</p>
  </section>
  <section>
    <h3>メリット3</h3>
    <p>短い説明を書く。</p>
  </section>
</div>
```

使い方:

- 3つ程度に絞る
- カード内の文章は短くする
- 収益記事では「用途別おすすめ」にも流用できる

## チェックリスト

```mdx
<div class="check-box">
  <p class="box-label">申し込み前チェックリスト</p>
  <ul class="check-list">
    <li>確認項目1</li>
    <li>確認項目2</li>
    <li>確認項目3</li>
    <li>確認項目4</li>
  </ul>
</div>
```

使い方:

- 申し込み前、購入前、設定前の確認に使う
- 4〜6項目程度に抑える
- 深刻に煽らず、確認すれば避けられる形にする

## 未作成記事への将来リンクコメント

```mdx
{/* Future links: /articles/what-is-cheap-sim/, /articles/cheap-sim-comparison/ */}
```

使い方:

- まだ記事がないslugへリンクしたい場合に使う
- 実リンクは貼らない
- 後で記事ができたら `CharacterGuideCard` や本文リンクへ反映する

## 実リンクと将来リンク候補の使い分け

実リンクにしてよいもの:

- すでに存在する記事
- `/articles/`
- `/categories/news/`
- `/categories/smartphone/`
- `/categories/mobile-plan/`
- `/categories/gadgets/`

将来リンクコメントにするもの:

- まだMDXファイルがない記事
- まだ公開準備ができていない記事
- slugだけ先に決めている記事

基本:

```text
作成済みページ -> hrefで実リンク
未作成記事 -> Future linksコメント
```

## キャラクター使用回数の目安

- 短い記事: 1回
- 通常の土台記事: 2〜3回
- 比較記事: 1〜2回
- ニュース記事: 0〜2回

4回以上は原則使いません。
