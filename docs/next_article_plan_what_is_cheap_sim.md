# 次記事作成メモ: 格安SIMとは何か。大手と何が違う？

本文はまだ作成しません。次に `content/articles/what-is-cheap-sim.mdx` を作るための下準備メモです。

## 基本情報

- 記事タイトル: 格安SIMとは何か。大手と何が違う？
- slug: `what-is-cheap-sim`
- type: `foundation`
- category: `通信費を下げる`
- categorySlug: `mobile-plan`
- priority: 1

## 記事の目的

格安SIMが安い理由、大手キャリアとの違い、メリット、注意点、向いている人を初心者にも分かる言葉で整理する。

`what-is-esim` から受け、将来の `cheap-sim-comparison` と `rakuten-mobile-vs-ahamo` へ送る土台記事にする。

## 30秒でわかる結論案

- 格安SIMは、大手キャリアより月額料金を下げやすいスマホ回線サービス
- 安い理由は、店舗やサポート、回線設備の持ち方などが大手と違うため
- ただし、混雑時の速度、サポート、初期設定には注意が必要
- 初心者は「毎月のデータ量」「店舗サポートが必要か」「乗り換え手順」を先に確認する

## 比較表案

| 項目 | 格安SIM | 大手キャリア |
|---|---|---|
| 月額料金 | 下げやすい | 高めになりやすい |
| 店舗サポート | 少ない場合がある | 相談しやすい |
| 通信速度 | 混雑時に差が出る場合がある | 安定しやすい |
| 初期設定 | 自分で進める場面が多い | 店舗で相談しやすい |
| 向いている人 | 料金を下げたい人 | サポート重視の人 |

## 注意点チェックリスト案

- 自分の毎月のデータ量を確認したか
- 通話をどれくらい使うか確認したか
- 店舗サポートが必要か考えたか
- 使うスマホが乗り換え先に対応しているか
- MNPや初期設定の流れを確認したか
- キャンペーンだけで判断していないか

## 向いている人 / 向いていない人案

| 向いている人 | 向いていない人 |
|---|---|
| 通信費を下げたい | 店舗で相談しながら契約したい |
| オンライン手続きに抵抗が少ない | スマホ設定がかなり苦手 |
| 毎月のデータ量がある程度分かる | 通信品質の安定を最優先したい |
| サポートより料金を重視する | 家族全員を店頭でまとめて管理したい |

## 推奨キャラクター部品

- 導入直後: `CharacterDialogue` + `duo_talk_half.webp`
- 注意点: `CharacterCallout` + `labomaru_worried_icon.webp`
- まとめ前: `CharacterGuideCard` + `duo_guide_half.webp`

frontmatter案:

```yaml
characterUse:
  recommended: true
  count: 3
  primary: "duo_talk_half.webp"
  secondary: "labomaru_worried_icon.webp"
```

## 内部リンク候補

実リンク候補:

- `/articles/what-is-esim/`
- `/categories/mobile-plan/`
- `/articles/`

将来リンク候補:

- `/articles/cheap-sim-comparison/`
- `/articles/rakuten-mobile-vs-ahamo/`

related案:

```yaml
related:
  - "what-is-esim"
  - "cheap-sim-comparison"
  - "rakuten-mobile-vs-ahamo"
```

## サムネイル文言案

メイン文言:

```text
格安SIMって何？
やさしく解説
```

サブ文言案:

```text
大手との違い・向いている人・注意点
```

画像方針:

- スマホ料金明細、SIMカード、スマホ画面を見比べる構図
- ひまりが疑問を持ち、らぼまるが料金の違いを整理する
- かわいすぎず、通信費見直しの記事だと一目で分かる
