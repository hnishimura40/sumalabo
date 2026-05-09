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

const forbiddenPublicSourcePhrases = [
  "元記事・すまほん",
  "元記事: すまほん",
  "元記事：すまほん",
  "参考元: すまほん",
  "参考元：すまほん",
  "参照元: すまほん",
  "参照元：すまほん",
  "すまほん記事",
  "すまほんを参考",
  "すまほんでは",
];

const sourceReferenceLinePatterns = [
  /^(?:[-*]\s*)?\[[^\]]*(?:元記事|参考元|参照元)[^\]]*すまほん[^\]]*\]\([^)]+\)\s*$/i,
  /^(?:[-*]\s*)?.*(?:元記事|参考元|参照元)\s*[：:・]\s*すまほん.*$/i,
  /^(?:[-*]\s*)?.*すまほん記事.*$/i,
  /^(?:[-*]\s*)?.*すまほんを参考.*$/i,
  /^(?:[-*]\s*)?.*すまほんでは.*$/i,
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

export function sanitizePublicArticleContent(content) {
  const removedLines = [];
  const sanitized = content
    .split(/\r?\n/)
    .filter((line) => {
      const shouldRemove = sourceReferenceLinePatterns.some((pattern) => pattern.test(line.trim()));
      if (shouldRemove) {
        removedLines.push(line);
      }
      return !shouldRemove;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (removedLines.length > 0) {
    console.warn(
      `Removed ${removedLines.length} source-media reference line(s) from public article content.`,
    );
  }

  return sanitized;
}

export function validatePublicArticleContent(content) {
  const found = forbiddenPublicSourcePhrases.filter((phrase) => content.includes(phrase));

  if (found.length > 0) {
    console.warn(`Public article content still contains source-media references: ${found.join(", ")}`);
    throw new Error(`Public article content still contains source-media references: ${found.join(" / ")}`);
  }
}

function normalizeBody(markdown, title) {
  let body = stripFrontmatter(markdown);
  body = stripDuplicateTitle(body, title);
  body = stripMetaLines(body);
  body = sanitizePublicArticleContent(body);
  validatePublicArticleContent(body);
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
updated: "${todayJst()}"
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
  const review = validateGeneratedArticle({ body, source: sourceLog || {}, thumbnailExists });
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
