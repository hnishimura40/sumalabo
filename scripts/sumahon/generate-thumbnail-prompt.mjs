function listItems(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function generateThumbnailPrompt(brief, options = {}) {
  const himariBaseImagePath = options.himariBaseImagePath || "public/images/characters/base/himari-base.png";
  const labomaruBaseImagePath = options.labomaruBaseImagePath || "public/images/characters/base/labomaru-base.png";
  const referenceText = brief.referenceAssetsMissing
    ? "既存キャラクター素材が見つからない場合は、らぼまる・ひまりの特徴を守って新規イラストとして自然に描く。"
    : `既存キャラクター素材の参考候補:\n${listItems(brief.referenceAssets)}`;

  return `# すまラボ・初期サムネイル案 / 参考プロンプト

これはCLIが記事素材から作る「初期サムネイル案」です。

正式な運用では、この内容をそのままサムネイル生成チャットへ貼るのではなく、ChatGPT 5.5の本文・台本生成チャットで最終稿本文とブログ化用資料一式を作ったあと、記事内容を踏まえて「最終版サムネイル画像生成プロンプト」を作り直します。

最終版サムネイル画像生成プロンプトの保存先:
drafts/materials/{slug}.thumbnail-prompt.md

サムネイル生成時の固定ベース絵:
- ひまりベース絵: ${himariBaseImagePath}
- らぼまるベース絵: ${labomaruBaseImagePath}

サムネイル画像生成は毎回新しいチャットで行います。サムネイル専用チャットを使い回しません。新しいチャットでベース絵2枚をアップロードしてから、最終版サムネイルプロンプトを貼り付けます。

1200x630px、ブログ/YouTubeサムネイル向け、16:9に近い横長構図。

## 記事
${brief.articleTitle}

## 1枚で伝えたい芯
${brief.coreIdea}

## 雰囲気
${brief.thumbnailMood}

## 主役
${brief.mainSubject}

## キャラクターの使い方
- らぼまる: ${brief.characterUse.labomaru}
- ひまり: ${brief.characterUse.himari}
- 補足: ${brief.characterUse.note}

${referenceText}

## 入れたい視覚モチーフ
${listItems(brief.visualMotifs)}

## 文字案
見出し候補:
${listItems(brief.headlineIdeas)}

補足文候補:
${listItems(brief.sublineIdeas)}

## デザイン方針
- すまラボらしいミント・ティール系アクセント
- やさしく親しみやすいが、安っぽくしない
- ニュースのテーマそのものを主役にする
- 毎回同じテンプレ構図にしない
- 文字は短く、大きく、スマホでも読める量にする
- キャラクターを使う場合も、記事理解を助ける役に留める
- 実在企業ロゴは入れない
- 元記事画像や実在写真を再現しない
- 煽りすぎず、「気になる」「理解できる」方向で見せる

## 新しい構図方針
- 「ひまりが“これ何？”と聞き、らぼまるが説明する」構図を基本形にしない
- ひまり・らぼまるは、記事内容をある程度理解した状態で登場する
- 説明中ではなく、理解後の反応を見せる
- 良いニュース・便利そうな話は、前向き、感心、うれしい、わくわく
- 判断が分かれる話は、困惑、気になる、慎重、考え中
- 悪いニュース・改悪・値上げは、悲しい、困る、残念、不安
- グッズ・周辺機器は、使ってみたい、便利そう、楽しそう
- 比較・選び方は、納得、整理できた、比較して理解した反応

## 避けること
${listItems(brief.avoid)}
`;
}
