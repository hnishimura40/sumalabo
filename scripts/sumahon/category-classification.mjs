export const HANDS_ON_CATEGORY = Object.freeze({
  name: "やってみた・検証",
  slug: "hands-on",
});

const HANDS_ON_SIGNALS = [
  "当サイトの実体験",
  "当サイトの運用",
  "本サイトの運用",
  "実際に使って",
  "実際に試して",
  "使ってみた",
  "試してみた",
  "体験ベース",
  "運用実例",
  "実機で検証",
  "乗り換えた運用者",
];

export function classifyArticleCategory(input = "") {
  const text = String(input);
  return HANDS_ON_SIGNALS.some((signal) => text.includes(signal))
    ? HANDS_ON_CATEGORY
    : { name: "ニュースをかみくだく", slug: "news" };
}
