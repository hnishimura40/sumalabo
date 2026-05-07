import type { CollectionEntry } from "astro:content";

export const articleTypeLabels = {
  foundation: "土台記事",
  revenue: "収益記事",
  news: "流入記事",
} as const;

export type ArticleEntry = CollectionEntry<"articles">;

const publicStatuses = ["review", "ready", "published", "needs-update"];

export function getBuildNow() {
  const override = import.meta.env.SUMALAB_NOW;
  if (override) {
    const overrideTime = Date.parse(override);
    if (!Number.isNaN(overrideTime)) {
      return new Date(overrideTime);
    }
  }

  return new Date();
}

function normalizeBuildNow(now: unknown) {
  return now instanceof Date ? now : getBuildNow();
}

export function isPublishWindowOpen(entry: ArticleEntry, now: unknown = getBuildNow()) {
  const buildNow = normalizeBuildNow(now);
  const publishAt = entry.data.publishAt?.trim();

  if (!publishAt) {
    return true;
  }

  const publishTime = Date.parse(publishAt);

  if (Number.isNaN(publishTime)) {
    return false;
  }

  return publishTime <= buildNow.getTime();
}

export function isListableArticle(entry: ArticleEntry, now: unknown = getBuildNow()) {
  const buildNow = normalizeBuildNow(now);
  const articleData = entry.data as ArticleEntry["data"] & { draft?: boolean };

  return (
    entry.data.slug !== "_template" &&
    articleData.draft !== true &&
    publicStatuses.includes(entry.data.status) &&
    isPublishWindowOpen(entry, buildNow)
  );
}

function parseDateValue(value: string | Date | undefined) {
  if (!value) {
    return 0;
  }

  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

export function getArticlePublicTime(entry: ArticleEntry) {
  const articleData = entry.data as ArticleEntry["data"] & {
    pubDate?: string | Date;
  };
  const publishAtTime = parseDateValue(articleData.publishAt);

  if (publishAtTime > 0) {
    return publishAtTime;
  }

  return parseDateValue(articleData.pubDate) || parseDateValue(articleData.updated);
}

export function sortArticles(a: ArticleEntry, b: ArticleEntry) {
  const dateDiff = getArticlePublicTime(b) - getArticlePublicTime(a);

  if (dateDiff !== 0) {
    return dateDiff;
  }

  if (a.data.priority !== b.data.priority) {
    return a.data.priority - b.data.priority;
  }

  return a.data.slug.localeCompare(b.data.slug);
}

export function getVisibleArticles(entries: ArticleEntry[], now = getBuildNow()) {
  return entries.filter((entry) => isListableArticle(entry, now));
}

export function getSortedVisibleArticles(entries: ArticleEntry[], now = getBuildNow()) {
  return getVisibleArticles(entries, now).sort(sortArticles);
}

export function getAdjacentArticles(entries: ArticleEntry[], currentSlug: string) {
  const sortedArticles = getSortedVisibleArticles(entries);
  const currentIndex = sortedArticles.findIndex((entry) => entry.data.slug === currentSlug);

  if (currentIndex === -1) {
    return { previousArticle: undefined, nextArticle: undefined };
  }

  return {
    previousArticle: sortedArticles[currentIndex + 1],
    nextArticle: sortedArticles[currentIndex - 1],
  };
}
