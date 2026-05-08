import { pickInternalLinks } from "./utils.mjs";

export function generateArticleBrief({ source, classification, generated }) {
  const internalLinks = pickInternalLinks(classification.topicCategory);

  return {
    slug: generated.slug,
    articleTitle: generated.title,
    sourceMedia: source.sourceMedia,
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    sourcePublishedAt: source.sourcePublishedAt,
    category: "ニュースをかみくだく",
    articleType: "news",
    sumalaboUse: classification.sumalaboUse,
    topicCategory: classification.topicCategory,
    priority: classification.priority,
    reason: classification.reason,
    recommendedAction: "send_to_chatgpt_5_5_article_project",
    coreAngle: "単なるニュース紹介ではなく、普通の人が何を知ればよいか、何をまだ待てばよいかを整理する。",
    sourceKeyPoints: source.keyPoints,
    suggestedStructure: [
      "先に結論",
      "何が話題なのか",
      "難しいポイントをかみくだく",
      "普通の人にどう関係するのか",
      "まだ分からないこと",
      "すまラボ的な見方",
      "関連記事への導線",
    ],
    internalLinkCandidates: internalLinks,
    cautions: [
      "元記事の本文や長い表現をコピーしない",
      "公式発表・報道・噂・予測を混同しない",
      "価格・発売日・対応機種・日本展開を断定しすぎない",
      "体験していない内容をレビュー風に書かない",
      "煽りすぎず、判断材料として整理する",
    ],
  };
}
