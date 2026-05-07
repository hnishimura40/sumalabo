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

export function isPublishWindowOpen(entry: ArticleEntry, now = getBuildNow()) {
  const publishAt = entry.data.publishAt?.trim();

  if (!publishAt) {
    return true;
  }

  const publishTime = Date.parse(publishAt);

  if (Number.isNaN(publishTime)) {
    return false;
  }

  return publishTime <= now.getTime();
}

export function isListableArticle(entry: ArticleEntry) {
  return (
    entry.data.slug !== "_template" &&
    publicStatuses.includes(entry.data.status) &&
    isPublishWindowOpen(entry)
  );
}

export function sortArticles(a: ArticleEntry, b: ArticleEntry) {
  if (a.data.priority !== b.data.priority) {
    return a.data.priority - b.data.priority;
  }

  return b.data.updated.localeCompare(a.data.updated);
}
