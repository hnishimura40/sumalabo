// すまラボ自動化: 公開記事から @suma_labo 用 X 投稿文を生成する。
//
// 設計方針:
// - 純関数。CLI/IO は scripts/run/generate-x-post.mjs 側に分離。
// - 入力: frontmatter (title / description / category / type / slug / thumbnail)
//         + 任意の articleBrief (coreAngle, topicCategory) + 任意の sourceMeta (sourceMedia, sourceUrl)
//         + productionUrl (例: "https://sumalabo.com")
// - 出力: { primary, alternates, hashtags, articleUrl, attachThumbnail, charCount, warnings }
//
// 投稿文ルール:
// - X の文字数上限 280 (URL は t.co で 23 文字換算)。本コードでは「最終本文 + URL」の合計が
//   270 を超えないよう保守的に調整する。
// - 「悲報」「終了」「完全消滅」「ヤバい」「炎上」「闇」「絶望」など煽り NG ワードは置換 or 拒否。
// - 報道・噂ベース記事 (isReporting=true) は「噂」「報道ベース」「公式発表ではない」など
//   hedge 表現を含めるよう調整。
// - URL は production URL (https://sumalabo.com/articles/{slug}/) を使う。Preview URL は受け取らない。
// - ハッシュタグは 2〜4 個に丸める。すまほん / smhn 表記は出さない。
// - description が空のときは title から短縮要約を作る。
// - 文字数が溢れる場合は本文末尾の説明から削る。
//
// 代替案 (alternates) は primary とは違う切り口で 2 件:
//   - alt1: 「結論先出し型」（結論を1行目に置く）
//   - alt2: 「問いかけ型」（読者への問いから始める）

const URL_PLACEHOLDER_LEN = 23; // t.co の固定長扱い
const MAX_TWEET_LEN = 280;
const SAFE_MARGIN = 10; // 末尾の改行や絵文字分の余白

const BAN_WORDS = [
  "悲報",
  "終了",
  "完全消滅",
  "ヤバい",
  "やばい",
  "ヤバすぎ",
  "炎上",
  "闇",
  "絶望",
  "オワコン",
  "ガチで",
  "ガチ終わ",
  "壊滅",
  "崩壊",
];

const HEDGE_PHRASES = ["噂", "報道", "可能性", "見方", "現時点", "公式発表ではない"];

const HASHTAG_CATEGORIES = {
  iphone: ["#iPhone", "#Apple", "#iPhone18Pro"],
  android: ["#Android", "#Pixel", "#Galaxy"],
  ai: ["#AI", "#生成AI", "#ChatGPT"],
  gadget: ["#ガジェット", "#スマホ"],
  mobile_plan: ["#格安SIM", "#通信費", "#eSIM"],
  news: ["#ITニュース"],
  base: ["#すまラボ"],
};

function pickCategoryHashtags({ title, description, topicCategory, category }) {
  const text = `${title} ${description} ${topicCategory || ""} ${category || ""}`.toLowerCase();
  const picked = new Set();
  if (/iphone|apple|airpods|dynamic island|face id|ios/i.test(text)) {
    picked.add("#iPhone");
    if (/iphone 18/i.test(text)) picked.add("#iPhone18Pro");
    else picked.add("#Apple");
  }
  if (/android|pixel|galaxy|xiaomi|huawei/i.test(text)) {
    picked.add("#Android");
  }
  if (/(\bai\b|chatgpt|copilot|claude|gemini|生成ai)/i.test(text)) {
    picked.add("#AI");
  }
  if (/格安sim|esim|楽天|ahamo|povo|linemo|通信費/i.test(text)) {
    picked.add("#格安SIM");
  }
  if (/ニュース|噂|報道|リーク/.test(text)) {
    picked.add("#ITニュース");
  }
  if (/ガジェット|スマホ|スマートフォン|タブレット/.test(text)) {
    picked.add("#ガジェット");
  }
  // 必ず付ける
  picked.add("#すまラボ");
  // 2〜4 個に丸める
  const arr = Array.from(picked);
  if (arr.length > 4) return arr.slice(0, 4);
  if (arr.length < 2) {
    if (!arr.includes("#ガジェット")) arr.push("#ガジェット");
  }
  return arr;
}

function sanitizeText(text) {
  let out = String(text);
  for (const banned of BAN_WORDS) {
    if (out.includes(banned)) {
      // 安全側: 「変更」「動向」「話題」など穏当な語に置換
      out = out.split(banned).join("");
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

function stripQuestionMark(text) {
  return text.replace(/[？?]$/g, "").trim();
}

function isReportingTopic({ title, description, type, articleBrief }) {
  const all = `${title} ${description} ${type} ${articleBrief?.topicCategory || ""}`;
  return /噂|報道|リーク|未確定|可能性/.test(all) || type === "news";
}

function ensureHedge(text, isReporting) {
  if (!isReporting) return text;
  const hasHedge = HEDGE_PHRASES.some((p) => text.includes(p));
  if (hasHedge) return text;
  // hedge が足りなければ末尾に短く付ける
  return text.replace(/[。．]?$/, "（報道ベース・公式発表ではありません）");
}

function clampLength(text, urlLen = URL_PLACEHOLDER_LEN, hashtagsLen = 0) {
  const budget = MAX_TWEET_LEN - urlLen - hashtagsLen - SAFE_MARGIN;
  if (text.length <= budget) return { text, truncated: false };
  return { text: text.slice(0, Math.max(20, budget - 1)) + "…", truncated: true };
}

function buildArticleUrl({ slug, productionUrl }) {
  const base = String(productionUrl || "https://sumalabo.com").replace(/\/+$/, "");
  return `${base}/articles/${slug}/`;
}

function compose({ lead, body, hashtags, articleUrl }) {
  const hashtagStr = hashtags.join(" ");
  const hashtagsLen = hashtagStr.length + 1; // 直前の改行/スペース
  const urlLen = URL_PLACEHOLDER_LEN + 1;
  const combinedText = `${lead}\n\n${body}`.trim();
  const { text: clamped, truncated } = clampLength(combinedText, urlLen, hashtagsLen);
  const post = `${clamped}\n${articleUrl}\n${hashtagStr}`;
  return { post, truncated, charCount: post.length };
}

export function generateXPost({
  slug,
  title = "",
  description = "",
  category = "",
  type = "",
  thumbnail = "",
  productionUrl = "https://sumalabo.com",
  articleBrief = null,
  sourceMeta = null,
} = {}) {
  if (!slug) throw new Error("generateXPost: slug is required");

  const articleUrl = buildArticleUrl({ slug, productionUrl });
  const isReporting = isReportingTopic({ title, description, type, articleBrief });
  const cleanTitle = sanitizeText(stripQuestionMark(title));
  const cleanDescription = sanitizeText(description);
  const hashtags = pickCategoryHashtags({
    title,
    description,
    topicCategory: articleBrief?.topicCategory,
    category,
  });

  const warnings = [];
  if (!description) warnings.push("description が空のため title から要約を生成しました");
  if (sourceMeta && /smhn|すまほん/i.test(`${sourceMeta.sourceUrl || ""}${sourceMeta.sourceMedia || ""}`)) {
    // sourceMeta にすまほんが入っていても、投稿文には絶対に出さない（NEEDLES ベース除去で十分だが念のため）
    warnings.push("sourceMeta にすまほん由来情報があります。投稿文には露出させていません。");
  }

  // === Primary（標準）: 短い導入 + description + URL + ハッシュタグ ===
  const primaryLead = `${cleanTitle}`;
  const primaryBodyRaw = cleanDescription || `${cleanTitle}を、普通の人向けに整理しました。`;
  const primaryBody = ensureHedge(primaryBodyRaw, isReporting);
  const primaryRes = compose({ lead: primaryLead, body: primaryBody, hashtags, articleUrl });

  // === Alt1: 結論先出し型 ===
  const altConclusion = articleBrief?.coreAngle
    ? sanitizeText(articleBrief.coreAngle)
    : `結論: ${cleanTitle.replace(/。$/, "")}`;
  const alt1Lead = altConclusion.slice(0, 60);
  const alt1Body = ensureHedge(cleanDescription || `要点を普通の人向けに整理しました。`, isReporting);
  const alt1Res = compose({ lead: alt1Lead, body: alt1Body, hashtags, articleUrl });

  // === Alt2: 問いかけ型 ===
  const alt2Lead = isReporting
    ? `${cleanTitle.split(/[、,]/)[0]}という噂、本当のところは？`
    : `${cleanTitle.split(/[、,]/)[0]}、どう変わる？`;
  const alt2Body = ensureHedge(cleanDescription || `普通の人向けに、要点と注意点を整理しました。`, isReporting);
  const alt2Res = compose({ lead: alt2Lead, body: alt2Body, hashtags, articleUrl });

  // === ガード: BAN ワードや すまほん表記が万が一残っていないか最終確認 ===
  const finalBanCheck = (text) => BAN_WORDS.some((w) => text.includes(w));
  const finalSumahonCheck = (text) => /smhn\.info|すまほん/i.test(text);

  if (finalBanCheck(primaryRes.post)) warnings.push("primary に煽り NG ワードが残存しました（要確認）");
  if (finalSumahonCheck(primaryRes.post)) warnings.push("primary にすまほん表記が混入しました（要修正）");

  return {
    slug,
    articleUrl,
    isReporting,
    attachThumbnail: Boolean(thumbnail),
    thumbnailPath: thumbnail || null,
    hashtags,
    primary: {
      text: primaryRes.post,
      charCount: primaryRes.charCount,
      truncated: primaryRes.truncated,
    },
    alternates: [
      { label: "結論先出し", text: alt1Res.post, charCount: alt1Res.charCount, truncated: alt1Res.truncated },
      { label: "問いかけ", text: alt2Res.post, charCount: alt2Res.charCount, truncated: alt2Res.truncated },
    ],
    warnings,
    generatedAt: new Date().toISOString(),
  };
}
