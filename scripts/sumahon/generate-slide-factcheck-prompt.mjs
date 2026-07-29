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

import { formalProductNamesChecklist } from "./formal-product-names.mjs";

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
  const formalNames = formalProductNamesChecklist();

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

## 評価項目 (各 slide ごとに 13 項目をチェック)

### 固有名詞の正式表記リスト（画像内テキストも厳守）
${formalNames}

リストにない表記ゆれや旧称を見つけた場合は needs_revision。正式表記リストの正本は data/qa/formal-product-names.json。

1. 事実誤認の有無 — mustInclude / 本文要約 と画像内記述に矛盾がないか
2. 報道/噂段階の明示 — tone=rumor なら「噂」「報じられている」「可能性」などで距離感ある記載か
3. 比較軸がズレていないか — comparison / decision-3way 系では軸の意味が一貫しているか
4. タイトルと中身の一致 — title と図解の主題が一致しているか
5. 文字量 — 大見出し ≤ 2、補助コピー ≤ 2、本文要素は各 1〜2 行に収まっているか
6. 見出し / 要点 / 図の関係 — 視線導線が整理されているか
7. ひまり・らぼまるが記事内容に即しているか — characterRole 通りの反応・道具使用か
8. 置物化していないか — 立っているだけ・無表情・並びだけ等は blocking
9. 道具の使い方に意味があるか — 比較ボード/虫眼鏡/チェックリスト/注意カードが purpose と整合しているか
10. **キャラの視覚的破綻がないか（認識アンカー一致・最重要）** — 判定は「**認識アンカー**」で行う。ひまりのアンカー = **金髪サイドテール + 水色/ティールのリボン、青い瞳、正本の顔立ち・頭身**。らぼまるのアンカー = **白い卵型ボディ + 頭のアンテナ（黄緑の玉）+ 黒い丸い目 + 胸のオレンジのハートボタン + 青い首輪バンド + 左右の青い耳ビレ + 正本の体型**。**このアンカーが逸脱している場合（髪色・髪型・顔立ち・頭身が違う／人型メカロボット化／らぼまるのボディ形状・アンテナ・ハートバッジが違う 等）は needs_revision（blocking）**。同一記事の別スライドでアンカーが変わる（途中からキャラが変わる）のも blocking。工房チャットの参照劣化で後半スライドから崩れる典型パターンを必ず疑う。**耳ビレが正本より短い・丸い傾向だけなら warning として監視し、別キャラ化していなければ pass を維持する**。
    - ★ **服・上着・小道具・ポーズ・背景の違いそのものは「破綻」ではない**（演出はテーマで変わる）。アンカーが保たれていれば別人化とはみなさず、fallback/needs_revision の理由にしない。スライドで衣装を変える場合は演出ブロックに従い、記事内で一貫させる。根拠なくスライド間で衣装がバラつく場合だけ warning（"ok_with_warning"）とする。
    - ★ ひまりの**露出の多い/扇情的な衣装**は衣装の自由とは別に blocking。
10B. **身体構造破綻がないか（公開ブロック・最重要）** — キャラごとに四肢を実際に数える。**手が描かれている画像は、見える手を1つずつ handChecks に列挙し、(a)左手/右手として自然な向きか、親指が手の向きと体側に対して自然な側か、(b)手首と腕の接続にねじれ・継ぎ足し・融合がないか、(c)指の長さ・太さ、とくに親指の比率が自然かを必ず個別回答する**。明確な左右不整合・親指位置の矛盾・接続異常は needs_revision。指の比率だけの違和感は ok_with_warning とし、画像ID・手の左右・違和感を issues に書く。ひまりは腕2本・手2つ・脚2本（見える手は原則各5本指）。らぼまるは腕・手・脚・足が左右各1つで、それ以外の突起は黄緑アンテナ1本と左右の青い耳ビレだけ。らぼまるの腕は短く・太く・丸い正本形状でなければならない。細長い触手状・ホース状・急なS字・にょきっと伸びる腕、腕や脚の不自然な長さ/細さ、付け根や関節の破綻、不快なシルエット、余分/重複した手指や腕、体から生える謎の手、小道具を持つ独立手、顔の破綻、身体と物体の融合は needs_revision。単に体や画面外に隠れて見えない四肢は、それだけで欠損扱いしない。
11. **文字化け・レイアウト破綻がないか** — 日本語の文字化け・意味を成さない誤字（例: 助詞の欠落「目的ことで」等）、要素の見切れ・重なり・枠崩れ・はみ出しがあれば needs_revision（blocking）。
12. **表情・トーンが記事の性質と矛盾していないか（サムネ・注意速報/惜別記事で特に重要）** — 記事テーマが **終了・サービス終了・障害・不具合・値上げ・リコール・脆弱性** など「注意・速報／惜別」系のサムネは、**「驚き＋対処の組み合わせ」= OK**（ひまりが「えっ!?」の驚き顔で読者の反応を代弁し、らぼまるが冷静に案内・チェック役＝驚き×安心のコントラスト）。次の 3 つのいずれかが出ていたら needs_revision（blocking）: ① **ニコニコ・はしゃぎ・ワクワク顔**（温度が記事と違う）／② **ムスッ・無表情・冷たい顔**（目を引かない・前回の失敗パターン）／③ **炎・涙・パニックの過剰煽り**。大きな数字・「終了」の視覚化・警告寄り配色は注意速報系では許容（むしろ推奨）。逆にポジティブ系（新機能・復活・延長・無料化）で無表情・暗すぎるのも軽微な不整合として指摘してよい（warning）。**★朗報・喜び爆発系（読者が確実に得する確定ニュース：継続決定・存続決定「残る/使い続けられる」・無料化・復活・値下げ・大幅増量・待望の解禁）のサムネ**では、キャラが**満面の笑み＋ジャンプ・前傾・弾む姿勢・視線・衣装や背景の動きで喜びきっている**のが正（手は原則描かず、ポケット・袖・後ろ手・前景・フレームアウトで隠してよい）。もし**案内板・分岐図（矢印記号→）・比較表・無表情の説明構図・控えめな指さし案内**になっていて「読者の歓喜を代弁できていない」場合は、**改善指摘＝warning（"ok_with_warning"）**とする（needs_revision（blocking）にはしない＝事実が正しければ公開は止めない）。revisionHint に「喜び爆発（笑顔/ジャンプ/弾む姿勢/背景の動き）＋感情の言葉コピーへ」と記す。判定基準は \`assets/characters/character-sheet.md\` の「記事の感情トーンを表情・仕草に反映する」（4分類：朗報・喜び爆発／ポジティブ通常／ニュートラル／注意速報・惜別）。
13. **演出が記事テーマと合っているか（warning観察）** — slide_plan の演出ブロックと照合し、衣装・小道具・ポーズ・背景がテーマ固有の体験を表しているか確認する。標準衣装の棒立ち、汎用背景、指さし説明だけ、小道具を持つだけで使っていない場合は ok_with_warning。比較なら見比べる、検証なら調べる、操作記事なら手を動かす等の演技が見えること。**演出が弱いだけなら needs_revision にしない**。

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
      "handChecks": [{"character":"himari|labomaru","visible":true,"side":"left|right|unclear","orientationNatural":true,"thumbPositionNatural":true,"wristConnectionNatural":true,"proportionsNatural":true,"severity":"ok|warning|needs_revision","note":"手ごとの根拠"}],
      "revisionHint": "<needs_revision の場合だけ、修正版で直してほしい点を 1 文で>"
    },
    ...
  ]
}
\`\`\`

## 判定ルール

- verdict=ok: 全項目に問題なし
- verdict=ok_with_warning: blocking ではないが軽微な改善余地あり (例: 補助コピーが 3 個)
- handChecks: 画像内で実際に見える手だけを1つずつ回答し visible=true とする。画面外の手を推測して追加しない。bbox中心が手に重なり、手首・前腕を含むことを出力前に確認する。手が見えない画像は必ず空配列。比率だけの違和感は warning、明確な左右不整合・接続異常は needs_revision
- verdict=needs_revision: 1 項目でも事実誤認 / 置物化 / 文字過密 / 噂段階明示なし /
  **キャラの視覚的破綻（項目10）/ 身体構造破綻（項目10B）/ 文字化け・レイアウト破綻（項目11）** などの
  blocking 級の問題がある場合
- **キャラ視覚破綻（項目10）・身体構造破綻（項目10B）・レイアウト破綻（項目11）は「全体の見た目が良ければ pass」で見逃さない。
  1 枚でも別人化・別デザイン化・崩れがあれば、そのスライドは必ず needs_revision にする**
  （2026-07 に「8/8 pass」と報告しながら後半スライドのキャラ崩壊を見逃した事故の再発防止）。

## 禁止
- 「普通の人」「みんな」「全員」のような外向きにズレるコピーを issues に書かない
  (記事側の外向きコピー基準に合わせる)。
- 推測でなく、画像と mustInclude / 本文要約の対比に基づいて判定する。
`;
}
