function normalizeText(value = "") {
  return String(value).replace(/\s+/g, "");
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function makeIssue(code, severity, message) {
  return { code, severity, message };
}

const requiredTopics = [
  {
    code: "summary",
    label: "先に結論",
    needles: ["先に結論", "結論", "まず結論", "最初に"],
  },
  {
    code: "what_happened",
    label: "何が起きたのか",
    needles: ["何が起き", "何が話題", "発表", "披露", "報道", "ニュース"],
  },
  {
    code: "what_is_new",
    label: "何が新しいのか",
    needles: ["何が新しい", "新しい", "注目", "特徴", "変わる"],
  },
  {
    code: "explain",
    label: "難しいポイントのかみくだき",
    needles: ["かみくだ", "わかりやす", "つまり", "簡単に言うと", "難しい"],
  },
  {
    code: "reader_relevance",
    label: "普通の人にどう関係するのか",
    needles: ["普通の人", "関係", "ユーザー", "生活", "使い方"],
  },
  {
    code: "unknowns",
    label: "まだ分からないこと",
    needles: ["まだ分から", "未確定", "要確認", "公式情報", "確認"],
  },
  {
    code: "sumalabo_view",
    label: "すまラボ的な見方",
    needles: ["すまラボ", "見方", "判断", "様子見"],
  },
  {
    code: "summary_end",
    label: "まとめ",
    needles: ["まとめ", "最後に"],
  },
];

const metaPhrases = [
  "ChatGPT向け",
  "自動生成",
  "この記事は自動生成されています",
  "管理用メモ",
  "生成フロー",
  "サムネイルは後続生成予定",
  "thumbnail pending",
  "以下を貼り付けてください",
  "プロンプト",
  "handoff",
];

export function validateGeneratedArticle({ body, source = {}, thumbnailExists }) {
  const issues = [];
  const plain = body.replace(/<[^>]+>/g, "");
  const normalized = normalizeText(plain);
  const japaneseChars = [...plain].filter((char) => /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ー]/u.test(char)).length;
  const h2Count = (body.match(/^##\s+/gm) || []).length;
  const hasAnyHeading = (body.match(/^#{2,3}\s+/gm) || []).length > 0;
  const presentTopics = [];
  const missingTopics = [];

  if (japaneseChars < 1200) {
    issues.push(makeIssue("too_short_major", "major", `本文が短すぎます。推定日本語文字数: ${japaneseChars}`));
  } else if (japaneseChars < 2000) {
    issues.push(makeIssue("too_short_warning", "warning", `本文がやや短めです。推定日本語文字数: ${japaneseChars}`));
  }

  if (!hasAnyHeading) {
    issues.push(makeIssue("no_headings", "major", "見出しがほぼありません。"));
  } else if (h2Count < 5) {
    issues.push(makeIssue("few_h2", "warning", `h2見出しが少なめです。h2数: ${h2Count}`));
  }

  for (const topic of requiredTopics) {
    if (includesAny(plain, topic.needles)) {
      presentTopics.push(topic.label);
    } else {
      missingTopics.push(topic.label);
    }
  }

  if (missingTopics.length >= 4) {
    issues.push(makeIssue("missing_required_topics_major", "major", `必須要素の不足が多いです: ${missingTopics.join(" / ")}`));
  } else if (missingTopics.length > 0) {
    issues.push(makeIssue("missing_required_topics_warning", "warning", `不足している可能性がある要素: ${missingTopics.join(" / ")}`));
  }

  const foundMeta = metaPhrases.filter((phrase) => body.includes(phrase));
  if (foundMeta.length > 0) {
    issues.push(makeIssue("meta_phrases", "major", `本文にメタ文言が残っています: ${foundMeta.join(" / ")}`));
  }

  const sourceCopyHits = (source.keyPoints || []).filter((point) => {
    const normalizedPoint = normalizeText(point);
    return normalizedPoint.length > 45 && normalized.includes(normalizedPoint);
  });

  if (sourceCopyHits.length > 0) {
    issues.push(makeIssue("source_respect", "major", "元記事の要点文と同一または近すぎる長文が本文に含まれている可能性があります。"));
  }

  if (!includesAny(plain, ["普通の人", "初心者", "ユーザー", "読者"])) {
    issues.push(makeIssue("reader_focus", "warning", "普通の人・初心者・読者目線の表現が弱い可能性があります。"));
  }

  if (!thumbnailExists) {
    issues.push(makeIssue("thumbnail_missing", "warning", "サムネイル画像が未配置です。frontmatter thumbnailは空にしています。"));
  }

  const hasMajorIssue = issues.some((issue) => issue.severity === "major");

  return {
    checkedAt: new Date().toISOString(),
    wordCountApprox: japaneseChars,
    h2Count,
    presentTopics,
    missingTopics,
    issues,
    publishable: !hasMajorIssue,
    provisionalDecision: hasMajorIssue ? "要修正" : "preview確認後に公開可",
  };
}
