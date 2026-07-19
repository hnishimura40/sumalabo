// D: 一覧面「定番ガイド」差し込み用のヘルパー。
// listStaple:true の収益記事を、実記事データ(サムネ・更新日)で肉付けし、
// 記事一覧に N 件ごとに 1 枚差し込むための配列を作る。
import type { CollectionEntry } from "astro:content";
import { getListStapleTargets, relatedGuideSettings } from "./related-guides";

export interface StapleCard {
  slug: string;
  label: string;
  blurb: string;
  thumbnail: string;
  thumbnailAlt: string;
  updated: string;
}

export const listInsertEveryN = relatedGuideSettings.listInsertEveryN;
export const listLabel = relatedGuideSettings.listLabel;

/** listStaple な導線先を実記事データで肉付け（実在しない slug は除外）。 */
export function buildStapleCards(all: CollectionEntry<"articles">[]): StapleCard[] {
  return getListStapleTargets()
    .map((t) => {
      const entry = all.find((a) => a.data.slug === t.slug);
      if (!entry) return null;
      return {
        slug: t.slug,
        label: t.label,
        blurb: t.blurb,
        thumbnail: entry.data.thumbnail || "",
        thumbnailAlt: entry.data.thumbnailAlt || t.label,
        updated: entry.data.updated,
      } satisfies StapleCard;
    })
    .filter((c): c is StapleCard => c !== null);
}

export type ListItem<T> =
  | { kind: "article"; entry: T }
  | { kind: "staple"; card: StapleCard };

/**
 * 記事配列に定番ガイドカードを everyN 件ごとに 1 枚差し込む。
 * staple はローテーションし、連続で同じカードが出ないようにする。
 * 末尾ちょうどで区切れた場合は末尾に staple を足さない（余剰カード防止）。
 * maxInserts で総差し込み数を上限化し、長い一覧で同じ収益記事が何度も出る事態を避ける
 * （既定＝staple 種類数。各定番ガイドは 1 覧につき最大 1 回だけ差し込む）。
 */
export function interleaveStaples<T>(
  articles: T[],
  staples: StapleCard[],
  everyN: number = listInsertEveryN,
  maxInserts: number = staples.length,
): ListItem<T>[] {
  if (!staples.length || everyN <= 0 || maxInserts <= 0) {
    return articles.map((entry) => ({ kind: "article", entry }));
  }
  const out: ListItem<T>[] = [];
  let inserted = 0;
  articles.forEach((entry, i) => {
    out.push({ kind: "article", entry });
    const isBoundary = (i + 1) % everyN === 0;
    const isLast = i === articles.length - 1;
    if (isBoundary && !isLast && inserted < maxInserts) {
      out.push({ kind: "staple", card: staples[inserted % staples.length] });
      inserted += 1;
    }
  });
  return out;
}
