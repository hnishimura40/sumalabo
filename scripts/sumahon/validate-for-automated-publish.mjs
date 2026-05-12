// すまほん自動 watch → create-from-sumahon の最終 publish gate。
//
// 役割:
//   rule-based generator (`generateExplainer`) は元記事の要点を埋めない場合、
//   汎用的な定型句だけの「薄い記事」を生成することがある（2026-05-12 14:00/15:00
//   実行で Galaxy / Pixel が、20:06 手動 1-shot 実行で Apple spatial iPhone が
//   ほぼタイトルしかない状態の MDX を出した）。
//   これらを Preview ブランチ push / PR 作成 / PWA 通知 まで進めないために、
//   create-from-sumahon の `commitAndPushPreview` 直前に本ゲートを通す。
//
// 設計方針:
//   - blocking: 数値しきい値・必須セクション・placeholder 検出
//   - warning: 後段の visualPreviewReview / 人間目視に委ねる
//   - 例外を投げない。{ ok, blockingReasons, warningReasons, metrics } を返す
//   - 呼び出し側で ok=false なら exit 2 (= needs_regeneration) で抜ける

const PLACEHOLDER_PATTERNS = [
  { code: "placeholder_body_here", re: /本文をここに書く/, label: "本文をここに書く" },
  { code: "placeholder_summary_here", re: /要約をここに/, label: "要約をここに" },
  { code: "placeholder_todo", re: /^TODO[:：]/m, label: "TODO:" },
  { code: "placeholder_curly", re: /\{\{[^}]+\}\}/, label: "{{...}} 未展開" },
  { code: "placeholder_title_only", re: /^タイトルのみ\s*$/m, label: "タイトルのみ" },
];

// rule-based generator が定型文のままに残しがちなフレーズ。
// 2 個以上検出されたら、内容が元記事と結びついていない疑い大として blocking 扱い。
const FILLER_PHRASES = [
  /可能性がある話題です/,
  /公式情報で確認したいところ/,
  /すまラボ読者向けには次のように見ると分かりやすい/,
  /何が確定していて.{0,20}分からないのかを分けて/,
  /すまラボとしては.{0,30}今後のスマホ・AI・ガジェット選びの流れを見る材料/,
  /元記事の細かな表現をそのまま追うのではなく/,
  /「今すぐ全員が動くニュース」というより/,
];

function countJapaneseChars(text) {
  return [...text].filter((c) => /[぀-ゟ゠-ヿ一-鿿ー]/.test(c)).length;
}

function countH2(body) {
  return (body.match(/^##\s+[^\n]+/gm) || []).length;
}

function hasReferenceSection(body) {
  return /^##\s*参考情報\s*$/m.test(body);
}

function extractReferenceSectionUrls(body) {
  // 参考情報 セクションの開始行を探す
  const headerIdx = body.search(/^##\s*参考情報\s*$/m);
  if (headerIdx < 0) return [];
  // 開始行直後から「次の H2 が出るまで」を切り出す
  const rest = body.slice(headerIdx);
  const restAfterHeader = rest.slice(rest.indexOf("\n") + 1);
  const nextH2 = restAfterHeader.match(/(^|\n)##\s+/);
  const refSection = nextH2 ? restAfterHeader.slice(0, nextH2.index) : restAfterHeader;
  return refSection.match(/https?:\/\/[^\s)\]"'>]+/g) || [];
}

/**
 * @param {string} body  本文部分 (frontmatter 除去済み)
 * @param {object} [options]
 * @param {string} [options.frontmatterTitle]  比較用 (placeholder 検出には未使用、reporting note の判断などに使う)
 * @param {boolean} [options.isReporting]  噂・報道ベース記事なら true
 * @param {number} [options.minJapaneseChars]  既定 1500
 * @param {number} [options.warnJapaneseChars]  既定 2500
 * @param {number} [options.minH2]  既定 3
 * @param {number} [options.minReferenceUrls]  既定 2
 * @returns {{ ok: boolean, blockingReasons: string[], warningReasons: string[], metrics: object }}
 */
export function validateForAutomatedPublish(body, options = {}) {
  const {
    minJapaneseChars = 1500,
    warnJapaneseChars = 2500,
    minH2 = 3,
    minReferenceUrls = 2,
  } = options;

  const plain = String(body).replace(/<[^>]+>/g, "");
  const japaneseChars = countJapaneseChars(plain);
  const h2Count = countH2(body);
  const referenceSectionPresent = hasReferenceSection(body);
  const referenceUrls = extractReferenceSectionUrls(body);
  const urlCount = referenceUrls.length;

  const placeholderHits = PLACEHOLDER_PATTERNS.filter((p) => p.re.test(body)).map((p) => p.label);
  const fillerHits = FILLER_PHRASES.filter((re) => re.test(plain));

  // すまほん非露出はここでは確認しない (validateSourceReferences で見る)
  // sourceCheck / articleQualityCheck は呼び出し側の orchestrator が別途呼ぶ前提

  const blockingReasons = [];
  const warningReasons = [];

  if (japaneseChars < minJapaneseChars) {
    blockingReasons.push(`body_too_thin: japaneseChars=${japaneseChars} < ${minJapaneseChars}`);
  } else if (japaneseChars < warnJapaneseChars) {
    warningReasons.push(`body_thin_warning: japaneseChars=${japaneseChars} < ${warnJapaneseChars}`);
  }

  if (h2Count < minH2) {
    blockingReasons.push(`too_few_h2: h2Count=${h2Count} < ${minH2}`);
  }

  if (!referenceSectionPresent) {
    blockingReasons.push("missing_reference_section: ## 参考情報 not found");
  } else if (urlCount < minReferenceUrls) {
    blockingReasons.push(`insufficient_reference_urls: urls=${urlCount} < ${minReferenceUrls}`);
  }

  if (placeholderHits.length > 0) {
    blockingReasons.push(`placeholder_patterns_detected: ${placeholderHits.join(", ")}`);
  }

  if (fillerHits.length >= 2) {
    blockingReasons.push(
      `generic_filler_detected: ${fillerHits.length} known boilerplate phrases (likely rule-based generator output not tied to source)`,
    );
  }

  return {
    ok: blockingReasons.length === 0,
    blockingReasons,
    warningReasons,
    metrics: {
      japaneseChars,
      h2Count,
      referenceSectionPresent,
      urlCount,
      placeholderHits: placeholderHits.length,
      fillerHits: fillerHits.length,
    },
  };
}
