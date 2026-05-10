function listItems(items = []) {
  return items.map((item) => `- ${item}`).join("\n");
}

export function generateThumbnailPrompt(brief, options = {}) {
  const thumbnailNewChatUrl = options.thumbnailNewChatUrl || "https://chatgpt.com/";
  const referenceText = brief.referenceAssetsMissing
    ? "既存キャラクター素材が見つからない場合は、らぼまる・ひまりの特徴を守って新規イラストとして自然に描く。"
    : `既存キャラクター素材を参照する前提。候補:\n${listItems(brief.referenceAssets)}`;

  return `# すまラボ 初期サムネイル案・参考プロンプト

これはCLIが記事素材から作る初期サムネイル案です。
実運用では、本文・ブログ化用資料一式を作ったあと、台本チャット内で最終版サムネイル画像生成プロンプトを作ります。
最終版プロンプトは drafts/materials/{slug}.thumbnail-prompt.md に保存します。

サムネイル画像生成は、毎回サムネイル生成専用の新規ChatGPTチャットで行います（使い回しチャットや台本チャットの中では生成しません）。
新規ChatGPTチャット: ${thumbnailNewChatUrl}

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

サムネイル構図方針:
- 「ひまりが質問、らぼまるが説明」の固定構図にしない
- 2人とも記事内容を理解した後の反応を見せる
- 良いニュースなら前向きな反応、悪いニュースなら悲しむ・心配する反応、判断が分かれる話なら慎重・困惑など、話題に応じたリアクションにする

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
