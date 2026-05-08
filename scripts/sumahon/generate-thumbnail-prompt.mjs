function listItems(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function generateThumbnailPrompt(brief, options = {}) {
  const thumbnailChatUrl = options.thumbnailChatUrl || "";
  const referenceText = brief.referenceAssetsMissing
    ? "既存キャラクター素材が見つからない場合は、らぼまる・ひまりの特徴を守って新規イラストとして自然に描く。"
    : `既存キャラクター素材を参照する前提。候補:\n${listItems(brief.referenceAssets)}`;

  return `# すまラボ サムネイル生成プロンプト

${thumbnailChatUrl ? `このプロンプトは、以下のサムネイル専用ChatGPTチャットに貼り付けて使用する。\n\nサムネイル生成用:\n${thumbnailChatUrl}\n` : ""}

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

## デザイン指示
- すまラボらしいミント/ティール系アクセント
- やさしく親しみやすいが、安っぽくしない
- ニュースのテーマそのものを主役にする
- 毎回同じテンプレ構図にしない
- 文字は短く、大きく、スマホでも読める量にする
- キャラクターを使う場合も、記事理解を助ける役に留める
- 実在企業ロゴは入れない
- 元記事画像や実在写真を再現しない
- 煽りすぎず、「気になる」「理解できる」方向で見せる

## 避けること
${listItems(brief.avoid)}
`;
}
