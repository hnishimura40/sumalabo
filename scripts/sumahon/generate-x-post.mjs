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
const MAX_TWEET_LEN = 280; // 非Premium上限（X加重カウント。CJKは1文字=2）
const SAFE_MARGIN = 4; // 端数余白（加重換算後）

// ---- X 加重文字数（2026-07-05 追加・非Premium 280 ガード） ----
// 背景: 従来は String.length（コードユニット数）で判定していたため、日本語主体の
// 投稿文（例: 317 文字）が「280 以内」と誤判定され、投稿画面で超過→手動短縮になった。
// X の実カウントは twitter-text v3 の加重方式: 以下の範囲は weight 1、それ以外
// （CJK・かな・絵文字など）は weight 2。URL は長さによらず 23。
const WEIGHT1_RANGES = [
  [0, 4351], // Latin, ギリシャ, キリル等
  [8192, 8205], // 一般句読点の一部
  [8208, 8223], // ハイフン・引用符類
  [8242, 8247], // プライム記号類
];

function charWeight(cp) {
  for (const [lo, hi] of WEIGHT1_RANGES) {
    if (cp >= lo && cp <= hi) return 1;
  }
  return 2;
}

/** X の加重文字数を返す（URL は 23 固定換算） */
export function weightedTweetLength(text) {
  let total = 0;
  const withoutUrls = String(text).replace(/https?:\/\/\S+/g, () => {
    total += URL_PLACEHOLDER_LEN;
    return "";
  });
  for (const ch of withoutUrls) {
    total += charWeight(ch.codePointAt(0));
  }
  return total;
}

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
  // 上限2個（2026-07-05 変更・現行3〜4個から削減）。#すまラボ は必ず含める。
  // 話題タグは最も関連の強い1個だけ残す（タグ過多はリーチを下げるため）。
  const topical = Array.from(picked).filter((t) => t !== "#すまラボ");
  const first = topical[0] || "#ガジェット";
  return [first, "#すまラボ"];
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

function buildArticleUrl({ slug, productionUrl }) {
  const base = String(productionUrl || "https://sumalabo.com").replace(/\/+$/, "");
  return `${base}/articles/${slug}/`;
}

/** description の先頭 1〜2 文だけを取り出す（文単位・途中で切らない） */
function leadingSentences(text, count = 1) {
  const sentences = String(text)
    .split(/(?<=[。．！!？?])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.slice(0, count).join("");
}

// 280 加重ガード: 途中カット（slice + …）はしない。長い本文候補から順に
// 「そのまま入るか」を加重換算で試し、最初に収まった候補を採用する
// （= 超過時は自動短縮ではなく、より短い構成での生成し直し）。
// articleUrl が空文字なら本投稿に URL 行を入れない（画像投稿＋リンクはリプライ運用）。
function compose({ lead, body, hashtags, articleUrl, isReporting }) {
  const hashtagStr = hashtags.join(" ");
  const withUrl = (text) => (articleUrl ? `${text}\n${articleUrl}\n${hashtagStr}` : `${text}\n${hashtagStr}`);
  const bodyCandidates = [
    body, // 1. フル
    leadingSentences(body, 2), // 2. 先頭2文
    leadingSentences(body, 1), // 3. 先頭1文
    ensureHedge("要点と注意点をやさしく整理しました。", isReporting), // 4. 定型フック
    "", // 5. lead のみ
  ];
  let picked = null;
  let downshifted = false;
  for (const candidate of bodyCandidates) {
    const text = candidate ? `${lead}\n\n${candidate}`.trim() : lead.trim();
    const post = withUrl(text);
    if (weightedTweetLength(post) <= MAX_TWEET_LEN - SAFE_MARGIN) {
      picked = post;
      break;
    }
    downshifted = true;
  }
  if (!picked) {
    // lead 単体でも収まらない（タイトルが極端に長い）: 読点区切りの先頭句で組み直す
    const shortLead = lead.split(/[、,]/)[0].trim();
    picked = withUrl(shortLead);
    downshifted = true;
  }
  const weighted = weightedTweetLength(picked);
  return {
    post: picked,
    truncated: false, // 途中カットはしない設計（downshifted が構成変更の有無を示す）
    downshifted,
    charCount: picked.length,
    weightedLength: weighted,
    fitsLimit: weighted <= MAX_TWEET_LEN,
  };
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
  linkInReply = false,
} = {}) {
  if (!slug) throw new Error("generateXPost: slug is required");

  const articleUrl = buildArticleUrl({ slug, productionUrl });
  // linkInReply: 記事リンクを本投稿から外し、リプライに置く（画像投稿でインプレを伸ばす運用）。
  // 本投稿の compose には URL 無し（空文字）を渡す。ハッシュタグは本投稿に残す。
  const mainUrl = linkInReply ? "" : articleUrl;
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
  const primaryBodyRaw = cleanDescription || `${cleanTitle}を、やさしく整理しました。`;
  const primaryBody = ensureHedge(primaryBodyRaw, isReporting);
  const primaryRes = compose({ lead: primaryLead, body: primaryBody, hashtags, articleUrl: mainUrl, isReporting });

  // === Alt1: 結論先出し型 ===
  const altConclusion = articleBrief?.coreAngle
    ? sanitizeText(articleBrief.coreAngle)
    : `結論: ${cleanTitle.replace(/。$/, "")}`;
  const alt1Lead = altConclusion.slice(0, 60);
  const alt1Body = ensureHedge(cleanDescription || `要点をやさしく整理しました。`, isReporting);
  const alt1Res = compose({ lead: alt1Lead, body: alt1Body, hashtags, articleUrl: mainUrl, isReporting });

  // === Alt2: 問いかけ型 ===
  const alt2Lead = isReporting
    ? `${cleanTitle.split(/[、,]/)[0]}という噂、本当のところは？`
    : `${cleanTitle.split(/[、,]/)[0]}、どう変わる？`;
  const alt2Body = ensureHedge(cleanDescription || `要点と注意点をやさしく整理しました。`, isReporting);
  const alt2Res = compose({ lead: alt2Lead, body: alt2Body, hashtags, articleUrl: mainUrl, isReporting });

  // === ガード: BAN ワードや すまほん表記が万が一残っていないか最終確認 ===
  const finalBanCheck = (text) => BAN_WORDS.some((w) => text.includes(w));
  const finalSumahonCheck = (text) => /smhn\.info|すまほん/i.test(text);

  if (finalBanCheck(primaryRes.post)) warnings.push("primary に煽り NG ワードが残存しました（要確認）");
  if (finalSumahonCheck(primaryRes.post)) warnings.push("primary にすまほん表記が混入しました（要修正）");
  if (!primaryRes.fitsLimit) warnings.push(`primary が加重280字を超過しています（weighted=${primaryRes.weightedLength}。要修正）`);
  if (primaryRes.downshifted) warnings.push("primary は280字ガードにより短い構成で生成し直しました（description全文は不使用）");

  // linkInReply 運用時の返信（記事リンク）。本投稿の直後にぶら下げる。
  // 「すまラボ」を明示的に名乗る（2026-07-25 指名検索対策）。Search Console 実測で
  // 指名クエリ（すまラボ / sumalabo）の表示回数が 0＝そもそも検索されていない状態だった。
  // 指名検索は SEO では作れず、露出のたびにブランド名を出して覚えてもらうしかないため、
  // リンクを載せるリプライで必ずサイト名を名乗る。本投稿側は #すまラボ が必ず入る。
  const reply = linkInReply
    ? { text: `続きと出典は すまラボ の記事で👇\n${articleUrl}`, articleUrl }
    : null;

  return {
    slug,
    articleUrl,
    isReporting,
    linkInReply,
    reply,
    attachThumbnail: Boolean(thumbnail),
    thumbnailPath: thumbnail || null,
    hashtags,
    primary: {
      text: primaryRes.post,
      charCount: primaryRes.charCount,
      weightedLength: primaryRes.weightedLength,
      fitsLimit: primaryRes.fitsLimit,
      downshifted: primaryRes.downshifted,
      truncated: primaryRes.truncated,
    },
    alternates: [
      { label: "結論先出し", text: alt1Res.post, charCount: alt1Res.charCount, weightedLength: alt1Res.weightedLength, fitsLimit: alt1Res.fitsLimit, downshifted: alt1Res.downshifted, truncated: alt1Res.truncated },
      { label: "問いかけ", text: alt2Res.post, charCount: alt2Res.charCount, weightedLength: alt2Res.weightedLength, fitsLimit: alt2Res.fitsLimit, downshifted: alt2Res.downshifted, truncated: alt2Res.truncated },
    ],
    warnings,
    generatedAt: new Date().toISOString(),
  };
}
