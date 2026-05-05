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
    status: articleStatus,
    priority: z.number(),
    characterUse: z.object({
      recommended: z.boolean(),
      count: z.number().int().min(0).max(3),
      primary: z.string().default(""),
      secondary: z.string().default(""),
    }),
    related: z.array(z.string()).default([]),
    updated: z.string(),
  }),
});

export const collections = { articles };
