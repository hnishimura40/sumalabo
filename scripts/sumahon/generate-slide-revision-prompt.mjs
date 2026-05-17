// generate-slide-revision-prompt.mjs
//
// factcheck で blocking が出た slide だけを再生成する修正版プロンプトを組み立てる。
// 全数再生成ではなく、指摘箇所だけを直す差分修正型。
//
// 入力:
//   slide          : 元 slidePlan.slides[i] (修正対象)
//   factcheckEntry : factcheck 結果の該当 slide entry
//                    { id, verdict, issues[], revisionHint? }
//   understanding  : articleUnderstanding
//   options:
//     - widthPx (default 1672)
//     - heightPx (default 941)
//
// 出力: 画像生成プロンプト文字列
//
// 設計方針:
// - mustInclude / characterRole / props は元の slide を維持 (差分修正)
// - 「全面リライト」ではなく「指摘箇所だけ直す」スタンス
// - revisionHint と issues を冒頭で明示
// - 元のプロンプトを下敷きにし、変更点だけを add-on で示す

import { generateSlidePrompt } from "./generate-slide-prompt.mjs";

const FORBIDDEN_COPY = ["普通の人", "みんな", "全員", "誰でも", "万人向け"];

/**
 * @param {object} args
 * @param {object} args.slide           - 元 slide
 * @param {object} args.factcheckEntry  - factcheck 結果の該当 entry
 * @param {object} args.understanding   - articleUnderstanding
 * @param {number} [args.widthPx]
 * @param {number} [args.heightPx]
 * @returns {string}
 */
export function generateSlideRevisionPrompt({
  slide,
  factcheckEntry,
  understanding,
  widthPx = 1672,
  heightPx = 941,
} = {}) {
  if (!slide) throw new Error("generateSlideRevisionPrompt: slide is required");
  if (!factcheckEntry) {
    throw new Error("generateSlideRevisionPrompt: factcheckEntry is required");
  }
  if (!understanding) {
    throw new Error("generateSlideRevisionPrompt: understanding is required");
  }

  const issues = Array.isArray(factcheckEntry.issues) ? factcheckEntry.issues : [];
  const revisionHint = (factcheckEntry.revisionHint || "").trim();

  const issuesList = issues.length
    ? issues.map((s, i) => `${i + 1}. ${s}`).join("\n")
    : "(具体的 issue 列挙なし)";

  // 元プロンプトを下敷きにする
  const basePrompt = generateSlidePrompt({
    slide,
    understanding,
    widthPx,
    heightPx,
  });

  const forbiddenList = FORBIDDEN_COPY.join("／");

  return `# すまラボ図解スライド 修正版生成プロンプト (slug: ${understanding.slug || "(unknown)"} / slide: ${slide.id})

## 元 slide の verdict
${factcheckEntry.verdict || "(未指定)"}

## ファクトチェックで指摘された箇所 (mustFix)
${issuesList}

${revisionHint ? `## 修正ヒント (factcheck 由来)\n${revisionHint}\n` : ""}

## 修正方針
- mustInclude / characterRole / props / format は元の slide を維持する (差分修正)。
- 上記 issue で指摘された箇所だけを直す。元の構成を大幅に変えない。
- 「全面リライト」ではなく「ピンポイント修正」のスタンス。
- 修正後も以下は変えない:
  - title: ${slide.title}
  - purpose: ${slide.purpose}
  - format: ${slide.format}
- 文字過密 (issue として上がっている場合) は大見出し 1 + 補助 2 を上限に整理する。
- 報道/噂段階の明示が抜けていた場合 (issue) は、対象箇所に明示する。
- キャラクターが置物化していた場合 (issue) は、表情・道具の使い方を再構成する。

## 元のプロンプト (下敷き)
${basePrompt}

## 禁止 (修正版でも継承)
- 「${forbiddenList}」などの外向きにズレるコピーは使わない。
- 実在企業ロゴ・実機写真コピーは使わない。
- 修正のついでに mustInclude / characterRole / props を勝手に変えない。
- 元のサイズ ${widthPx}×${heightPx}px を変えない。
`;
}
