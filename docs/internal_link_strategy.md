# すまラボ 内部リンク設計

このファイルは、すまラボの優先12記事を中心にした内部リンク方針を整理するものです。目的は、記事単体で終わらせず、読者が「理解する」「比較する」「選ぶ」まで自然に進める導線を作ることです。

## 全体方針

- 1記事あたりの主要内部リンクは2〜4本程度に抑える。
- リンクは本文の流れに沿って置き、無理に詰め込まない。
- 土台記事は、関連する土台記事と収益記事へ送る。
- 収益記事は、比較の前提が分からない読者向けに土台記事へ戻すリンクも置く。
- 流入記事は、ニュースや話題の意味づけをしたあと、理解を深める土台記事へ送る。
- 記事末尾では `CharacterGuideCard` を使い、次に読む記事を自然に案内する。
- 料金、キャンペーン、スペックなど変動情報を扱う記事へ送るときは、更新日と最新確認の必要性を意識する。

## 基本導線

```text
流入記事
  ↓
土台記事
  ↓
収益記事
```

すまラボでは、いきなり購入・乗り換えをすすめるのではなく、まず読者が判断軸を理解できる状態を作ります。

例:

```text
AIスマホとは何か
  ↓
iPhoneとAndroid、結局どっちが向いている？
  ↓
3万円台スマホの選び方
  ↓
3万円台スマホおすすめ比較
```

```text
eSIMとは何か
  ↓
格安SIMとは何か
  ↓
格安SIMおすすめ比較
  ↓
楽天モバイルとahamoはどっち向き？
```

```text
USB-C充電器の選び方
  ↓
USB-C充電器おすすめ比較
```

## 優先12記事のリンク関係

### スマホ選び導線

中心になる土台記事:

- `iphone-vs-android`
- `used-smartphone-guide`
- `smartphone-under-30000-guide`

収益記事:

- `smartphone-under-30000-comparison`

推奨リンク:

- `iphone-vs-android` → `smartphone-under-30000-guide`
- `iphone-vs-android` → `used-smartphone-guide`
- `iphone-vs-android` → `smartphone-under-30000-comparison`
- `used-smartphone-guide` → `smartphone-under-30000-guide`
- `used-smartphone-guide` → `smartphone-under-30000-comparison`
- `smartphone-under-30000-guide` → `smartphone-under-30000-comparison`
- `smartphone-under-30000-comparison` → `smartphone-under-30000-guide`
- `smartphone-under-30000-comparison` → `used-smartphone-guide`

狙い:

- 迷いの大きい読者に、OS選び、予算、中古リスクの順で判断軸を渡す。
- 収益記事へ送る前に「何を重視するか」を整理させる。

### 通信費導線

中心になる土台記事:

- `what-is-esim`
- `what-is-cheap-sim`

収益記事:

- `cheap-sim-comparison`
- `rakuten-mobile-vs-ahamo`

推奨リンク:

- `what-is-esim` → `what-is-cheap-sim`
- `what-is-esim` → `cheap-sim-comparison`
- `what-is-esim` → `rakuten-mobile-vs-ahamo`
- `what-is-cheap-sim` → `what-is-esim`
- `what-is-cheap-sim` → `cheap-sim-comparison`
- `what-is-cheap-sim` → `rakuten-mobile-vs-ahamo`
- `cheap-sim-comparison` → `what-is-cheap-sim`
- `cheap-sim-comparison` → `what-is-esim`
- `cheap-sim-comparison` → `rakuten-mobile-vs-ahamo`
- `rakuten-mobile-vs-ahamo` → `what-is-cheap-sim`
- `rakuten-mobile-vs-ahamo` → `cheap-sim-comparison`

狙い:

- eSIMと格安SIMの基本理解から、具体的な比較・乗り換え判断へ送る。
- 収益記事では、不安な読者が基礎記事へ戻れるようにする。

### AI・ニュース導線

中心になる流入記事:

- `what-is-ai-smartphone`

受け皿になる土台記事:

- `iphone-vs-android`
- `smartphone-under-30000-guide`

収益記事:

- `smartphone-under-30000-comparison`

推奨リンク:

- `what-is-ai-smartphone` → `iphone-vs-android`
- `what-is-ai-smartphone` → `smartphone-under-30000-guide`
- `what-is-ai-smartphone` → `smartphone-under-30000-comparison`

狙い:

- 話題性で流入した読者に、スマホ選びの判断軸を渡す。
- 「AIだから買い替え」ではなく「自分の使い方に必要か」へ落とし込む。

### 周辺機器導線

中心になる土台記事:

- `usb-c-charger-guide`
- `power-bank-guide`

収益記事:

- `usb-c-charger-comparison`

推奨リンク:

- `usb-c-charger-guide` → `usb-c-charger-comparison`
- `usb-c-charger-guide` → `power-bank-guide`
- `power-bank-guide` → `usb-c-charger-guide`
- `power-bank-guide` → `usb-c-charger-comparison`
- `usb-c-charger-comparison` → `usb-c-charger-guide`
- `usb-c-charger-comparison` → `power-bank-guide`

狙い:

- 充電器とモバイルバッテリーを別々に扱いつつ、出力・安全性・持ち運びの判断軸を共通化する。
- 比較記事へ送る前に、W数や容量の基本を理解させる。

## カテゴリ内の回遊方針

### ニュースをかみくだく

- 話題性のある記事から、関連する土台記事へ送る。
- ニュース記事内では、キャラクター使用は1〜2回まで。
- 末尾では「この話題がスマホ選びにどう関係するか」を案内する。

代表導線:

- `what-is-ai-smartphone` → `iphone-vs-android`
- `what-is-ai-smartphone` → `smartphone-under-30000-guide`

### スマホの選び方

- OS選び、予算、中古リスクを横につなぐ。
- 選び方記事から比較記事へ送る。
- 比較記事から基礎記事へ戻れるリンクを置く。

代表導線:

- `iphone-vs-android` → `smartphone-under-30000-guide`
- `smartphone-under-30000-guide` → `smartphone-under-30000-comparison`
- `used-smartphone-guide` → `smartphone-under-30000-comparison`

### 通信費を下げる

- eSIM、格安SIM、具体比較の順に理解を積み上げる。
- 比較・乗り換え記事では、基礎記事への戻りリンクを目立たせすぎず用意する。

代表導線:

- `what-is-esim` → `what-is-cheap-sim`
- `what-is-cheap-sim` → `cheap-sim-comparison`
- `cheap-sim-comparison` → `rakuten-mobile-vs-ahamo`

### 周辺機器・ガジェット

- 選び方記事からおすすめ比較へ送る。
- 関連する周辺機器同士を相互にリンクする。

代表導線:

- `usb-c-charger-guide` → `usb-c-charger-comparison`
- `power-bank-guide` → `usb-c-charger-guide`

## 記事末尾に置くべき導線パターン

### 土台記事の末尾

目的:

- 読者が理解した直後に、具体比較へ進める。

おすすめパターン:

```text
ここまでで基本が分かったら、次は実際にどれを選ぶかを比較してみましょう。
```

リンク例:

- `what-is-cheap-sim` → `cheap-sim-comparison`
- `smartphone-under-30000-guide` → `smartphone-under-30000-comparison`
- `usb-c-charger-guide` → `usb-c-charger-comparison`

### 収益記事の末尾

目的:

- 迷っている読者を基礎記事へ戻す。
- 関連比較へ横移動させる。

おすすめパターン:

```text
まだ選び方に迷う場合は、先に基礎記事で判断軸を確認しておくと選びやすくなります。
```

リンク例:

- `cheap-sim-comparison` → `what-is-cheap-sim`
- `smartphone-under-30000-comparison` → `smartphone-under-30000-guide`
- `usb-c-charger-comparison` → `usb-c-charger-guide`

### 流入記事の末尾

目的:

- 話題の意味を、読者の選び方・買い替え判断へつなげる。

おすすめパターン:

```text
この話題が気になった人は、次にスマホ選びの基本も見ておくと判断しやすくなります。
```

リンク例:

- `what-is-ai-smartphone` → `iphone-vs-android`
- `what-is-ai-smartphone` → `smartphone-under-30000-guide`

## CharacterGuideCardで案内しやすいリンクパターン

### 用語理解から比較へ

使う記事:

- `what-is-esim`
- `what-is-cheap-sim`
- `usb-c-charger-guide`

カード文例:

```text
基本が分かったら、次は自分に合う選び方を比較してみましょう。
```

### 不安解消から購入判断へ

使う記事:

- `used-smartphone-guide`
- `power-bank-guide`
- `smartphone-under-30000-guide`

カード文例:

```text
注意点を押さえたうえで、具体的な候補を見ていくと失敗しにくくなります。
```

### ニュースから基礎理解へ

使う記事:

- `what-is-ai-smartphone`

カード文例:

```text
AIスマホの話題が気になった人は、次にスマホ選びの基本も確認しておくと、自分に必要か判断しやすくなります。
```

### 比較記事から基礎記事へ戻す

使う記事:

- `cheap-sim-comparison`
- `rakuten-mobile-vs-ahamo`
- `smartphone-under-30000-comparison`
- `usb-c-charger-comparison`

カード文例:

```text
まだ迷う場合は、先に選び方の基本に戻ると、自分に合う条件を整理しやすくなります。
```

## 実装時の注意

- `CharacterGuideCard` のlinksは2〜4件に抑える。
- 収益記事への導線は、本文の理解が進んだ後に置く。
- 比較記事内でリンクを増やしすぎると読者が迷うため、主要導線を優先する。
- 関連記事がまだ未作成の場合でも、slugはこの設計表に合わせて固定する。
