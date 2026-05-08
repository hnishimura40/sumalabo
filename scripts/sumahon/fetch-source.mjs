import { cleanTitle, compactText, decodeHtml, stripTags } from "./utils.mjs";

function matchMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1]).trim();
    }
  }

  return "";
}

function extractTitle(html) {
  return cleanTitle(
    matchMeta(html, "og:title") ||
      html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
      "",
  );
}

function extractArticleHtml(html) {
  return (
    html.match(/<article[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<main[\s\S]*?<\/main>/i)?.[0] ||
    html
  );
}

function extractParagraphs(html) {
  const articleHtml = extractArticleHtml(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<figure[\s\S]*?<\/figure>/gi, " ")
    .replace(/<blockquote[\s\S]*?<\/blockquote>/gi, " ");

  return [...articleHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => stripTags(match[1]))
    .filter((text) => text.length >= 28)
    .filter((text) => !/関連記事|続きを読む|シェア|コメント|広告/i.test(text))
    .slice(0, 14);
}

function makeKeyPoints({ title, description, paragraphs }) {
  const candidates = [description, ...paragraphs].filter(Boolean);
  const points = [];

  for (const candidate of candidates) {
    const sentences = candidate
      .split(/(?<=[。！？!?])\s*/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length >= 20);

    for (const sentence of sentences) {
      const point = compactText(sentence, 120);
      if (!points.includes(point)) {
        points.push(point);
      }
      if (points.length >= 6) {
        return points;
      }
    }
  }

  return points.length > 0 ? points : [compactText(title, 120)];
}

export async function fetchSource(sourceUrl) {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "sumalabo-topic-research/0.1 (+https://sumalabo.com)",
      accept: "text/html,application/xhtml+xml",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch source: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const title = extractTitle(html);
  const description = matchMeta(html, "description") || matchMeta(html, "og:description");
  const publishedAt =
    matchMeta(html, "article:published_time") ||
    matchMeta(html, "pubdate") ||
    matchMeta(html, "date") ||
    "";
  const paragraphs = extractParagraphs(html);
  const keyPoints = makeKeyPoints({ title, description, paragraphs });

  return {
    sourceMedia: "すまほん",
    sourceUrl,
    sourceTitle: title,
    sourceDescription: compactText(description, 240),
    sourcePublishedAt: publishedAt,
    keyPoints,
    workingExcerpt: paragraphs.slice(0, 8).map((text) => compactText(text, 180)),
  };
}
