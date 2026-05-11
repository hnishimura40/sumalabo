#!/usr/bin/env node
// すまラボ自動化: X 投稿文生成 CLI
//
// 使い方:
//   node scripts/run/generate-x-post.mjs --slug 202605-iphone-18-pro-dynamic-island-top-left-rumor
//   [--productionUrl https://sumalabo.com]
//
// 入力:
//   content/articles/{slug}.mdx (frontmatter)
//   logs/brief/{slug}.article.json (任意・articleBrief)
//   logs/source/{slug}.json (任意・sourceMeta)
//
// 出力:
//   drafts/social/{slug}.x-post.md   (人間レビュー用)
//   logs/social/{slug}.x-post.json   (機械参照用 / post-to-x が読む)
//
// 終了コード:
//   0 = 生成成功
//   1 = 引数エラー
//   2 = 元 MDX が見つからない
//   3 = 生成は出来たが warnings がある（人間レビュー推奨）

import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateXPost } from "../sumahon/generate-x-post.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

function extractFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fmText = m[1];
  const body = m[2];
  const fm = {};
  for (const line of fmText.split(/\r?\n/)) {
    const kv = line.match(/^([a-zA-Z_][\w]*)\s*:\s*(.+)$/);
    if (!kv) continue;
    const [, key, valRaw] = kv;
    let val = valRaw.trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    fm[key] = val;
  }
  return { fm, body };
}

async function loadJsonIfExists(p) {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(await readFile(p, "utf-8"));
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = args.slug;
  if (!slug) {
    console.error("usage: node scripts/run/generate-x-post.mjs --slug <slug> [--productionUrl <url>]");
    process.exit(1);
  }

  const mdxPath = `content/articles/${slug}.mdx`;
  if (!existsSync(mdxPath)) {
    console.error(`error: MDX が見つかりません: ${mdxPath}`);
    process.exit(2);
  }

  const raw = await readFile(mdxPath, "utf-8");
  const { fm } = extractFrontmatter(raw);

  const articleBrief = await loadJsonIfExists(`logs/brief/${slug}.article.json`);
  const sourceMeta = await loadJsonIfExists(`logs/source/${slug}.json`);

  const productionUrl = args.productionUrl || "https://sumalabo.com";

  const result = generateXPost({
    slug,
    title: fm.title || "",
    description: fm.description || "",
    category: fm.category || "",
    type: fm.type || "",
    thumbnail: fm.thumbnail || "",
    productionUrl,
    articleBrief,
    sourceMeta,
  });

  // ファイル保存
  const draftsDir = "drafts/social";
  const logsDir = "logs/social";
  if (!existsSync(draftsDir)) mkdirSync(draftsDir, { recursive: true });
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

  const md = [
    `# X 投稿文ドラフト: ${slug}`,
    "",
    `- 記事URL: ${result.articleUrl}`,
    `- 報道ベース: ${result.isReporting ? "はい (hedge 表現を含める)" : "いいえ"}`,
    `- サムネ添付: ${result.attachThumbnail ? `はい (${result.thumbnailPath})` : "いいえ"}`,
    `- 生成日時: ${result.generatedAt}`,
    `- ハッシュタグ: ${result.hashtags.join(" ")}`,
    "",
    "## primary",
    "",
    "```",
    result.primary.text,
    "```",
    `(${result.primary.charCount} 文字 / truncated=${result.primary.truncated})`,
    "",
    "## 代替案",
    "",
    ...result.alternates.flatMap((alt) => [
      `### ${alt.label}`,
      "",
      "```",
      alt.text,
      "```",
      `(${alt.charCount} 文字 / truncated=${alt.truncated})`,
      "",
    ]),
  ];

  if (result.warnings.length > 0) {
    md.push("## warnings", "");
    for (const w of result.warnings) md.push(`- ${w}`);
    md.push("");
  }

  md.push(
    "## 使い方",
    "",
    "- primary を採用する場合: `node scripts/run/post-to-x.mjs --slug " + slug + "`",
    "- 代替案を使う場合: `--variant 結論先出し` または `--variant 問いかけ` を付けて呼ぶ",
    "- 投稿前に必ず本ファイルを目視で確認してください（特に hedge 表現と URL）",
    "",
  );

  await writeFile(path.join(draftsDir, `${slug}.x-post.md`), md.join("\n"), "utf-8");
  await writeFile(path.join(logsDir, `${slug}.x-post.json`), JSON.stringify(result, null, 2) + "\n", "utf-8");

  console.log(`generated: drafts/social/${slug}.x-post.md`);
  console.log(`generated: logs/social/${slug}.x-post.json`);
  console.log(`primary charCount=${result.primary.charCount} truncated=${result.primary.truncated}`);
  if (result.warnings.length) {
    console.log("warnings:");
    for (const w of result.warnings) console.log("  -", w);
    process.exit(3);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("fatal:", e.message);
  process.exit(1);
});
