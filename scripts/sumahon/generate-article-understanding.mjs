// generate-article-understanding.mjs
//
// Produces the "articleUnderstanding" object that fixes WHAT a sumalabo
// article is fundamentally about, BEFORE the body prompt or thumbnail
// prompt is generated. The article prompt and the initial thumbnail
// prompt both pull from this object so the resulting body and image
// are article-aware (not template).
//
// This is the system-level fix for the "thumbnail neutralization" and
// "wall of text body" problems: every record passes through here, so
// the quality philosophy is enforced once, not per-article.
//
// Inputs:
//   articleBrief  — output of generateArticleBrief
//   source        — fetched source object (title / keyPoints / publishedAt)
//   classification— output of classify-topic
//
// Output: an object with 11 stable fields. All values are short strings
// or short arrays so the article prompt can paste them inline.
//
// Heuristic-only: no AI call. If a more sophisticated understanding is
// needed later, it can be augmented in Phase B by the台本 chat, but the
// pipeline always has these baseline fields available.

const TOPIC_KEYWORDS = [
  // category → emotion / prop / composition hints
  { match: /Tensor|Snapdragon|Apple Silicon|チップ|GPU|2nm|3nm/i, topic: "chip", props: ["チップ", "グラフ", "虫眼鏡", "AIアイコン", "バッテリー"], composition: "新チップを真ん中に置き、AI/電池/ゲームの3要素カードを周囲に配置。ひまりが性能の意味を素朴に確かめる、らぼまるが3軸をチェックリストで整理。" },
  { match: /Pixel|Tensor|Google/i, topic: "pixel", props: ["スマホ", "AIアイコン", "Googleの抽象アイコン", "比較ボード"], composition: "Pixel風スマホシルエットを中央、AIとカメラの恩恵を示すアイコンを並べる。ひまりは新機能に気づく顔、らぼまるは比較ボードで整理。" },
  { match: /iPhone|Apple|iOS/i, topic: "iphone", props: ["スマホ", "Appleっぽい抽象アイコン", "カメラ", "AIアイコン"], composition: "iPhone風スマホシルエットを中央、カメラ/AI/価格の3軸を周囲に配置。ひまりは買い替えを迷う顔、らぼまるは判断軸を提示。" },
  { match: /Xperia|Sony/i, topic: "xperia", props: ["スマホ", "カメラ", "音楽アイコン", "価格タグ"], composition: "Xperia風縦長スマホ、カメラと音の象徴アイコン。ひまりは価格に驚く顔、らぼまるはキャリア/SIMフリー比較カード。" },
  { match: /Galaxy|Samsung/i, topic: "galaxy", props: ["スマホ", "S Penっぽいアイコン", "カメラ", "比較ボード"], composition: "Galaxy風スマホシルエット、注目機能を周囲に配置。ひまりは新機能を試したい顔、らぼまるは整理役。" },
  { match: /折りたたみ|フォルダブル|Fold|Flip/i, topic: "foldable", props: ["折りたたみスマホ", "比較ボード", "注意マーク"], composition: "折りたたみスマホを大きく中央、開閉のニュアンス。ひまりは興味顔、らぼまるは耐久・価格・サイズを整理。" },
  { match: /AI|生成AI|ChatGPT|Gemini|Claude/i, topic: "ai", props: ["AIアイコン", "吹き出し", "メモカード", "グラフ"], composition: "AIアイコンを中央、できること/注意点のカードを周囲に。ひまりは驚き顔、らぼまるは使い方を整理。" },
  { match: /バッテリー|充電|電池|モバイルバッテリー/i, topic: "battery", props: ["バッテリー", "稲妻アイコン", "比較ボード"], composition: "バッテリーアイコンを中央、容量/速さ/価格を周囲に。ひまりは選び方に困る顔、らぼまるは選定軸を整理。" },
  { match: /カメラ|写真|撮影/i, topic: "camera", props: ["カメラ", "フォーカス枠", "比較ボード"], composition: "カメラレンズを中央、画質・夜景・AI処理の3軸。ひまりは仕上がりに驚く顔、らぼまるは選び方の整理。" },
  { match: /価格|値段|円|安い|高い/i, topic: "price", props: ["価格タグ", "比較ボード", "虫眼鏡"], composition: "価格タグを大きく置き、対象/期間/条件を周囲に。ひまりは価格に反応する顔、らぼまるは買う/待つを整理。" },
  { match: /SIM|キャリア|楽天|ahamo|povo/i, topic: "mobile_plan", props: ["SIMカードアイコン", "比較ボード", "メモカード"], composition: "SIMアイコンを中央、料金/通信/サポートの3軸。ひまりは迷う顔、らぼまるはプラン軸の整理。" },
  { match: /ゲーム|ゲーミング|fps|フレームレート/i, topic: "gaming", props: ["ゲームコントローラー", "グラフ", "スマホ"], composition: "コントローラーまたはスマホ画面を中央、性能/発熱/価格カード。ひまりは試したい顔、らぼまるは要件を整理。" },
];

const DEFAULT_PROPS = ["スマホ", "メモカード", "比較ボード", "虫眼鏡"];
const DEFAULT_COMPOSITION = "記事の主役を中央に大きく置き、判断軸を3要素のカードで周囲に配置する。ひまりは記事内容を読んだ後の素直な反応、らぼまるは整理役のチェックリストやグラフ。";

function detectTopic(text) {
  for (const entry of TOPIC_KEYWORDS) {
    if (entry.match.test(text)) return entry;
  }
  return null;
}

function inferToneFromTitle(title) {
  const t = (title || "").toString();
  // Concerning / negative tone markers
  if (/悲報|警告|危険|爆死|脆弱性|不具合|遅延|延期|障害|終了|終わった|サポート終了|低|遅い/.test(t)) {
    return "concern";
  }
  // Positive / news-good tone markers
  if (/朗報|刷新|新機能|発表|公開|発売|登場|向上|改善|強化|拡張|対応/.test(t)) {
    return "positive";
  }
  // Rumor / uncertain tone
  if (/噂|リーク|の可能性|か[?？]|かも|観測|報道/.test(t)) {
    return "rumor";
  }
  return "neutral";
}

function himariByTone(tone, theme) {
  switch (tone) {
    case "concern":
      return `「${theme}って、普通に使う人にも影響あるの？」と少し心配そうに確かめる顔`;
    case "positive":
      return `「${theme}、私の使い方でも嬉しい変化になりそう？」と前向きに気づく顔`;
    case "rumor":
      return `「これって確定じゃないんだ？まず何を見ればいいの？」と素直に疑問を出す顔`;
    default:
      return `「${theme}は普通の人にどう関係するの？」と素直に確かめる顔`;
  }
}

function labomaruByTone(tone, theme) {
  switch (tone) {
    case "concern":
      return `「${theme}の影響範囲・対象・対処を順番にチェックリストで整理する」`;
    case "positive":
      return `「${theme}で恩恵を受ける人・条件・注意点をカードで整理する」`;
    case "rumor":
      return `「${theme}のリーク要点・確定していない部分・確認すべきポイントを虫眼鏡で整理する」`;
    default:
      return `「${theme}を判断するための観点を、3軸のカード or 比較表で整理する」`;
  }
}

function decisionAxisByTone(tone) {
  switch (tone) {
    case "concern":
      return "影響を受ける人 / 影響を受けない人 / 対処すべき人";
    case "positive":
      return "嬉しい人 / 様子見でよい人 / 比較すべき人";
    case "rumor":
      return "今動いていい人 / 続報を待つべき人 / 他機種と比較すべき人";
    default:
      return "買う / 待つ / 様子見";
  }
}

function pickReaderQuestion(title) {
  const t = (title || "").toString();
  if (/リーク|噂|の可能性/.test(t)) return "リーク段階の情報をどう受け止めるべき？";
  if (/価格|円|高い|安い/.test(t)) return "この価格は普通の人にとって妥当？比較対象は？";
  if (/AI/.test(t)) return "AIの実用機能として、普通の人に何が変わる？";
  if (/カメラ|写真/.test(t)) return "カメラ性能の差は普通の人の写りにも出る？";
  if (/バッテリー|電池/.test(t)) return "バッテリーは1日持つ？充電速度は？";
  if (/ゲーム|fps/.test(t)) return "重いゲームでも快適に動く？";
  return "このニュースは普通の人の判断にどう影響する？";
}

function pickReaderAnxiety(tone) {
  switch (tone) {
    case "concern":
      return "今使っているスマホが影響を受けるのか / 早めに対処すべきか";
    case "positive":
      return "話題ほど嬉しい変化なのか / 待たなくていいのか";
    case "rumor":
      return "確定情報ではないため判断を急ぐべきか / 待つべきか";
    default:
      return "自分の使い方に関係するのか / 判断軸が見えていないこと";
  }
}

function pickReaderDecision(tone) {
  switch (tone) {
    case "concern":
      return "対処すべきか様子見か";
    case "positive":
      return "買い替えるか待つか";
    case "rumor":
      return "今動くか続報を待つか";
    default:
      return "買うか待つか様子見か";
  }
}

/**
 * Detect article variant (news / comparison / foundation). Comparison
 * articles are foundation-type with a slug containing "comparison" or
 * "-vs-". Used by pickVisualBlocks() to emit the right per-type recipe.
 */
function detectVariant(articleBrief) {
  const slug = (articleBrief?.slug || "").toLowerCase();
  const sumalaboUse = (articleBrief?.sumalaboUse || "").toLowerCase();
  const baseType = (articleBrief?.articleType || "foundation").toLowerCase();
  if (slug.includes("comparison") || slug.includes("-vs-") || sumalaboUse.includes("comparison")) {
    return "comparison";
  }
  if (baseType === "news") return "news";
  return "foundation";
}

/**
 * Per-type required visual block list (HUMAN-readable labels). The
 * orchestrator and the article prompt both reference these labels;
 * MDX class enforcement is in renderTypeContract() + completion gates.
 */
function pickVisualBlocks({ variant, tone, hasComplexTopic }) {
  const blocks = [
    "3行まとめ (Zone 1, summary-box)",
    "この記事で整理すること (Zone 1, check-box)",
    "先に結論 (Zone 1, summary-box)",
  ];

  if (variant === "news") {
    blocks.push("期待できること / 注意したいこと / 普通の人への影響 (Zone 2, check-box)");
    blocks.push("待つ / 待たない / 比較する (Zone 2, decision-guide-panel)");
    blocks.push("今すぐできる判断 (Zone 3, H2 + アクションリスト)");
    if (tone === "rumor") blocks.push("公式発表ではない注記 (Zone 2, info-box)");
    if (tone === "concern") blocks.push("影響を受ける人 / 受けない人カード (Zone 2, decision-guide-panel)");
  } else if (variant === "comparison") {
    blocks.push("あなたはどっち？ (Zone 1, decision-guide-grid 2-3 カード)");
    blocks.push("メイン比較表 (Zone 2, table-card)");
    blocks.push("用途別おすすめ (Zone 2, decision-guide-panel)");
    blocks.push("判断フローまたは価格帯 / 条件別カード (Zone 2)");
    blocks.push("失敗しやすい選び方 (Zone 2, info-box)");
  } else {
    // foundation (基礎解説)
    blocks.push("用語表 (Zone 2, table-card, 用語 × 意味 × 普通の人への影響)");
    blocks.push("仕組みを1段落で (Zone 2, info-box または本文)");
    blocks.push("向いている人 / 向いていない人 (Zone 2, decision-guide-panel)");
    blocks.push("次に読むべき記事 (Zone 3, H2 + 関連記事)");
    if (hasComplexTopic) blocks.push("仕組み図 (簡易) — 順序付きリストまたは図 (Zone 2)");
  }

  blocks.push("CharacterDialogue 1 回以上 (Zone 2 末尾, ひまり・らぼまるの反応)");
  blocks.push("参考情報 (Zone 3, H2)");
  return blocks;
}

/**
 * Generate the articleUnderstanding object.
 *
 * @param {object} params
 * @param {object} params.articleBrief - output of generateArticleBrief
 * @param {object} params.source       - fetched source object
 * @param {object} [params.classification] - output of classify-topic (optional)
 * @returns {object} understanding
 */
export function generateArticleUnderstanding({ articleBrief, source, classification } = {}) {
  if (!articleBrief) {
    throw new Error("generateArticleUnderstanding: articleBrief is required");
  }
  const title = (articleBrief.articleTitle || articleBrief.sourceTitle || source?.title || "").toString();
  const sourceTitle = (articleBrief.sourceTitle || source?.title || title).toString();
  const coreAngle = (articleBrief.coreAngle || "").toString();

  // Detect article theme from title + classification topic.
  const theme = (articleBrief.topicCategory && articleBrief.topicCategory !== "general")
    ? articleBrief.topicCategory
    : sourceTitle.replace(/[\[【].+?[\]】]/g, "").trim().slice(0, 30);

  // Detect topic keyword to choose props / composition.
  const text = `${title} ${sourceTitle} ${coreAngle}`;
  const topic = detectTopic(text);
  const props = topic ? topic.props : DEFAULT_PROPS;
  const compositionIdea = topic ? topic.composition : DEFAULT_COMPOSITION;

  // Detect tone (concern / positive / rumor / neutral).
  const tone = inferToneFromTitle(sourceTitle);
  const hasComplexTopic = /チップ|GPU|2nm|3nm|AI|アーキテクチャ|プロセス/.test(text);
  // Detect article variant (news / comparison / foundation).
  const variant = detectVariant(articleBrief);

  return {
    slug: articleBrief.slug,
    articleVariant: variant,
    articleTheme: theme,
    readerQuestion: pickReaderQuestion(sourceTitle),
    readerAnxiety: pickReaderAnxiety(tone),
    readerDecisionPoint: pickReaderDecision(tone),
    whatChangesForNormalUsers: coreAngle || `${theme}は普通の人の使い方にどう影響するか`,
    buyWaitOrWatch: decisionAxisByTone(tone),
    himariReaction: himariByTone(tone, theme),
    labomaruRole: labomaruByTone(tone, theme),
    thumbnailProps: props,
    thumbnailCompositionIdea: compositionIdea,
    visualExplainBlocksNeeded: pickVisualBlocks({ variant, tone, hasComplexTopic }),
    // Diagnostic / non-instructive fields. Useful for debugging the
    // heuristic; the article prompt does not need to display these.
    _meta: {
      tone,
      variant,
      detectedTopic: topic ? topic.topic : null,
      hasComplexTopic,
      generatedAt: new Date().toISOString(),
    },
  };
}
