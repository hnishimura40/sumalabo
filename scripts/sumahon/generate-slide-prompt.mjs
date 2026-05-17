// generate-slide-prompt.mjs
//
// 単一スライドの画像生成プロンプト (ChatGPT 画像生成向け) を組み立てる。
// PR-B 以降の slide_draft_generation 段階で各 slide に対して呼ばれる。
//
// 入力:
//   slide          : slidePlan.slides[i]
//   understanding  : articleUnderstanding (theme / readerDecisionPoint / 等)
//   options:
//     - widthPx (default 1672)
//     - heightPx (default 941)
//
// 出力: 画像生成プロンプト文字列 (~1500-2500 chars)
//
// 設計方針:
// - 1 枚 1 テーマ。情報を詰め込みすぎない (大見出し 1 + 補助 2 までを目安)。
// - ひまり・らぼまるは原則登場。置物化禁止。
// - 役割:
//     ひまり = 読者目線、驚き、疑問、判断の迷い
//     らぼまる = 整理、比較、分析、補助説明
// - 必要なら道具を持たせる (比較ボード / 虫眼鏡 / チェックリスト / 注意カード /
//   フローチャート板 など)。slide.props を必ずプロンプトに含める。
// - デザイン: 日本語、読みやすさ重視、見出し強め、本文短め、テック・分析・清潔感。
//   白背景または淡い背景。
// - 「普通の人」「みんな」「全員」など外向きにズレるコピーは禁止。
// - 実在製品の公式画像をそのまま模写しない。
// - 未確定情報 (tone=rumor / factCaveats あり) は明示する。

const FORBIDDEN_COPY = ["普通の人", "みんな", "全員", "誰でも", "万人向け"];

/**
 * @param {object} args
 * @param {object} args.slide          - slidePlan.slides[i]
 * @param {object} args.understanding  - articleUnderstanding
 * @param {number} [args.widthPx=1672]
 * @param {number} [args.heightPx=941]
 * @returns {string} 画像生成プロンプト
 */
export function generateSlidePrompt({ slide, understanding, widthPx = 1672, heightPx = 941 } = {}) {
  if (!slide) throw new Error("generateSlidePrompt: slide is required");
  if (!understanding) throw new Error("generateSlidePrompt: understanding is required");

  const theme = understanding.articleTheme || "本記事";
  const tone = understanding._meta?.tone || "neutral";
  const slug = understanding.slug || "(slug-unknown)";

  const mustIncludeLines = (slide.mustInclude || [])
    .map((m, i) => `${i + 1}. ${m}`)
    .join("\n");
  const factCaveatsLines = (slide.factCaveats || []).length
    ? slide.factCaveats.map((c) => `- ${c}`).join("\n")
    : "- (この slide には特別な注記なし)";

  const propsLine = (slide.props || []).join(" / ");
  const himariLine = slide.characterRole?.himari || "(未設定)";
  const labomaruLine = slide.characterRole?.labomaru || "(未設定)";

  const rumorAdvisory = tone === "rumor"
    ? "報道・噂段階の情報は『噂』『可能性』『報じられている』などの距離感ある語で記載すること。"
    : "";

  // forbidden copy notice: keep it short, do not list the actual forbidden
  // words in too-prominent a way (AUP-friendly).
  const forbiddenList = FORBIDDEN_COPY.join("／");

  return `# すまラボ図解スライド画像生成プロンプト (slug: ${slug})

## 出力サイズ
${widthPx}×${heightPx}px、16:9 横長、PNG。

## このスライドの目的 (1 枚 1 テーマ)
- purpose: ${slide.purpose}
- format: ${slide.format}
- タイトル: ${slide.title}

## 必ず含める内容 (mustInclude)
${mustIncludeLines}

## キャラクター配置 (必須・置物化禁止)
- ひまり: ${himariLine}
- らぼまる: ${labomaruLine}

ひまり = 読者目線、驚き、疑問、判断の迷い。
らぼまる = 整理、比較、分析、補助説明。

両者とも記事内容を理解した上で反応する。表情・ポーズ・道具で「何を感じ、何を整理して
いるか」がわかること。立っているだけ・並んでいるだけ・無表情・待機ポーズは禁止。

## 道具 (必ず使う)
${propsLine || "(slide.props 未設定 → 比較ボード / メモカードなどを記事に合わせて選ぶ)"}

道具は配置の意味と合わせること。比較ボードなら 2 列にする、虫眼鏡なら一点を指す、
チェックリストなら✓を入れる、注意カードなら⚠を出す、など。

## 注記 (factCaveats)
${factCaveatsLines}
${rumorAdvisory}

## デザイン制約
- 日本語、読みやすさ重視
- 大見出しは 1 つ (上部中央)、補助コピーは最大 2 つまで
- 本文要素 (キャプション / 解説) は短く、各 1〜2 行に収める
- カードや表で区切る。文字を詰め込まない
- テック系・分析系・清潔感のあるデザイン
- 白背景 または 淡いミント／ティール系の背景
- 見出しは強め (太字 / 余白あり) で視線が止まる作り
- 画像内文字は読者がコピーする想定ではないので、HTML 側 (slide-reading-note) に
  補完される前提。スライド単独で全文を伝えようとしない。

## 禁止
- 「${forbiddenList}」などの外向きにズレるコピーは使わない。
  代わりに「買う前に見るポイント」「今見るべき点」「便利？それとも様子見？」のような
  外向きコピーを使う。
- 実在企業ロゴ、実在製品の公式プロダクト画像をそのまま模写しない (商標を避ける)。
- 個人を特定できる顔写真や実機キャプチャの再現はしない。
- 煽り表現 (「悲報」「化石」「爆死」など) は使わない。
- 「全員」「誰でも」「絶対」のような断定的・誇大表現は使わない。
- スライド内に長文段落を入れない。

## 仕上がりイメージ (テンプレ化禁止)
購読者がこの 1 枚を見て「${slide.title}」の論点をつかめる程度。完璧な情報網羅より
「視線が止まる」「コピー可能ポイントを HTML が補う」のセット運用を前提にする。
`;
}
