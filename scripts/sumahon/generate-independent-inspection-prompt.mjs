// generate-independent-inspection-prompt.mjs
//
// Phase C 直前に起動する「独立検品」用のプロンプトとスキーマを生成する。
//
// 目的（2026-07-14・X直接投稿の拡散リスク対策）:
//   スライドの誤字・キャラ崩れ・漢字化けが X 直接投稿で拡散するのを防ぐため、
//   画像 factcheck を「生成した本人のセッション内チェック」から分離する。
//   Phase C の直前に **生成の文脈を持たない検品専用 Task エージェント**を起動し、
//   白紙の目で全画像を再検査する（本人チェックとのダブルチェック体制）。
//
// 検品者がやること:
//   (A) factcheck 12 項目の再判定（generate-slide-factcheck-prompt.mjs と同基準）
//   (B) スライド本文（画像内テキスト）と最終稿（final_article）の突合
//   (C) X 投稿選抜スコア: 各スライドを「文字量が少ない / 数字が正確 / 単体で意味が通る」で採点し、
//       上位のみを X 直接投稿に回す（文字密度の高い誤字リスク大スライドは X から外し記事内専用に）
//
// 検品者がやらないこと: 画像の生成・再生成の判断（それは呼び出し側=driver が行う）。
//   検品者は「白紙の目での判定」だけを返す。

/**
 * 独立検品エージェントに渡す構造化出力スキーマ（StructuredOutput 用）。
 * xSelection は「X 直接投稿に載せる画像の並び」。先頭は原則サムネ。
 */
export const INDEPENDENT_INSPECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["overallPass", "slides", "thumbnail", "xSelection", "excludedFromX"],
  properties: {
    overallPass: { type: "boolean", description: "全スライド+サムネに needs_revision が無ければ true" },
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "verdict", "issues", "textDensity", "numbersAccurate", "standsAlone", "xPostScore"],
        properties: {
          id: { type: "string", description: "スライドID（例 slide06-alternatives）" },
          verdict: { type: "string", enum: ["ok", "ok_with_warning", "needs_revision"] },
          issues: { type: "array", items: { type: "string" }, description: "問題点を1行ずつ。無ければ空配列" },
          textDensity: { type: "string", enum: ["low", "mid", "high"], description: "画像内の文字量。high=誤字リスク大・X非推奨" },
          numbersAccurate: { type: "boolean", description: "数値・日付・固有名詞が最終稿と一致" },
          standsAlone: { type: "boolean", description: "本文なしでもその1枚で意味が通る" },
          xPostScore: { type: "integer", minimum: 0, maximum: 100, description: "X直接投稿の適性（文字量少・数字正確・単体で意味が通るほど高い。needs_revisionは0）" },
          revisionHint: { type: "string", description: "needs_revision の場合だけ、修正版で直す点を1文" },
        },
      },
    },
    thumbnail: {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "issues"],
      properties: {
        verdict: { type: "string", enum: ["ok", "ok_with_warning", "needs_revision"] },
        issues: { type: "array", items: { type: "string" } },
        revisionHint: { type: "string" },
      },
    },
    xSelection: {
      type: "array",
      items: { type: "string" },
      description: "X直接投稿に載せる画像IDの並び（最大4・先頭は原則 'thumbnail'）。needs_revision と textDensity=high は含めない",
    },
    excludedFromX: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "reason"],
        properties: { id: { type: "string" }, reason: { type: "string" } },
      },
      description: "X から外したスライドと理由（文字密度high / needs_revision / 単体で意味が通らない 等）",
    },
  },
};

/**
 * @param {object} args
 * @param {string} args.slug
 * @param {string} args.finalArticle  final_article.md の本文（最終稿・突合の基準）
 * @param {string} args.slidePlanText slide_plan.md の本文（各スライドの意図・入れる文字）
 * @param {Array<{id:string,path:string}>} args.slideImages  スライド画像（id と実ファイルパス）
 * @param {string|null} args.thumbnailPath サムネ画像パス
 * @returns {string}
 */
export function buildIndependentInspectionPrompt({ slug, finalArticle = "", slidePlanText = "", slideImages = [], thumbnailPath = null } = {}) {
  const imgList = [
    ...(thumbnailPath ? [`- thumbnail: ${thumbnailPath}`] : []),
    ...slideImages.map((s) => `- ${s.id}: ${s.path}`),
  ].join("\n");

  return `# すまラボ 独立検品（Phase C 直前・X直接投稿の拡散リスク対策・slug: ${slug}）

あなたは **この画像がどう作られたかを一切知らない検品専任者**です。生成の文脈・意図・言い訳を持たず、
**白紙の目**で、添付された全画像（サムネ + スライド）を最終稿と突き合わせて検査してください。
「作った本人ならこう見る」ではなく「初めて見た読者が誤情報・崩れに気づくか」で判定します。

## 検査対象（画像は添付済み。上から順に Read して1枚ずつ判定）
${imgList}

## 突合の基準＝最終稿（final_article）
以下が記事の確定内容です。画像内の数値・日付・固有名詞・主張はこれと一致していなければなりません。
\`\`\`
${finalArticle.slice(0, 6000)}
\`\`\`

## 各スライドの意図（slide_plan・参考）
\`\`\`
${slidePlanText.slice(0, 4000)}
\`\`\`

## (A) factcheck 12 項目（各画像で判定）
1. 事実誤認の有無（画像内記述が最終稿と矛盾しない）
2. 報道/噂段階の明示（未確定を確定と言い切っていない）
3. 比較軸のズレがない
4. タイトルと中身の一致
5. 文字量（大見出し≤2・補助≤2・各要素1〜2行）
6. 見出し/要点/図の関係が整理されている
7. ひまり・らぼまるが記事内容に即している
8. 置物化していない
9. 道具の使い方に意味がある
10. **キャラの視覚的破綻（認識アンカー一致）** — ひまり=金髪サイドテール+水色/ティールのリボン・青い瞳・正本の顔立ち/頭身 / らぼまる=白い卵型ボディ+黄緑アンテナ+黒い丸い目+胸のオレンジのハートボタン+正本の体型。逸脱・別人化・途中変化は needs_revision（blocking）。服・小道具の違いは破綻ではない
11. **文字化け・レイアウト破綻** — 日本語の文字化け・意味を成さない誤字（助詞欠落「目的ことで」等）・見切れ・重なり・枠崩れは needs_revision。**漢字の類似化け（例「目的→自的」目→自・未→末・微→徴 等。docs/kanji_pitfalls.md 参照）を重点確認**
12. **表情・トーンが記事の性質と矛盾しない** — 終了/障害/リコール等の注意・速報系は「驚き＋対処」がOK。ニコニコ/ムスッ・無表情/炎・涙・パニックは needs_revision。**朗報・喜び爆発系（継続決定「残る/使い続けられる」・無料化・復活・値下げ等、読者が確実に得する確定ニュース）は、キャラが万歳/ジャンプ/ガッツポーズ＋満面の笑みで喜びきっているのが正。案内板・分岐図（矢印→）・比較表・無表情の説明構図・控えめな指さし案内で読者の歓喜を代弁できていなければ warning（改善指摘・公開は止めない）**

## (B) スライド本文と最終稿の突合
- 画像内の全テキストを読み取り、数値・日付・固有名詞・鉤括弧を**1つずつ**最終稿と照合（numbersAccurate）。
- 一致しない数字・日付・誤記があれば issues に「画像:○○ / 最終稿:○○」の形で書き、verdict=needs_revision。

## (C) X 直接投稿の選抜スコア（各スライド 0〜100）
X には**上位4枚だけ**を直接添付する。次の3点が満たされるほど高スコア:
- **文字量が少ない**（textDensity=low が高得点。high は誤字が拡散するので X 非推奨=低得点）
- **数字が正確**（numbersAccurate=false は 0 点相当）
- **単体で意味が通る**（standsAlone=true。本文前提の図は低得点）
- needs_revision のスライドは xPostScore=0。

### xSelection の作り方（厳守）
- **先頭は原則 'thumbnail'**（サムネは最強フック。ただしサムネが needs_revision なら外す）。
- 残りは xPostScore の高い順にスライドを並べ、**合計4つ**になるまで選ぶ（thumbnail 含めて4）。
- **textDensity=high と needs_revision は xSelection に入れない**（記事内専用に回す）。excludedFromX に理由付きで列挙。
- 選べるものが4未満でも構わない（無理に埋めない。3枚でも2枚でもよい）。

## 出力（StructuredOutput ツールで返す。前置きの解説文は不要）
INDEPENDENT_INSPECTION_SCHEMA に従い、slides[]（全スライド）・thumbnail・xSelection・excludedFromX・overallPass を返す。
overallPass は「全スライド+サムネに needs_revision が無い」ときだけ true。
`;
}
