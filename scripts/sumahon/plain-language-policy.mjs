const SUMMARY_LABELS = ["これは何？", "何があった？", "誰に関係ある？", "結局どうなの？"];

function issue(code, severity, message) {
  return { code, severity, message };
}

function stripNonPublicMaterial(source = "") {
  return String(source)
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^import\s+.+;\s*$/gm, "")
    .replace(/^##\s*参考情報\s*$[\s\S]*$/m, "");
}

export function visibleArticleText(source = "") {
  return stripNonPublicMaterial(source)
    .replace(/<[^>]+>/g, " ")
    .replace(/\[[^\]]+\]\([^\)]+\)/g, (match) => match.replace(/\]\([\s\S]*/, ""))
    .replace(/[*_`#>|{}[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// 単語単体ではなく、編集工程でしか成立しない複合表現を検出する。
// 「プロンプトの記事」「拒否権(veto)のニュース」など正当な題材は通す。
const INTERNAL_RESIDUE_RULES = [
  { code: "internal_copy_label", re: /図のポイント\s*[（(]コピー可能[）)]|コピー可能な図のポイント/u, label: "図解制作向けのコピー指示" },
  { code: "internal_scout_source", re: /スカウト元(?:の記事|の見出し|の情報|は|から)/u, label: "内部のスカウト元表現" },
  { code: "internal_autopublish_control", re: /自動公開(?:を|の)(?:止める|停止|再開|許可|禁止)/u, label: "自動公開の操作指示" },
  { code: "internal_veto_control", re: /(?:公開|記事|編集|承認).{0,16}(?:veto|VETO)|(?:veto|VETO).{0,16}(?:ボタン|停止|公開)/u, label: "編集用veto操作" },
  { code: "internal_only_label", re: /内部用(?:メモ|指示|データ|文章|プロンプト|prompt)?/iu, label: "内部用ラベル" },
  { code: "internal_prompt_instruction", re: /(?:system\s*prompt|システムプロンプト|プロンプト|prompt).{0,28}(?:貼り付け|保存|出力|実行|編集者|システム用)|(?:以下|この文章).{0,20}(?:プロンプト|prompt).{0,20}(?:貼り付け|入力)/iu, label: "生成工程のプロンプト指示" },
];

export function scanInternalResidue(source = "") {
  const publicMaterial = stripNonPublicMaterial(source);
  const findings = [];
  for (const rule of INTERNAL_RESIDUE_RULES) {
    const match = publicMaterial.match(rule.re);
    if (match) findings.push({ code: rule.code, label: rule.label, match: match[0].slice(0, 100) });
  }
  return findings;
}

export function parseReaderTranslationPlan(source = "") {
  const section = String(source).match(/^##\s*読者翻訳設計\s*$([\s\S]*?)(?=^##\s+|(?![\s\S]))/m)?.[1] || "";
  const terms = [];
  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*(?:専門用語\s*:\s*)?[`「『]?([^`「『」』:：→]{1,48})[`」』]?\s*(?:→|=>|：|:)\s*(.{4,160})$/u);
    if (!match) continue;
    const term = match[1].trim();
    if (/^(?:主題の一言説明|関係がある人|あまり関係がない人|ほぼ関係ない人|事実から言えること|事実から言えないこと)$/u.test(term)) continue;
    terms.push({ term, explanation: match[2].trim() });
  }
  return { hasSection: Boolean(section), terms };
}

function firstUseExplained(source, term) {
  const publicMaterial = stripNonPublicMaterial(source);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const termPattern = /^[A-Za-z0-9 _+.-]+$/u.test(term)
    ? `(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`
    : escaped;
  const match = new RegExp(termPattern, "iu").exec(publicMaterial);
  if (!match) return false;
  const around = publicMaterial.slice(Math.max(0, match.index - 30), match.index + match[0].length + 130);
  const plainNouns = "仕組み|ソフト|道具|機能|サービス|制度|技術|作業場|呼び名|こと|無料版|種類|設計方式|設定画面|作り方|考え方";
  const explainedAfter = new RegExp(`[（(][^）)\\n]{3,90}[）)]|(?:とは|というのは|は、|は「|ここでいう|つまり|ざっくり言えば|普通の言葉でいうと).{2,100}(?:${plainNouns})`, "u").test(around);
  const explanationBefore = new RegExp(`(?:${plainNouns}).{0,45}[（(]?(?:\\*\\*)?${termPattern}(?:\\*\\*)?[）)]?`, "iu").test(around);
  return explainedAfter || explanationBefore;
}

export function validatePlannedTermExplanations(article, planSource) {
  const plan = parseReaderTranslationPlan(planSource);
  const issues = [];
  if (!plan.hasSection) {
    issues.push(issue("reader_translation_plan_missing", "major", "Editorial Selectionに『読者翻訳設計』がありません。主題・関係者・専門語の言い換えを先に設計してください。"));
    return { plan, issues };
  }
  if (plan.terms.length === 0) {
    issues.push(issue("reader_translation_terms_missing", "major", "読者翻訳設計に専門用語→普通の日本語の対応がありません。専門語が無い場合も『専門用語なし』と明記してください。"));
    return { plan, issues };
  }
  if (plan.terms.length === 1 && /^(?:なし|専門用語なし)$/u.test(plan.terms[0].term)) return { plan, issues };
  for (const { term } of plan.terms) {
    if (!firstUseExplained(article, term)) {
      issues.push(issue("jargon_first_use_unexplained", "major", `専門用語「${term}」が、本文の初出付近で普通の日本語に説明されていません。`));
    }
  }
  return { plan, issues };
}

export function validatePlainLanguageArticle(source = "", { requireNewsStructure = true } = {}) {
  const issues = [];
  const publicMaterial = stripNonPublicMaterial(source);
  const visible = visibleArticleText(publicMaterial);
  const summary = publicMaterial.match(/<Summary30\b[^>]*>([\s\S]*?)<\/Summary30>/i)?.[1]
    || publicMaterial.match(/^##\s*30秒[^\n]*\n([\s\S]*?)(?=^##\s+|(?![\s\S]))/m)?.[1]
    || "";

  for (const finding of scanInternalResidue(source)) {
    issues.push(issue(finding.code, "major", `公開本文に${finding.label}が残っています: ${finding.match}`));
  }

  if (requireNewsStructure) {
    if (!summary) {
      issues.push(issue("summary30_missing", "major", "30秒サマリー（Summary30）がありません。"));
    } else {
      const missing = SUMMARY_LABELS.filter((label) => !summary.includes(label));
      if (missing.length) issues.push(issue("summary30_fields_missing", "major", `30秒サマリーの項目が不足しています: ${missing.join(" / ")}`));
    }

    const early = visible.slice(0, 1500);
    const hasWhatIs = /(?:そもそも.{0,40}(?:とは|って何)|これは何[？?]?|^|。)(?:[^。]{0,90})(?:とは|というのは|は、)(?:[^。]{2,100})(?:サービス|制度|技術|ソフト|道具|製品|機能|仕組み|開発環境|こと)/u.test(early)
      || /^##\s*(?:そもそも|これは何)/m.test(publicMaterial);
    if (!hasWhatIs) issues.push(issue("subject_definition_missing", "major", "冒頭で『そもそも何か』を専門知識ゼロの読者向けに説明できていません。"));

    if (!/(?:関係がある人|こんな人に関係)/u.test(publicMaterial)) {
      issues.push(issue("relevant_people_missing", "major", "記事前半に『関係がある人』がありません。"));
    }
    if (!/(?:あまり関係がない人|ほぼ関係ない人|急いで気にしなくてよい人|今は関係が薄い人)/u.test(publicMaterial)) {
      issues.push(issue("non_relevant_people_missing", "major", "記事前半に『あまり関係がない人』がありません。"));
    }
  }

  const sentenceMaterial = publicMaterial
    .replace(/<[^>]+>/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/\[[^\]]+\]\([^\)]+\)/g, (match) => match.replace(/\]\([\s\S]*/, ""));
  const sentences = sentenceMaterial.split(/[。！？!?\r\n]+/u).map((value) => value.replace(/[*_`>|{}[\]]/g, " ").replace(/\s+/g, " ").trim()).filter(Boolean);
  const longest = sentences.reduce((max, sentence) => Math.max(max, sentence.length), 0);
  const average = sentences.length ? Math.round(sentences.reduce((sum, sentence) => sum + sentence.length, 0) / sentences.length) : 0;
  if (longest > 150 || average > 78) {
    issues.push(issue("plain_language_sentence_density", "warning", `一文が長く、噛み砕きが説明の長文化になっている可能性があります（最長${longest}字・平均${average}字）。`));
  }

  const bubbles = [...publicMaterial.matchAll(/<CharacterBubble\b[^>]*>([\s\S]*?)<\/CharacterBubble>/gi)].map((match) => visibleArticleText(match[1]));
  if (bubbles.length && !bubbles.some((text) => /[？?]|つまり|ということ|のこと|自分|私|便利|関係/u.test(text))) {
    issues.push(issue("character_reader_role_missing", "warning", "キャラクター会話が読者の疑問・専門語の意味・利便性・自分との関係を代弁していません。"));
  }

  return {
    ok: !issues.some((item) => item.severity === "major"),
    issues,
    summaryLabels: SUMMARY_LABELS,
    metrics: { visibleCharacters: visible.length, sentenceCount: sentences.length, longestSentence: longest, averageSentence: average },
  };
}
