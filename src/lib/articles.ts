import type { CollectionEntry } from "astro:content";

export const articleTypeLabels = {
  foundation: "土台記事",
  revenue: "収益記事",
  news: "流入記事",
} as const;

export type ArticleEntry = CollectionEntry<"articles">;

const publicStatuses = ["review", "ready", "published", "needs-update"];

export function isListableArticle(entry: ArticleEntry) {
  return (
    entry.data.slug !== "_template" &&
    publicStatuses.includes(entry.data.status)
  );
}

export function sortArticles(a: ArticleEntry, b: ArticleEntry) {
  if (a.data.priority !== b.data.priority) {
    return a.data.priority - b.data.priority;
  }

  return b.data.updated.localeCompare(a.data.updated);
}
