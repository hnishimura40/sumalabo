import { pickInternalLinks } from "./utils.mjs";
import {isAiV2,aiPolicy} from '../automation/ai-article-v2.mjs';

export function generateArticleBrief({ source, classification, generated }) {
  const internalLinks = pickInternalLinks(classification.topicCategory);
  const ai = isAiV2({articleTitle:generated.title,topicCategory:classification.topicCategory,tags:classification.tags || source.tags || []});

  return {
    slug: generated.slug,
    articleTitle: generated.title,
    sourceMedia: source.sourceMedia,
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    sourcePublishedAt: source.sourcePublishedAt,
    category: "ニュースをかみくだく",
    articleType: "news",
    templateVersion: ai ? 'ai-v2' : null,
    sumalaboUse: classification.sumalaboUse,
    topicCategory: classification.topicCategory,
    priority: classification.priority,
    reason: classification.reason,
    recommendedAction: "send_to_chatgpt_5_5_article_project",
    coreAngle: "単なるニュース紹介ではなく、買う前・待つ前にどこを見ればよいか、まだ確認が必要な点は何かを整理する。",
    sourceKeyPoints: source.keyPoints,
    primarySources: source.primarySources || source.officialSources || [],
    tags: classification.tags || source.tags || [],
    suggestedStructure: ai ? [...aiPolicy.blocks] : [
      "先に結論",
      "何が話題なのか",
      "難しいポイントをかみくだく",
      "日常使いへの影響 / 買い替え判断にどう関係するか",
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
