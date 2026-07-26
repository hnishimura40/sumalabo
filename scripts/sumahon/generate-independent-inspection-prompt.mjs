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

import { formalProductNamesChecklist } from "./formal-product-names.mjs";

/**
 * 独立検品エージェントに渡す構造化出力スキーマ（StructuredOutput 用）。
 * xSelection は「X 直接投稿に載せる画像の並び」。先頭は原則サムネ。
 */
export const INDEPENDENT_INSPECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["overallPass", "slides", "thumbnail", "xSelection", "excludedFromX", "internalLinks", "avatarFallback"],
  properties: {
    overallPass: { type: "boolean", description: "全スライド+サムネに needs_revision が無ければ true（internalLinks は画像とは独立。needs_revision でも overallPass は下げず、本文リンクの削除/修正で対応する）" },
    internalLinks: {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "issues"],
      description: "本文中の収益記事(/articles/power-bank-comparison/ 等)への内部リンクが文脈的に自然か（B: 内部導線）。リンクが無ければ verdict='not_applicable'。",
      properties: {
        verdict: { type: "string", enum: ["ok", "ok_with_warning", "needs_revision", "not_applicable"] },
        issues: {
          type: "array",
          items: { type: "string" },
          description: "無理な挿入・唐突・宣伝臭・トピック不一致・本数過多(1本超)を1行ずつ。無ければ空配列",
        },
      },
    },
    avatarFallback: {
      type: "object",
      additionalProperties: false,
      required: ["verdict", "issues"],
      description:
        "本文の <CharacterBubble> の丸アバターが画像ではなく「ひ」「ら」の文字フォールバックになっていないか。" +
        "mood は himari: curious/aha/explain、labo: smile/point/worried のみ有効で、" +
        "それ以外や mood 省略は文字丸になる（実際にひまりのアバターが欠落した事故がある）。" +
        "MDX を読んで無効な mood を見つけたら needs_revision。CharacterBubble が無ければ 'not_applicable'。",
      properties: {
        verdict: { type: "string", enum: ["ok", "ok_with_warning", "needs_revision", "not_applicable"] },
        issues: {
          type: "array",
          items: { type: "string" },
          description: "無効な mood を『speaker/mood（該当行の要約）』の形で1行ずつ。無ければ空配列",
        },
      },
    },
    slides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "verdict", "issues", "handChecks", "textDensity", "numbersAccurate", "standsAlone", "xPostScore"],
        properties: {
          id: { type: "string", description: "スライドID（例 slide06-alternatives）" },
          verdict: { type: "string", enum: ["ok", "ok_with_warning", "needs_revision"] },
          issues: { type: "array", items: { type: "string" }, description: "問題点を1行ずつ。無ければ空配列" },
          handChecks: {
            type: "array",
            description: "画像で見える手を1つずつ回答する。手が見えなければ空配列。",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["character", "side", "bbox", "orientationNatural", "thumbPositionNatural", "wristConnectionNatural", "proportionsNatural", "severity", "note"],
              properties: {
                character: { type: "string", enum: ["himari", "labomaru"] },
                side: { type: "string", enum: ["left", "right", "unclear"] },
                bbox: {
                  type: "object",
                  additionalProperties: false,
                  required: ["x", "y", "width", "height"],
                  description: "手と手首の接続部を囲む正規化座標。画像左上を(0,0)、右下を(1000,1000)とし、前腕を少し含める。",
                  properties: {
                    x: { type: "integer", minimum: 0, maximum: 999 },
                    y: { type: "integer", minimum: 0, maximum: 999 },
                    width: { type: "integer", minimum: 1, maximum: 1000 },
                    height: { type: "integer", minimum: 1, maximum: 1000 },
                  },
                },
                orientationNatural: { type: "boolean", description: "左手/右手として自然な向きか" },
                thumbPositionNatural: { type: "boolean", description: "親指が手の向きと体側に対して自然な側か" },
                wristConnectionNatural: { type: "boolean", description: "手首と前腕の接続にねじれ・継ぎ足し・融合がないか" },
                proportionsNatural: { type: "boolean", description: "指の長さ・太さ、特に親指の比率が自然か" },
                severity: { type: "string", enum: ["ok", "warning", "needs_revision"] },
                note: { type: "string", description: "根拠を短く。問題なしでも向き・接続・比率を確認した旨を書く" },
              },
            },
          },
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
      required: ["verdict", "issues", "handChecks"],
      properties: {
        verdict: { type: "string", enum: ["ok", "ok_with_warning", "needs_revision"] },
        issues: { type: "array", items: { type: "string" } },
        handChecks: {
          type: "array",
          description: "サムネで見える手を1つずつ、slides[].handChecks と同じ項目（bboxを含む）で回答する。手が見えなければ空配列。",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["character", "side", "bbox", "orientationNatural", "thumbPositionNatural", "wristConnectionNatural", "proportionsNatural", "severity", "note"],
            properties: {
              character: { type: "string", enum: ["himari", "labomaru"] },
              side: { type: "string", enum: ["left", "right", "unclear"] },
              bbox: {
                type: "object",
                additionalProperties: false,
                required: ["x", "y", "width", "height"],
                properties: {
                  x: { type: "integer", minimum: 0, maximum: 999 },
                  y: { type: "integer", minimum: 0, maximum: 999 },
                  width: { type: "integer", minimum: 1, maximum: 1000 },
                  height: { type: "integer", minimum: 1, maximum: 1000 },
                },
              },
              orientationNatural: { type: "boolean" },
              thumbPositionNatural: { type: "boolean" },
              wristConnectionNatural: { type: "boolean" },
              proportionsNatural: { type: "boolean" },
              severity: { type: "string", enum: ["ok", "warning", "needs_revision"] },
              note: { type: "string" },
            },
          },
        },
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
  const formalNames = formalProductNamesChecklist();
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

## (A) factcheck 14 項目（各画像で判定）
固有名詞の正式表記: ${formalNames}。旧称・表記ゆれは needs_revision とし、
data/qa/formal-product-names.json を正本として照合する。

1. 事実誤認の有無（画像内記述が最終稿と矛盾しない）
2. 報道/噂段階の明示（未確定を確定と言い切っていない）
3. 比較軸のズレがない
4. タイトルと中身の一致
5. 文字量（大見出し≤2・補助≤2・各要素1〜2行）
6. 見出し/要点/図の関係が整理されている
7. ひまり・らぼまるが記事内容に即している
8. 置物化していない
9. 道具の使い方に意味がある
10. **キャラの視覚的破綻（認識アンカー一致）** — ひまり=金髪サイドテール+水色/ティールのリボン・青い瞳・正本の顔立ち/頭身 / らぼまる=白い卵型ボディ+黄緑アンテナ+黒い丸い目+胸のオレンジのハートボタン+青い首輪バンド+左右の青い耳ビレ+正本の体型。逸脱・別人化・途中変化は needs_revision（blocking）。**耳ビレが正本より短い・丸い傾向だけなら warning として監視し、別キャラ化していなければ pass のまま**。**同一性の判定はこれらの認識アンカーだけに限る。衣装・小道具・ポーズ・背景が正本や別画像と違うこと自体は破綻ではなく、fallback/needs_revision の理由にしない**
11. **身体構造破綻（公開ブロック・最重要）** — 各キャラの四肢を実際に数える。**手が描かれている画像は、見える手を1つずつ handChecks に列挙し、(a)左手/右手として自然な向きか、親指が手の向きと体側に対して自然な側か、(b)手首と腕の接続にねじれ・継ぎ足し・融合がないか、(c)指の長さ・太さ、とくに親指の比率が自然かを必ず個別回答する**。全体を眺めて一括で「手は正常」と答えてはならない。明確な左右不整合・親指位置の矛盾・接続異常は needs_revision（blocking）。指の比率だけの違和感は ok_with_warning とし、issues に画像ID・手の左右・違和感を明記してHiro判断へ回す。ひまりは腕2本・手2つ・脚2本（見える手は原則各5本指）。らぼまるは腕・手・脚・足が左右各1つで、腕以外の突起は黄緑アンテナ1本と左右の青い耳ビレだけ。らぼまるの腕は正本同様に短く・太く・丸いこと。細長い触手状・ホース状・急なS字・にょきっと伸びる腕、腕や脚の不自然な長さ/細さ、破綻した付け根や関節、不快なシルエット、手指/腕の本数過多・重複、体から生える謎の手、小道具を持つ独立した手、顔の破綻、身体と物体の不自然な融合は needs_revision。単に体や画面外に隠れて見えない四肢は、それだけで欠損扱いしない。
12. **文字化け・レイアウト破綻** — 日本語の文字化け・意味を成さない誤字（助詞欠落「目的ことで」等）・見切れ・重なり・枠崩れは needs_revision。**漢字の類似化け（例「目的→自的」目→自・未→末・微→徴 等。docs/kanji_pitfalls.md 参照）を重点確認**
13. **表情・トーンが記事の性質と矛盾しない** — 終了/障害/リコール等の注意・速報系は「驚き＋対処」がOK。ニコニコ/ムスッ・無表情/炎・涙・パニックは needs_revision。**朗報・喜び爆発系（継続決定「残る/使い続けられる」・無料化・復活・値下げ等、読者が確実に得する確定ニュース）は、キャラが万歳/ジャンプ/ガッツポーズ＋満面の笑みで喜びきっているのが正。案内板・分岐図（矢印→）・比較表・無表情の説明構図・控えめな指さし案内で読者の歓喜を代弁できていなければ warning（改善指摘・公開は止めない）**
14. **演出が記事テーマと合っているか（warning観察）** — slide_plan の演出ブロックと照合し、衣装・小道具・ポーズ・背景が記事テーマを体験として伝えているか確認する。サムネが標準衣装の棒立ち・汎用背景・指さし説明だけ、または小道具を持つだけで使っていない場合は ok_with_warning とし、issues に不足した演出を具体的に書く。本文スライドも、比較・検証・操作などの役割が動作に出ていなければ warning。**表情が記事の感情トーンから乖離している場合も warning 以上で記録する。演出が弱いだけなら needs_revision/overallPass=false にしない**（事実誤認・アンカー不一致・過剰表現は別項目で判定）。

**二段検品用座標**: handChecks の各手には、手だけでなく手首と前腕の接続部を含む bbox を必ず付ける。座標は画像左上を (0,0)、右下を (1000,1000) とした正規化整数で記録する。

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

## (D) 本文の内部導線リンクの自然さ（B: 収益記事への文脈リンク）
最終稿(final_article)本文に、収益記事への内部リンク（\`/articles/power-bank-comparison/\`・\`/articles/usb-c-charger-comparison/\`・\`/articles/power-bank-recall-check/\`）が入っている場合、次を白紙の目で判定して internalLinks に返す:
- **文脈的に自然か**（そのリンク先トピックに本文が実際に触れている流れで置かれているか）。
- **無理な挿入・唐突・宣伝臭がないか**（関係の薄い所へ差し込んでいないか、「〜はこちら」の押し売りでないか）。
- **本数は1本までか**（2本以上入っていれば needs_revision）。記事末尾の関連ガイドカードは自動表示なので本文リンクとの重複も指摘。
- リンクが1本も無ければ verdict='not_applicable'（無いこと自体は問題ではない）。
- **needs_revision の直し方は画像再生成ではなく「本文MDXの該当リンクを削除/修正」**。この項目は overallPass を下げない（画像とは独立）。

## (E) 本文の丸アバターが文字フォールバックになっていないか
記事 MDX の \`<CharacterBubble speaker="..." mood="...">\` を全部拾い、**画像が出る mood になっているか**を判定して avatarFallback に返す:
- 有効な mood は **himari: curious / aha / explain**、**labo: smile / point / worried** の 6 つだけ。
- これ以外の mood、または **mood の省略**は、顔画像ではなく「ひ」「ら」の**文字だけの丸**にフォールバックする（実際にひまりのアバターが欠落した事故がある）。
- 無効な mood を 1 つでも見つけたら **needs_revision**（issues に \`speaker/mood（該当セリフの要約）\` を1行ずつ）。
- 互換エイリアスとして himari の \`worried→curious\` / \`smile→aha\` / \`serious→explain\` は画像に解決されるので ok。
- \`<CharacterBubble>\` が 1 つも無ければ verdict='not_applicable'。
- **直し方は画像再生成ではなく「本文MDXの mood を有効な値に修正」**。この項目は overallPass を下げない（画像とは独立）。

## 出力（StructuredOutput ツールで返す。前置きの解説文は不要）
INDEPENDENT_INSPECTION_SCHEMA に従い、slides[]（全スライド）・thumbnail・xSelection・excludedFromX・internalLinks・avatarFallback・overallPass を返す。slides[] と thumbnail の handChecks は、見える手ごとの必須回答であり省略禁止。
overallPass は「全スライド+サムネに needs_revision が無い」ときだけ true（internalLinks・avatarFallback は overallPass に影響させない）。
`;
}
