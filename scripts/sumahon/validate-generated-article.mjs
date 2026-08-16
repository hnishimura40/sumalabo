import { validatePlainLanguageArticle } from "./plain-language-policy.mjs";

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

const CHARACTER_TEXT_NEEDLES = ["ひまり", "らぼまる"];
const CHARACTER_VISUAL_PATTERNS = [
  /<CharacterDialogue[\s/>]/,
  /<CharacterCallout[\s/>]/,
  /<CharacterGuideCard[\s/>]/,
  /<CharacterBubble[\s/>]/,
  /\/images\/characters\//,
];

/**
 * 本文にひまり・らぼまるが画像つきブロック（CharacterDialogue / CharacterCallout /
 * CharacterGuideCard / public/images/characters/ への参照）として登場しているかを判定する。
 * 名前テキストのみ・テキストすら無い場合は warnings に該当コードを積む。
 */
export function validateCharacterVisualPresence(body, { frontmatterRecommended = false } = {}) {
  const plain = String(body).replace(/<[^>]+>/g, "");
  const hasCharacterText = CHARACTER_TEXT_NEEDLES.some((needle) => plain.includes(needle));
  const hasCharacterVisual = CHARACTER_VISUAL_PATTERNS.some((re) => re.test(body));

  const warnings = [];
  if (hasCharacterText && !hasCharacterVisual) {
    warnings.push("character_visual_missing");
  } else if (!hasCharacterText && !hasCharacterVisual) {
    warnings.push("character_presence_missing");
  }

  return {
    hasCharacterText,
    hasCharacterVisual,
    frontmatterRecommended: Boolean(frontmatterRecommended),
    warnings,
    ok: warnings.length === 0,
  };
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
    needles: ["先に結論", "結論", "まず結論", "最初に", "これは何？", "結局どうなの？"],
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

// 補助ボックスの見出し化を検出するためのDOM風スキャン。
// HTMLブロック開始からの相対位置で h2/h3 が現れたら、補助ラベルの見出し化と判定する。
const BOX_CLASS_NEEDLES = ["summary-box", "check-box", "info-box", "table-card"];

// 公開記事本文には現れてはいけないメタ表現（precision重視で短いものに絞る）。
// 各パターンは「行頭から始まる」「短いフレーズ単位」で誤検出を避けつつ網羅する。
const META_RESIDUE_PATTERNS = [
  { code: "meta_intro_following", re: /^(以下、|以下より|以下が)本文/m, label: "以下、本文" },
  { code: "meta_intro_starting", re: /^(ここから|ここより)本文/m, label: "ここから本文" },
  { code: "meta_final_draft", re: /^最終稿/m, label: "最終稿" },
  { code: "meta_initial_draft", re: /^初稿/m, label: "初稿" },
  { code: "meta_draft_label", re: /^草案/m, label: "草案" },
  { code: "meta_send_intro", re: /^(.{0,12})?本文をお送り(します|いたします)/m, label: "本文をお送りします" },
];

function normalizeTitleForCompare(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[\s　]+/g, "")
    .replace(/[「」『』【】〔〕()()[\]［］<>＜＞]/g, "")
    .replace(/[・,，.。:：;；!！?？〜~ー\-―−ｰ_/／|｜]/g, "");
}

function titleSimilarity(a, b) {
  // 完全一致でなくても、片方が長い場合は包含関係を許す。
  const na = normalizeTitleForCompare(a);
  const nb = normalizeTitleForCompare(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.length >= 8 && nb.includes(na)) return 0.95;
  if (nb.length >= 8 && na.includes(nb)) return 0.95;
  // Levenshtein風の超ラフな一致率：長い方の文字が短い方に何文字残るか。
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  let matched = 0;
  let lastIdx = 0;
  for (const ch of shorter) {
    const idx = longer.indexOf(ch, lastIdx);
    if (idx >= 0) {
      matched++;
      lastIdx = idx + 1;
    }
  }
  return matched / longer.length;
}

export function validateArticleQuality(body, { title = "", category = "" } = {}) {
  const issues = [];
  const reasons = [];

  // --- 1) titleDuplicateCheck ---
  // 判定方針:
  //   - 本文H1が frontmatter title と高一致（>=0.85）= blocking（major、titleDuplicate=true）
  //   - 本文H1があるが frontmatter title とは大きく違う = warning（titleDuplicate=false）
  //     ※ Astro ArticleLayout は frontmatter title を H1 として描画するため、本文H1は
  //       SEO/HTML的には二重H1になるが、文言が違えばすぐ止めるほどではないので warning
  //   - 冒頭段落が frontmatter title の再掲（>=0.9）= blocking
  const h1Matches = (body.match(/^#\s+[^\n]+/gm) || []).map((line) => line.replace(/^#\s+/, "").trim());
  const h1Count = h1Matches.length;
  let titleDuplicate = false;
  const titleDuplicateDetails = [];
  let h1HighSimilarity = false;

  if (h1Count > 0) {
    for (const h of h1Matches) {
      const sim = titleSimilarity(h, title);
      titleDuplicateDetails.push({ h1: h, similarityToFrontmatterTitle: sim });
      if (sim >= 0.85) h1HighSimilarity = true;
    }

    if (h1HighSimilarity) {
      titleDuplicate = true;
      issues.push({
        code: "title_h1_in_body",
        severity: "major",
        message: `本文内のH1が frontmatter title とほぼ同じです。frontmatter title は layout 側で H1 として描画されるため、本文H1は削除してください。例: ${h1Matches[0].slice(0, 60)}`,
      });
      reasons.push("本文H1が frontmatter title と高一致（タイトル重複）");
    } else {
      // H1自体は body にあるが、frontmatter title とは別の文言。
      // SEO的には二重H1なので warning にする（NEW: blockingではない）。
      issues.push({
        code: "body_h1_present",
        severity: "warning",
        message: `本文内にH1見出しがあります（${h1Count}件、frontmatter title とは違う文言）。layout側でも別途H1が描画されるため、本文側はH2以下に下げるかリードに置き換えるのが望ましいです。例: ${h1Matches[0].slice(0, 60)}`,
      });
    }
  }

  if (!titleDuplicate && title) {
    // H1自体は無くても、冒頭段落で frontmatter title を再掲しているケース（強い一致）
    const firstPara = (body.split(/\n\s*\n/)[0] || "").trim().replace(/^#\s+/, "");
    const sim = titleSimilarity(firstPara, title);
    if (sim >= 0.9 && firstPara.length >= 8) {
      titleDuplicate = true;
      titleDuplicateDetails.push({ firstParagraph: firstPara.slice(0, 80), similarityToFrontmatterTitle: sim });
      issues.push({
        code: "title_repeated_at_top",
        severity: "major",
        message: `本文冒頭段落が frontmatter title の再掲になっています（similarity=${sim.toFixed(2)}）。導入文または summary-box から始めてください。`,
      });
      reasons.push("本文冒頭が frontmatter title の再掲になっています");
    }
  }

  // --- 2) markdownResidueCheck ---
  const markdownResidueHits = [];

  // 表示用に残った「**」（pairになっておらず孤立しているもの）
  const asteriskPairs = (body.match(/\*\*/g) || []).length;
  if (asteriskPairs % 2 !== 0) {
    markdownResidueHits.push("対になっていない `**`（孤立した強調マーカー）");
  }
  // ```md / ```markdown フェンス
  if (/```(?:md|markdown)\b/i.test(body)) {
    markdownResidueHits.push("Markdownフェンス（```md / ```markdown）が本文に残っています");
  }
  // 表示できない裸の `# title` 行（H1）は上で検出済み。H2/H3直前の空行不足は無視。
  // メタ表現
  for (const pat of META_RESIDUE_PATTERNS) {
    if (pat.re.test(body)) markdownResidueHits.push(`メタ表現「${pat.label}」が本文に残っています`);
  }

  const markdownResidue = markdownResidueHits.length > 0;
  if (markdownResidue) {
    issues.push({
      code: "markdown_residue",
      severity: "major",
      message: `本文にMarkdown残骸またはメタ表現があります: ${markdownResidueHits.join(" / ")}`,
    });
    for (const h of markdownResidueHits) reasons.push(h);
  }

  // --- 3) characterPresenceCheck ---
  // 「ひまり」「らぼまる」の名前テキストと、CharacterDialogue / CharacterCallout /
  // CharacterGuideCard / /images/characters/ などの画像つきブロック存在を分離して評価する。
  // 名前だけ・テキストだけ言及で画像つきブロックが無いと、すまラボらしさが弱くなるため warning。
  // 詳細ロジックは validateCharacterVisualPresence に切り出し済み。
  const characterCheck = validateCharacterVisualPresence(body);
  let characterPresence = "n/a";
  const isNewsCategory = Boolean(category && category.includes("ニュース"));

  if (characterCheck.hasCharacterVisual) {
    characterPresence = "visual";
  } else if (characterCheck.hasCharacterText) {
    characterPresence = "text_only";
    issues.push({
      code: "character_visual_missing",
      severity: "warning",
      message:
        "本文にひまり・らぼまるの名前は出ていますが、画像付きのブロック（CharacterDialogue / CharacterCallout / CharacterGuideCard、または /images/characters/ への参照）が見当たりません。サムネ以外でも本文中にすまラボらしい画像つき要素を1回入れてください。",
    });
  } else {
    characterPresence = "missing";
    if (isNewsCategory) {
      issues.push({
        code: "character_missing_for_news",
        severity: "warning",
        message:
          "ニュース系記事ですが、ひまり・らぼまるの短い補助会話・案内ブロックが本文に見当たりません。1回だけ自然に入れてください（CharacterDialogue / CharacterCallout / CharacterGuideCard 等の画像つきブロック推奨）。",
      });
    }
  }

  // --- 4) boxHeadingCheck ---
  // summary-box / check-box / info-box / table-card の開始タグから次の </div> までを抜き出し、
  // その中で # / ## / ### / <h1-h3> が現れたら warning に積む。
  const boxHeadingWarnings = [];
  for (const cls of BOX_CLASS_NEEDLES) {
    // 行頭からのHTMLブロックを想定。`class="...cls..."` を持つ <div を探す。
    const re = new RegExp(`<div\\b[^>]*class\\s*=\\s*"[^"]*\\b${cls}\\b[^"]*"[\\s\\S]*?</div>`, "g");
    let m;
    while ((m = re.exec(body)) !== null) {
      const block = m[0];
      const headingMarkdown = block.match(/(^|\n)\s*#{1,3}\s+[^\n]+/g) || [];
      const headingHtml = block.match(/<h[1-3]\b[^>]*>/gi) || [];
      if (headingMarkdown.length || headingHtml.length) {
        boxHeadingWarnings.push({
          boxClass: cls,
          headingMarkdownCount: headingMarkdown.length,
          headingHtmlCount: headingHtml.length,
          sample: (headingMarkdown[0] || headingHtml[0] || "").trim().slice(0, 60),
        });
      }
    }
  }
  if (boxHeadingWarnings.length) {
    issues.push({
      code: "box_heading_too_large",
      severity: "warning",
      message: `補助ボックス（summary-box / check-box 等）の中にH1〜H3見出しがあります（${boxHeadingWarnings.length}件）。box-label または短い段落に置き換えてください。`,
    });
  }

  // --- 5) articleStructureCheck ---
  // 冒頭ブロックが、summary-box か短い段落か、整形済みリストかをざっくり判定。
  const trimmedBody = body.trim();
  const startsWithSummaryBox = /^<div\b[^>]*class\s*=\s*"[^"]*\bsummary-box\b/.test(trimmedBody);
  const startsWithTable = /^\|.*\|\s*\n\|/.test(trimmedBody);
  const startsWithList = /^[-*+]\s+/.test(trimmedBody);
  const firstParagraph = (trimmedBody.split(/\n\s*\n/)[0] || "").trim();
  const firstParagraphPlain = firstParagraph.replace(/<[^>]+>/g, "").replace(/\*\*/g, "");
  const firstParagraphLen = firstParagraphPlain.length;
  const opensWithConclusion = /結論|ポイント|要点|まずは|結局|つまり/.test(firstParagraphPlain);

  let articleStructure = "ok";
  if (startsWithTable || startsWithList) {
    articleStructure = "starts_with_table_or_list";
    issues.push({
      code: "article_starts_with_structure",
      severity: "warning",
      message: "本文がいきなり表またはリストから始まっています。冒頭3スクロール以内に結論が分かる短い導入を置いてください。",
    });
  } else if (!startsWithSummaryBox && !opensWithConclusion && firstParagraphLen < 30) {
    articleStructure = "intro_too_short";
    issues.push({
      code: "article_intro_too_short",
      severity: "warning",
      message: "冒頭段落が短すぎて結論が伝わりません。短い導入＋結論を最初に置いてください。",
    });
  }

  const titleOk = !titleDuplicate;
  const markdownOk = !markdownResidue;
  const ok = titleOk && markdownOk; // blocking 条件はこの2つ

  return {
    ok,
    titleDuplicate,
    titleDuplicateDetails,
    h1Count,
    markdownResidue,
    markdownResidueHits,
    characterPresence,
    boxHeadingWarnings,
    articleStructure,
    issues,
    reasons,
  };
}

export function validateGeneratedArticle({ body, source = {}, thumbnailExists, frontmatterTitle = "", category = "" }) {
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

  if (!includesAny(plain, ["関係がある人", "あまり関係がない人", "誰に関係ある？", "結局どうなの？"])) {
    issues.push(makeIssue("reader_focus", "warning", "誰に関係するか、読者目線の結論が弱い可能性があります。"));
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

  const articleQualityCheck = validateArticleQuality(body, { title: frontmatterTitle, category });
  for (const qIssue of articleQualityCheck.issues) {
    issues.push(qIssue);
  }

  const plainLanguageCheck = validatePlainLanguageArticle(body, { requireNewsStructure: true });
  for (const plainIssue of plainLanguageCheck.issues) {
    issues.push(plainIssue);
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
    articleQualityCheck,
    plainLanguageCheck,
    publishable: !hasMajorIssue,
    provisionalDecision: hasMajorIssue ? "要修正" : "preview確認後に公開可",
  };
}
