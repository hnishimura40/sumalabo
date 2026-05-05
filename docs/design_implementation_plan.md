# すまラボ デザイン実装計画

この計画は、`design/reference/sumalab-design.html` をそのまま貼り付けず、Astro + MDX + Content Collectionの構成を維持したまま段階的に反映するためのものです。

## 参照元

- `design/reference/sumalab-design.html`
- `design/reference/sumalab-design.extracted.html`
- `design/reference/sumalab-design-print.pdf`

PDFのスクリーンショット化は、現在の環境にPDFレンダリング用ライブラリがないため保留しています。

## 現在のAstro構成への反映方針

- デザインHTMLの仮記事データは取り込まない
- 既存の `content/articles/*.mdx` を記事本文の正本とする
- カテゴリは `src/lib/categories.ts` の4カテゴリを固定で使う
- 記事一覧、カテゴリ一覧はContent Collectionから生成する
- デザインは `src/styles/global.css` のトークンと共通クラスで管理する
- ページ固有の見た目は、各 `.astro` のscoped styleで最小限だけ調整する

## Phase 1: 共通トーンの移植

実施対象:

- `src/styles/global.css`
- `src/layouts/BaseLayout.astro`
- `src/components/ArticleCard.astro`
- `src/pages/index.astro`

内容:

- ライト/ダークのCSS変数を追加する
- 既存の `--color-*` 変数との互換エイリアスを残す
- ヘッダーを薄い枠線、ブラー、控えめなナビにする
- フッターを追加する
- 記事カードを12px角丸、薄枠、軽い影にする
- thumbnail未設定時のプレースホルダーをグリッド風にする
- トップページのヒーローから大きなキャラクター画像を外す

## Phase 2: 一覧・カテゴリページの整理

対象候補:

- `src/pages/articles/index.astro`
- `src/pages/categories/[category].astro`

内容:

- 見出しまわりをデザインHTMLのsection headingに寄せる
- カテゴリ別の淡いチップ色を使う
- 空状態をカード風に整える
- 記事一覧のグリッド余白を調整する

## Phase 3: 記事本文デザインの整理

対象候補:

- `src/layouts/ArticleLayout.astro`
- `content/articles/*.mdx`

内容:

- 記事上部のmeta、サムネイル、本文カードを新トークンに寄せる
- 表、チェックリスト、結論ボックスをより統一する
- MDX内の独自HTMLクラスを増やしすぎないよう、共通化できるものだけCSS化する

## Phase 4: キャラクター部品の微調整

対象候補:

- `src/components/characters/CharacterCallout.astro`
- `src/components/characters/CharacterDialogue.astro`
- `src/components/characters/CharacterGuideCard.astro`

内容:

- 枠線、背景、角丸をデザイントークンへ寄せる
- スマホで画像が大きくなりすぎないようにする
- 会話ボックスは短く、本文補助に見えるよう余白を調整する

## 既存MDX記事を壊さないための注意点

- frontmatter schemaは変更しない
- `thumbnail`, `thumbnailAlt`, `status`, `related` は維持する
- MDX内で使っている `summary-box`, `point-grid`, `check-box`, `check-list` は残す
- 未作成記事への直リンクは貼らず、必要ならMDXコメントで将来リンク候補にする
- キャラクター使用回数は1記事1〜3回に抑える

## ダークモード実装方法

初期実装では、`prefers-color-scheme: dark` を使ってOS設定に追従する。

将来、手動切り替えを入れる場合は、`html[data-theme="light"]` / `html[data-theme="dark"]` を追加し、ローカルストレージに保存する。現時点ではトグルUIは実装しない。

## 後回しにするもの

- スタンドアロンHTMLの仮記事取り込み
- 検索機能
- タグ機能
- 広告、アフィリエイト導線
- トップページの大規模再設計
- 全記事の一括リライト
- サムネイル生成
- 手動ダークモード切り替えUI
