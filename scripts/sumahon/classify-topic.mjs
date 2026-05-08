const topicRules = [
  {
    topicCategory: "AI",
    keywords: ["AI", "生成AI", "ChatGPT", "Claude", "Gemini", "スマートグラス", "AIスマホ", "人工知能"],
  },
  {
    topicCategory: "iPhone",
    keywords: ["iPhone", "iOS", "Apple", "折りたたみiPhone"],
  },
  {
    topicCategory: "Android",
    keywords: ["Android", "Pixel", "Galaxy", "Xperia", "AQUOS", "OPPO", "Xiaomi", "Huawei"],
  },
  {
    topicCategory: "通信",
    keywords: ["eSIM", "SIM", "ahamo", "楽天モバイル", "povo", "LINEMO", "格安SIM", "通信", "料金"],
  },
  {
    topicCategory: "ガジェット",
    keywords: ["USB-C", "充電器", "モバイルバッテリー", "イヤホン", "タブレット", "ガジェット", "スマートウォッチ"],
  },
];

function findTopicCategory(text) {
  for (const rule of topicRules) {
    if (rule.keywords.some((keyword) => text.toLowerCase().includes(keyword.toLowerCase()))) {
      return rule.topicCategory;
    }
  }

  if (/スマホ|スマートフォン|端末/.test(text)) {
    return "ITニュース";
  }

  return "その他";
}

function decideUse(text, topicCategory) {
  if (/噂|リーク|予測|見通し|未発表|報道/.test(text)) {
    return "short_explainer";
  }

  if (/eSIM|格安SIM|AIスマホ|iPhone|Android|中古スマホ/.test(text)) {
    return topicCategory === "通信" || topicCategory === "AI" ? "update_foundation" : "new_article";
  }

  if (/比較|おすすめ|ランキング|価格|セール/.test(text)) {
    return "update_comparison";
  }

  if (topicCategory === "その他") {
    return "hold";
  }

  return "new_article";
}

function decidePriority(text, sumalaboUse) {
  if (sumalaboUse === "hold") {
    return "low";
  }

  if (/公式|発表|開始|終了|値上げ|値下げ|発売|予約|AI|iPhone|Android|eSIM/.test(text)) {
    return "high";
  }

  if (sumalaboUse === "update_foundation" || sumalaboUse === "short_explainer") {
    return "medium";
  }

  return "medium";
}

export function classifyTopic(source) {
  const text = [
    source.sourceTitle,
    source.sourceDescription,
    ...(source.keyPoints || []),
  ].join("\n");
  const topicCategory = findTopicCategory(text);
  const sumalaboUse = decideUse(text, topicCategory);
  const priority = decidePriority(text, sumalaboUse);

  return {
    sourceMedia: "すまほん",
    sourceUrl: source.sourceUrl,
    sourceTitle: source.sourceTitle,
    detectedAt: new Date().toISOString(),
    sumalaboUse,
    topicCategory,
    priority,
    reason:
      sumalaboUse === "hold"
        ? "すまラボの主要テーマからやや遠い、または現時点では扱いにくい可能性があります。"
        : "スマホ・AI・ガジェット・ITニュースとして、普通の人向けに噛み砕く余地があります。",
    recommendedAction: sumalaboUse === "hold" ? "hold_for_manual_review" : "create_preview_draft",
  };
}
