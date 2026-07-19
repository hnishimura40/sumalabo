# 内部導線（ニュース → 収益記事）の仕組み

すまラボの二層構造（流入＝ニュース / 収益＝比較・リコール確認などアフィリエイト付き）で、
ニュースから収益記事へ**自然に**送客するための導線。2026-07-19 実装。

## 単一ソース: `data/related-guides.json`

導線の定義（対象収益記事・誘導キーワード・カテゴリ・ラベル・しきい値）はすべてこの JSON に集約。
**Astro 側と夜間run の両方がこの同じ JSON を読む**ので、収益記事や誘導キーワードを足すときは
このファイルだけ編集する。

```jsonc
{
  "settings": {
    "articleEndMaxCards": 2,   // A: 記事末尾カードの最大枚数
    "articleEndMinScore": 3,   // A: 表示しきい値（キーワード+2/件・カテゴリ+1）
    "keywordWeight": 2,
    "categoryWeight": 1,
    "listInsertEveryN": 6,     // D: 一覧に N 件ごとに1枚差し込む
    "articleEndLabel": "編集部おすすめ",
    "listLabel": "定番ガイド"
  },
  "targets": [
    {
      "slug": "power-bank-comparison",
      "label": "モバイルバッテリーおすすめ比較",
      "blurb": "容量・重さ・メーカーで選ぶ",
      "categories": ["周辺機器・ガジェット"],
      "keywords": ["モバイルバッテリー", "急速充電", "PSEマーク", ...],
      "listStaple": true        // D の一覧差し込み対象にするか
    }
  ]
}
```

### キーワード設計の注意（誤爆回避）
- **汎用語を入れない**（`容量`→データ容量に誤爆 / `安全`→AI安全性 / `発熱`→CPU発熱）。
- **短い部分一致語を入れない**。マッチは小文字化した部分一致なので、`PD` は "u**pd**ate"、
  `GaN` は "or**gan**" に誤爆する。句で持つ（`PD対応` / `USB PD` / `窒化ガリウム` / `GaN充電`）。
- スコア=キーワード一致 +2/件・カテゴリ一致 +1。しきい値 3＝「1キーワード+カテゴリ」か「2キーワード」。
  カテゴリだけ／1キーワードだけでは出さない（＝無関係な記事に出さない）。

## A: 記事末尾「関連ガイド」カード（自動）

- 実装: `src/components/RelatedGuides.astro`（マッチャは `src/lib/related-guides.ts`）。
- 記事の**タイトル・description・タグ・本文(生Markdown)**を収益記事定義と照合し、閾値以上を最大2枚表示。
- ラベルは「編集部おすすめ」。**広告と誤認されない表現**にし、アフィボックスとは視覚的に区別（薄いカード＋点線見出し）。
- 導線先ページ自身（収益記事）には出さない。ニュース/ガイド → 収益 の一方向。
- マウント: `ArticleLayout.astro` の本文直後。

## B: 本文内の文脈リンク（夜間run組み込み）

- Phase A 生成プロンプト（`scripts/sumahon/generate-article-prompt.mjs` の
  `renderDrainageRule()`＝JSON から自動生成 / `scripts/automation/phase-a-orchestrator.mjs` の write_mdx）で、
  **本文が実際にそのトピックに触れたときだけ**自然な一文で内部リンクを**1本まで**挿入可（言及が無ければ入れない）。
- 検品（`scripts/sumahon/generate-independent-inspection-prompt.mjs` の (D) `internalLinks`）で
  「文脈的に自然か・無理な挿入がないか・1本以内か」を判定。
  - **needs_revision の直し方は本文MDXの該当リンク削除/修正**（画像再生成ではない）。
  - `internalLinks` は画像の `overallPass` に影響させない（独立）。
- 既存記事への遡及は行わない（PV上位のみ別途手作業）。

## D: 一覧面「定番ガイド」差し込み

- 実装: `src/components/StapleGuideCard.astro` + `src/lib/staple-cards.ts`。
- 差し込み先: 記事一覧 `src/pages/articles/index.astro` / カテゴリ `src/pages/categories/[category].astro` /
  トップ `src/pages/index.astro`（ニュースセクション直下に「定番ガイド」枠）。
- `listStaple: true` の収益記事を N 件ごと（既定6）に1枚差し込む。
- 必ず**「定番ガイド」ラベル**＋**「更新日」表記**で、新着ニュースと誤認させないデザイン（左ティールアクセント＋バッジ）。
- 同じ収益記事が何度も出ないよう、1 覧あたり各カード最大1回に上限化（`interleaveStaples` の `maxInserts`）。
- カテゴリ一覧では、既にそのカテゴリに並ぶ収益記事は重複回避で除外。

## 計測（GA4）

- 実装: `src/components/DrainageTracking.astro`（`BaseLayout` に常設）。
- A/B/D の全リンクに `data-drainage`（lane: `article-end` / `list`）と `data-drainage-target`（slug）を付与。
- 1 個の委譲クリックリスナが GA4 custom event **`internal_drainage`** を発火。
  params: `lane` / `target` / `from_path` / `interaction`。
- B の本文内リンクは data 属性が無くても、href が収益記事 slug なら `lane='in_body'` として拾う。
- 可視化（メディア司令室）は今回スコープ外＝**イベント発火まで**。GA4 側で lane 別にクリックを見られる。

## 収益記事を1本足すときの手順

1. `data/related-guides.json` の `targets` に `{ slug, label, blurb, categories, keywords, listStaple }` を追加。
   - キーワードは上記「誤爆回避」に従い、話題を一意に示す語だけにする。
2. `npm run build` で、意図した記事にだけ A カードが出るか照合サンプルを確認
   （`grep -rl 'data-drainage="article-end"' dist/articles/*/index.html`）。
3. B（夜間run プロンプト）と計測は JSON を読むので**自動反映**。追加コード不要。
