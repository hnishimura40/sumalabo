import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const articleType = z.enum(["foundation", "revenue", "news"]);
const articleCategory = z.enum([
  "ニュースをかみくだく",
  "スマホの選び方",
  "通信費を下げる",
  "周辺機器・ガジェット",
]);
const articleStatus = z.enum([
  "idea",
  "outline",
  "draft",
  "review",
  "ready",
  "published",
  "needs-update",
]);

const articles = defineCollection({
  loader: glob({
    base: "./content/articles",
    pattern: "**/*.{md,mdx}",
  }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    type: articleType,
    category: articleCategory,
    description: z.string(),
    thumbnail: z.string().default(""),
    thumbnailAlt: z.string().default(""),
    draft: z.boolean().default(false),
    status: articleStatus,
    priority: z.number(),
    characterUse: z.object({
      recommended: z.boolean(),
      count: z.number().int().min(0).max(3),
      primary: z.string().default(""),
      secondary: z.string().default(""),
    }),
    related: z.array(z.string()).default([]),
    pubDate: z.string().default(""),
    updated: z.string(),
    publishAt: z.string().default(""),
    // 広告(アフィリエイトリンク)を含む記事は true にする（ステマ規制対応）。
    // true のとき記事冒頭に「本記事は広告（アフィリエイトリンク）を含みます」を自動表示。
    // ニュース記事(type: news)では常に false（sumalabo-gate が強制）。
    hasAffiliate: z.boolean().default(false),
  }),
});

export const collections = { articles };
