// generate-slide-factcheck-prompt.mjs
//
// 生成済みスライド一式に対する factcheck プロンプトを組み立てる。
// PR-B 以降の slide_factcheck 段階で、Claude in Chrome に画像を添付して
// 評価を依頼する想定。
//
// 入力:
//   slidePlan      : generateSlidePlan の出力
//   understanding  : articleUnderstanding
//   bodySummary?   : 本文要約 (任意)
//   slidePngPaths? : 生成済み slide PNG パス配列 (informational のみ)
//
// 出力: factcheck プロンプト文字列
//
// 評価項目 (各 slide ごと):
//   1. 事実誤認の有無
//   2. 報道/噂段階の明示があるか (tone=rumor の場合)
//   3. 比較軸がズレていないか
//   4. タイトルと中身の整合
//   5. 文字量 (大コピー ≤ 2 / 補助 ≤ 2)
//   6. 見出し / 要点 / 図の関係が整理されているか
//   7. ひまり・らぼまるが記事内容に即しているか
//   8. 2 人が置物化していないか
//   9. 道具の使い方に意味があるか
//
// 期待する出力 (Claude → 呼び出し側):
//   {
//     slides: [
//       { id, verdict: "ok" | "needs_revision" | "ok_with_warning",
//         issues: string[], revisionHint?: string }
//     ]
//   }

/**
 * @param {object} args
 * @param {object} args.slidePlan
 * @param {object} args.understanding
 * @param {string} [args.bodySummary]
 * @param {string[]} [args.slidePngPaths]
 * @returns {string}
 */
export function generateSlideFactcheckPrompt({
  slidePlan,
  understanding,
  bodySummary,
  slidePngPaths,
} = {}) {
  if (!slidePlan) throw new Error("generateSlideFactcheckPrompt: slidePlan is required");
  if (!understanding) throw new Error("generateSlideFactcheckPrompt: understanding is required");

  const tone = understanding._meta?.tone || "neutral";
  const theme = understanding.articleTheme || "本記事";
  const slug = understanding.slug || "(slug-unknown)";
  const variant = understanding.articleVariant || "news";

  const slideList = (slidePlan.slides || [])
    .map((s, i) => {
      const path = slidePngPaths?.[i] || `public/images/articles/${slug}/${s.id}.png`;
      const props = (s.props || []).join(" / ");
      return [
        `### Slide ${i + 1}: ${s.id}`,
        `- purpose: ${s.purpose}`,
        `- format: ${s.format}`,
        `- title: ${s.title}`,
        `- mustInclude:\n${(s.mustInclude || []).map((m) => `    - ${m}`).join("\n")}`,
        `- characterRole.himari: ${s.characterRole?.himari || "(未設定)"}`,
        `- characterRole.labomaru: ${s.characterRole?.labomaru || "(未設定)"}`,
        `- props: ${props || "(未設定)"}`,
        `- factCaveats: ${(s.factCaveats || []).join(" / ") || "(なし)"}`,
        `- 画像パス: ${path}`,
      ].join("\n");
    })
    .join("\n\n");

  const bodySummarySection = bodySummary
    ? `## 本文要約 (参考、ファクトチェックの基準として)\n${bodySummary.slice(0, 2000)}\n`
    : "## 本文要約: (この factcheck では指定されていません)";

  return `# すまラボ図解スライド ファクトチェック プロンプト (slug: ${slug})

あなたはすまラボ記事の図解スライドを点検する作業者です。各スライド画像と本記事の理解
(articleUnderstanding) を突き合わせ、不一致・誤認・体裁不良を blocking / warning レベルで
判定してください。生成済みスライド画像はあらかじめ添付されています。

## 記事メタ
- slug: ${slug}
- theme: ${theme}
- variant: ${variant}
- tone: ${tone}
- readerDecisionPoint: ${understanding.readerDecisionPoint || "(未設定)"}
- buyWaitOrWatch: ${understanding.buyWaitOrWatch || "(未設定)"}

${bodySummarySection}

## 点検対象スライド (${slidePlan.slides?.length ?? 0} 枚)

${slideList}

## 評価項目 (各 slide ごとに 9 項目をチェック)

1. 事実誤認の有無 — mustInclude / 本文要約 と画像内記述に矛盾がないか
2. 報道/噂段階の明示 — tone=rumor なら「噂」「報じられている」「可能性」などで距離感ある記載か
3. 比較軸がズレていないか — comparison / decision-3way 系では軸の意味が一貫しているか
4. タイトルと中身の一致 — title と図解の主題が一致しているか
5. 文字量 — 大見出し ≤ 2、補助コピー ≤ 2、本文要素は各 1〜2 行に収まっているか
6. 見出し / 要点 / 図の関係 — 視線導線が整理されているか
7. ひまり・らぼまるが記事内容に即しているか — characterRole 通りの反応・道具使用か
8. 置物化していないか — 立っているだけ・無表情・並びだけ等は blocking
9. 道具の使い方に意味があるか — 比較ボード/虫眼鏡/チェックリスト/注意カードが purpose と整合しているか

## 出力フォーマット (厳守)

最終行に、以下の JSON 1 行を出力してください。それ以外の解説は JSON の前に書いてよい
ですが、最後の行は必ず JSON で終わること。

\`\`\`json
{
  "slides": [
    {
      "id": "<slide id e.g. fig01-overview>",
      "verdict": "ok" | "needs_revision" | "ok_with_warning",
      "issues": ["問題点を 1 行ずつ", "..."],
      "revisionHint": "<needs_revision の場合だけ、修正版で直してほしい点を 1 文で>"
    },
    ...
  ]
}
\`\`\`

## 判定ルール

- verdict=ok: 9 項目すべて問題なし
- verdict=ok_with_warning: blocking ではないが軽微な改善余地あり (例: 補助コピーが 3 個)
- verdict=needs_revision: 1 項目でも事実誤認 / 置物化 / 文字過密 / 噂段階明示なし などの
  blocking 級の問題がある場合

## 禁止
- 「普通の人」「みんな」「全員」のような外向きにズレるコピーを issues に書かない
  (記事側の外向きコピー基準に合わせる)。
- 推測でなく、画像と mustInclude / 本文要約の対比に基づいて判定する。
`;
}
