export const categories = [
  {
    name: "ニュースをかみくだく",
    slug: "news",
    description: "AI・スマホ・ガジェットのニュースを、普通の人にもわかるように整理します。",
  },
  {
    name: "やってみた・検証",
    slug: "hands-on",
    description: "実際に使って・試して分かったことを、体験ベースで整理します",
  },
  {
    name: "スマホの選び方",
    slug: "smartphone",
    description: "iPhone、Android、中古スマホなど、買い替えや選び方で迷いやすいポイントを整理します。",
  },
  {
    name: "通信費を下げる",
    slug: "mobile-plan",
    description: "格安SIM、eSIM、乗り換えなど、通信費を下げるための考え方を整理します。",
  },
  {
    name: "周辺機器・ガジェット",
    slug: "gadgets",
    description: "USB-C充電器、モバイルバッテリー、周辺機器の選び方を整理します。",
  },
] as const;

export type CategoryName = (typeof categories)[number]["name"];
export type CategorySlug = (typeof categories)[number]["slug"];

export function getCategoryByName(name: string) {
  return categories.find((category) => category.name === name);
}

export function getCategoryBySlug(slug: string) {
  return categories.find((category) => category.slug === slug);
}
