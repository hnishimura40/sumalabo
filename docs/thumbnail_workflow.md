# すまラボ 記事サムネイル運用フロー

このドキュメントは、すまラボの記事サムネイルを管理するための運用方針です。

重要: 2026年7月以降の標準経路は、Codex execの画像工程でサムネイルと本文スライドを生成し、工房チャットをfallbackとして使います。どちらの経路でも同じ `slide_plan` の演出ブロックとキャラクター正本を使用します。

## 基本方針

- サムネイルは記事ごとに作成する。
- Codex execを第一経路、常設キャラ工房チャットをfallback経路とする。
- Codexは生成物を外部outputDirへ保存し、検品合格後にWebP化・配置・frontmatter反映を行う。
- サムネイルは記事内容と一致させる。
- 読者を煽る表現や、内容と違う釣り画像は避ける。
- すまラボらしい清潔感、分かりやすさ、選びやすさを優先する。

## 管理フォルダ

作業用フォルダ:

```text
assets/thumbnails/original/
assets/thumbnails/webp/
assets/thumbnails/source-prompts/
```

公開時に必要な出力先候補:

```text
public/images/thumbnails/
```

現時点ではサイト方式が未決定のため、`public/images/thumbnails/` はまだ作成しません。Astro / Next.js / 静的HTMLなどの方式を決めた後に作ります。

## 各フォルダの役割

### assets/thumbnails/original/

- ChatGPT側で作成した元画像を置く。
- PNG / JPEG / WebP など形式は問わない。
- 元画像は再加工用に残す。
- 上書きせず、必要なら日付やバージョンを付けて管理する。

例:

```text
assets/thumbnails/original/what-is-esim_original.png
assets/thumbnails/original/iphone-vs-android_original.png
```

### assets/thumbnails/webp/

- Web表示用に軽量化したWebPを置く。
- 記事frontmatterの `thumbnail` は、最終的にこの画像または公開用コピー先を指す。
- 品質は85〜90程度を目安にする。

例:

```text
assets/thumbnails/webp/what-is-esim.webp
assets/thumbnails/webp/iphone-vs-android.webp
```

### assets/thumbnails/source-prompts/

- ChatGPT側でサムネイルを作るときに使ったプロンプトや条件を保存する。
- 後から似た雰囲気で作り直すための記録として使う。
- 記事slugごとに `.md` で保存する。

例:

```text
assets/thumbnails/source-prompts/what-is-esim.md
```

## ファイル名ルール

記事slugに合わせる。

基本:

```text
{slug}.webp
{slug}_original.png
{slug}.md
```

例:

```text
assets/thumbnails/original/what-is-esim_original.png
assets/thumbnails/webp/what-is-esim.webp
assets/thumbnails/source-prompts/what-is-esim.md
```

差し替え候補を残す場合:

```text
what-is-esim_v1_original.png
what-is-esim_v2_original.png
what-is-esim.webp
```

最終採用品だけを `webp/` に置く。

## 標準サムネイル仕様

初期段階では、記事サムネイルを以下に統一します。

- サイズ: 1200 x 675px
- 比率: 16:9
- 形式: WebP
- 用途: 記事一覧、カテゴリ一覧、記事ページ上部、トップページの記事カード

### 元画像

- 保存先: `assets/thumbnails/original/`
- 生成元画像や未加工PNG/JPGを保管する。
- 元画像は削除・上書きしない。

### Web表示用

- 保存先: `assets/thumbnails/webp/`
- 1200 x 675px にリサイズ・トリミングする。
- WebP形式で保存する。
- 画質は85〜90程度を目安にする。

### 公開用パス

- コピー先: `public/images/thumbnails/`
- 記事frontmatterの `thumbnail` には `/images/thumbnails/xxx.webp` を指定する。

### CSS表示

- 記事カードや記事ページでは `aspect-ratio: 16 / 9` を基本にする。
- `object-fit: cover` を使い、表示崩れを防ぐ。
- `thumbnail` が未設定の場合は、既存のミント系プレースホルダーを表示する。

### 将来対応

- SNS/OGP専用画像が必要になった場合は、1200 x 630px を追加する。
- 初期段階では1200 x 675pxに統一する。

## サムネイル作成時の方向性

### 同一性と演出の分離

- **同一性（固定）**: 顔立ち・頭身・体型・髪型・リボン、らぼまるの耳ビレ・首輪・アンテナ・ハート等の認識アンカー。
- **演出（可変）**: 衣装・小道具・ポーズ・背景・表情。記事テーマから自動生成し、正本と違っていてもキャラ不一致にはしない。
- `slide_plan.md` に `## 演出ブロック` を置き、衣装・小道具・ポーズ・背景・表情・演出根拠・スライド演出方針を記録する。
- **表情はテーマ準拠で、笑顔を既定にしない。** 不安・注意喚起系（セキュリティ・リコール・値上げ・トラブル）は真剣・心配・調べ顔、解決・お得・新機能系は明るい笑顔、中立解説系は穏やかな標準を目安に自動導出する。
- サムネは小道具を「置く」だけでなく、持つ・調べる・つなぐ・比べる等の動作を主役にする。
- 本文スライドも小道具・動き・背景をテーマに合わせる。衣装を変える場合は全スライドで一貫させる。
- 独立検品では同一性違反をblocking、テーマ演出が弱い場合と**表情が記事の感情トーンと乖離している場合**をwarningとして扱う。

### 共通トーン

- 明るい
- 清潔感がある
- スマホ・AI・ガジェット系に見える
- 情報が詰まりすぎない
- スマホ表示でも主題が分かる
- すまラボのキャラクターを使う場合は本文同様、理解補助・案内役として使う

### 避けること

- 文字を詰め込みすぎる
- 強すぎる煽り表現
- 内容と関係ない派手な演出
- 不安を過剰にあおる表情や構図
- 他プロジェクトの雰囲気を混ぜる

## 記事タイプ別の考え方

### 土台記事

目的:

- 初心者が入りやすくする
- 用語や仕組みへの不安を下げる

向く構図:

- ひまりが疑問を持つ
- らぼまるが整理する
- スマホや通信アイコンを見ながら考える

例:

- eSIMとは何か
- 格安SIMとは何か
- iPhoneとAndroidの違い

### 収益記事

目的:

- 比較しやすさ
- 選びやすさ
- 損しにくさ

向く構図:

- 比較表
- 料金プラン
- 複数スマホや充電器を並べた構図
- らぼまるが比較軸を示す

例:

- 格安SIMおすすめ比較
- 3万円台スマホおすすめ比較
- USB-C充電器おすすめ比較

### 流入記事

目的:

- 話題性
- 新機能やトレンドへの入口
- 「結局どう関係あるの？」を見せる

向く構図:

- ひまりがスマホやAI機能を見ている
- 新機能のイメージを分かりやすく示す
- 華やかだが過度に煽らない

例:

- AIスマホとは何か
- Apple Intelligenceの生活者向け解説
- 新製品や新機能の整理

## Codexが担当する作業

Codexは以下を担当します。

1. ChatGPT側で作成済みの画像を受け取る。
2. `assets/thumbnails/original/` に原本を配置する。
3. 必要に応じて `assets/thumbnails/webp/` にWebPを配置する。
4. プロンプトや制作メモがある場合、`assets/thumbnails/source-prompts/` に保存する。
5. 記事frontmatterの `thumbnail` と `thumbnailAlt` を更新する。
6. サイト方式が決まった後、公開用フォルダへコピーする。

Codex画像工程は以下を行いません。

- 大量の新規記事本文作成
- サイト本体の実装導入
- 記事内容と無関係な画像の採用

## frontmatterへの反映

作業中:

```yaml
thumbnail: "/images/thumbnails/what-is-esim.webp"
thumbnailAlt: "スマホの通信設定を見ながらeSIMについて考えるひまりとらぼまる"
```

公開前に、実際の公開パスに合わせて確認します。

公開用コピー先の想定:

```text
public/images/thumbnails/what-is-esim.webp
```

公開パスの想定:

```text
/images/thumbnails/what-is-esim.webp
```

## source-promptsの記録テンプレート

```md
# サムネイル制作メモ: 記事タイトル

- slug:
- 作成日:
- 記事タイプ:
- カテゴリ:
- 使用キャラクター:
- 画像サイズ: 1200 x 675px
- 採用ファイル:

## 目的

この記事のサムネイルで伝えたいことを書く。

## プロンプト

ChatGPT側で画像生成に使ったプロンプトを貼る。

## 修正メモ

- 
- 
```

## サムネイル配置チェックリスト

- 記事slugとファイル名が一致している。
- 原本を `assets/thumbnails/original/` に保存した。
- WebP版を `assets/thumbnails/webp/` に保存した。
- source prompt または制作メモを `assets/thumbnails/source-prompts/` に保存した。
- `thumbnail` に公開想定パスを入れた。
- `thumbnailAlt` に画像内容と記事テーマが分かる説明を入れた。
- 記事内容とサムネイル内容がズレていない。
- スマホ表示でも主題が分かる。

## 次に決めること

- サイト方式決定後の公開画像パス
- 記事一覧で使うサムネイル比率
- OGP生成を手動にするか、自動テンプレートにするか
- キャラクター入りサムネイルの頻度
- サムネイル内テキストを入れるか、画像中心にするか
