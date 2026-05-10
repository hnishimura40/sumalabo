function normalizeText(value = "") {
  return String(value).replace(/\s+/g, "");
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function makeIssue(code, severity, message) {
  return { code, severity, message };
}

const REFERENCE_SECTION_RE = /^##\s*参考情報\s*$/m;
const URL_RE = /https?:\/\/[^\s)\]"'>]+/g;
const SUMAHON_PUBLIC_NEEDLES = ["smhn.info", "すまほん"];
const REPORTING_NOTICE_NEEDLES = [
  "公式発表ではな",
  "公式発表でない",
  "報道ベース",
  "報道段階",
  "今後変わる",
  "今後変更",
  "今後内容が変わる",
  "確定情報ではな",
];

const REPORTING_TOPIC_NEEDLES = [
  "報道",
  "報じ",
  "報道ベース",
  "リーク",
  "噂",
  "うわさ",
  "観測",
];

function extractReferenceSection(body) {
  const match = body.match(/^##\s*参考情報\s*$/m);
  if (!match) return "";
  const start = match.index + match[0].length;
  const rest = body.slice(start);
  const nextHeading = rest.search(/^##\s+/m);
  return nextHeading === -1 ? rest : rest.slice(0, nextHeading);
}

export function validateSourceReferences(body, { source = {} } = {}) {
  const hasReferenceSection = REFERENCE_SECTION_RE.test(body);
  const referenceSection = extractReferenceSection(body);
  const referenceUrls = referenceSection.match(URL_RE) || [];
  const urlCount = referenceUrls.length;

  const sumahonHits = SUMAHON_PUBLIC_NEEDLES.filter((needle) => body.includes(needle));
  const containsSumahonPublicReference = sumahonHits.length > 0;

  const sourceUrl = String(source?.sourceUrl || "");
  const sourceMedia = String(source?.sourceMedia || "");
  const isReportingTopic = includesAny(body, REPORTING_TOPIC_NEEDLES) || /smhn\.info|すまほん/.test(sourceUrl + sourceMedia);
  const hasReportingNotice = includesAny(body, REPORTING_NOTICE_NEEDLES);
  const reportingNoticeRequired = isReportingTopic;
  const reportingNoticeOk = !reportingNoticeRequired || hasReportingNotice;

  const reasons = [];
  if (!hasReferenceSection) reasons.push("参考情報セクションが本文末尾に存在しません");
  if (urlCount < 2) reasons.push(`参考情報セクション内のURLが ${urlCount} 件で、2件未満です`);
  if (containsSumahonPublicReference) reasons.push(`公開記事本文に内部参考元の露出があります: ${sumahonHits.join(" / ")}`);
  if (!reportingNoticeOk) reasons.push("報道ベースの記事に必要な注意文（公式発表ではない／報道ベース／今後変わる可能性 など）が見当たりません");

  const ok = reasons.length === 0;
  const notes = ok
    ? "公開記事用の参考情報セクションがあり、内部参考元の露出もありません。"
    : reasons.join(" / ");

  return {
    ok,
    hasReferenceSection,
    urlCount,
    referenceUrls,
    containsSumahonPublicReference,
    sumahonHits,
    isReportingTopic,
    hasReportingNotice,
    reportingNoticeRequired,
    reasons,
    notes,
  };
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

  const sourceCheck = validateSourceReferences(body, { source });

  if (!sourceCheck.hasReferenceSection) {
    issues.push(
      makeIssue(
        "missing_reference_section",
        "major",
        "本文末尾に「## 参考情報」セクションがありません。公式情報・元報道・関連報道のリンクを含めてください。",
      ),
    );
  } else if (sourceCheck.urlCount < 2) {
    issues.push(
      makeIssue(
        "insufficient_reference_urls",
        "major",
        `参考情報セクション内のURLが ${sourceCheck.urlCount} 件で2件未満です。公式情報・元報道・関連報道を最低2件以上掲載してください。`,
      ),
    );
  }

  if (sourceCheck.containsSumahonPublicReference) {
    issues.push(
      makeIssue(
        "sumahon_public_exposure",
        "major",
        `公開記事本文に内部参考元の露出があります: ${sourceCheck.sumahonHits.join(" / ")}。すまほん名・URLは公開記事に出さず、参考情報には公式情報・一次情報・元報道を入れてください。`,
      ),
    );
  }

  if (sourceCheck.reportingNoticeRequired && !sourceCheck.hasReportingNotice) {
    issues.push(
      makeIssue(
        "missing_reporting_notice",
        "major",
        "報道ベースの記事ですが、本文中に「公式発表ではない／報道ベース／今後変わる可能性」などの注意文が見当たりません。冒頭または参考情報の注記に1文追加してください。",
      ),
    );
  }

  const hasMajorIssue = issues.some((issue) => issue.severity === "major");

  return {
    checkedAt: new Date().toISOString(),
    wordCountApprox: japaneseChars,
    h2Count,
    presentTopics,
    missingTopics,
    issues,
    sourceCheck,
    publishable: !hasMajorIssue,
    provisionalDecision: hasMajorIssue ? "要修正" : "preview確認後に公開可",
  };
}
