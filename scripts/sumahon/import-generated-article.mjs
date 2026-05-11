import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { todayJst, toIsoJst } from "./utils.mjs";
import { validateGeneratedArticle } from "./validate-generated-article.mjs";

const metaLinePatterns = [
  /ChatGPT向け/i,
  /自動生成/,
  /この記事は自動生成されています/,
  /管理用メモ/,
  /生成フロー/,
  /サムネイルは後続生成予定/,
  /thumbnail pending/i,
  /以下を貼り付けてください/,
  /プロンプト/,
  /handoff/i,
];

function escapeYaml(value = "") {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
}

function stripDuplicateTitle(markdown, title) {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const titleHeading = new RegExp(`^#\\s+${escapedTitle}\\s*$\\r?\\n?`, "m");
  return markdown.replace(titleHeading, "").trim();
}

function stripMetaLines(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => !metaLinePatterns.some((pattern) => pattern.test(line)))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeBody(markdown, title) {
  let body = stripFrontmatter(markdown);
  body = stripDuplicateTitle(body, title);
  body = stripMetaLines(body);
  return body;
}

function makeDescription(articleBrief, body) {
  if (articleBrief?.coreAngle) {
    return `${articleBrief.coreAngle} 普通の人にもわかるように、何が話題で何を確認すべきかを整理します。`.slice(0, 160);
  }

  const firstText = body
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return firstText.slice(0, 140) || "スマホ・AI・ガジェットのニュースを、普通の人にもわかるように整理します。";
}

function relatedSlugs(articleBrief) {
  return (articleBrief?.internalLinkCandidates || [])
    .map((link) => link.href?.match(/^\/articles\/([^/]+)\//)?.[1])
    .filter(Boolean)
    .slice(0, 3);
}

function frontmatter({ slug, title, description, thumbnail, thumbnailAlt, articleBrief }) {
  const related = relatedSlugs(articleBrief);
  const publicDate = todayJst();

  return `---
title: "${escapeYaml(title)}"
slug: "${slug}"
type: "news"
category: "ニュースをかみくだく"
description: "${escapeYaml(description)}"
thumbnail: "${escapeYaml(thumbnail)}"
thumbnailAlt: "${escapeYaml(thumbnailAlt)}"
status: "review"
priority: ${articleBrief?.priority === "high" ? 1 : 2}
characterUse:
  recommended: true
  count: 2
  primary: "duo_talk_half.webp"
  secondary: "duo_guide_half.webp"
related:
${related.length > 0 ? related.map((item) => `  - "${item}"`).join("\n") : "  []"}
pubDate: "${publicDate}"
updated: "${publicDate}"
publishAt: "${toIsoJst()}"
---`;
}

export async function importGeneratedArticle({ slug, filePath, articleBrief, sourceLog, thumbnailBrief }) {
  if (!existsSync(filePath)) {
    throw new Error(`Generated draft file was not found: ${filePath}`);
  }

  const raw = await readFile(filePath, "utf-8");
  const title = articleBrief?.articleTitle || sourceLog?.sourceTitle || `${slug} のニュースを整理`;
  const body = normalizeBody(raw, title);
  const thumbnailPath = path.join("public", "images", "thumbnails", `${slug}.png`);
  const thumbnailExists = existsSync(thumbnailPath);
  const thumbnail = thumbnailExists ? `/images/thumbnails/${slug}.png` : "";
  const thumbnailAlt =
    thumbnailBrief?.headlineIdeas?.[0]
      ? `${thumbnailBrief.headlineIdeas[0]}について、すまラボが普通の人向けに整理しているサムネイル`
      : `${title}について、すまラボが普通の人向けに整理しているサムネイル`;
  const description = makeDescription(articleBrief, body);
  const category = "ニュースをかみくだく"; // 現状の import-generated はニュース系前提で frontmatter にこのカテゴリを書き込む
  const review = validateGeneratedArticle({
    body,
    source: sourceLog || {},
    thumbnailExists,
    frontmatterTitle: title,
    category,
  });
  const mdx = `${frontmatter({ slug, title, description, thumbnail, thumbnailAlt, articleBrief })}\n\n${body}\n`;

  return {
    mdx,
    review,
    title,
    description,
    thumbnail,
    thumbnailExists,
    thumbnailPath,
    body,
  };
}
