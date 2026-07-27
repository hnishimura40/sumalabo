#!/usr/bin/env node
// すまラボ自動化: X 投稿文生成 CLI
//
// 使い方:
//   node scripts/run/generate-x-post.mjs --slug 202605-iphone-18-pro-dynamic-island-top-left-rumor
//   [--productionUrl https://sumalabo.com]
//   [--validated-subject-tags VIVANT,Claude]  # Xの最新検索で生存確認済みの候補だけ
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
import { extractFrontmatter } from "../sumahon/frontmatter-lite.mjs";
import { loadXPostOptions, buildAttachmentPlan } from "../automation/x-post-options.mjs";

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
  const validatedArg = args.validatedSubjectTags ?? args["validated-subject-tags"] ?? "";
  const validatedSubjectTags = /^(?:none|なし)$/i.test(String(validatedArg).trim())
    ? []
    : String(validatedArg).split(",").map((tag) => tag.trim()).filter(Boolean);

  // Phase C 投稿形式（autonomy.json の xPostOptions）を読み、画像添付計画とリンク運用を決める。
  const xPostOptions = loadXPostOptions();
  const attachmentPlan = buildAttachmentPlan(slug, xPostOptions);

  const result = generateXPost({
    slug,
    title: fm.title || "",
    description: fm.description || "",
    category: fm.category || "",
    type: fm.type || "",
    tags: fm.tags || [],
    validatedSubjectTags,
    thumbnail: fm.thumbnail || "",
    productionUrl,
    articleBrief,
    sourceMeta,
    linkInReply: attachmentPlan.linkInReply === true,
  });
  // 添付計画（本投稿の画像 / 返信ツリー / variant）を投稿JSONに載せて Phase C 実行側へ渡す。
  result.attachmentPlan = attachmentPlan;

  // ファイル保存
  const draftsDir = "drafts/social";
  const logsDir = "logs/social";
  if (!existsSync(draftsDir)) mkdirSync(draftsDir, { recursive: true });
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });

  const plan = result.attachmentPlan || { variant: "text_only", attach: [], threadBatches: [], linkInReply: false };
  const attachRel = (plan.attach || []).map((p) => p.replace(/\\/g, "/").replace(/^.*?(public\/images\/.*)$/, "$1"));
  const md = [
    `# X 投稿文ドラフト: ${slug}`,
    "",
    `- 記事URL: ${result.articleUrl}`,
    `- 報道ベース: ${result.isReporting ? "はい (hedge 表現を含める)" : "いいえ"}`,
    `- 投稿形式(variant): ${plan.variant}`,
    `- 本投稿に添付する画像(${(plan.attach || []).length}枚): ${attachRel.length ? attachRel.join(" , ") : "なし"}`,
    `- 記事リンクの置き場所: ${plan.linkInReply ? "リプライ（本投稿には入れない）" : "本投稿に含める"}`,
    `- 生成日時: ${result.generatedAt}`,
    `- ハッシュタグ: ${result.hashtags.join(" ")}`,
    `- 題材タグ候補（投稿直前にX検索必須）: ${result.subjectHashtagCandidates.length ? result.subjectHashtagCandidates.join(" ") : "なし"}`,
    `- X検索で検証済みの題材タグ: ${result.subjectHashtags.length ? result.subjectHashtags.join(" ") : "なし"}`,
    "",
    "## primary（本投稿）",
    "",
    "```",
    result.primary.text,
    "```",
    `(${result.primary.charCount} 文字 / X加重=${result.primary.weightedLength}/280 / downshifted=${result.primary.downshifted})`,
    "",
    ...(result.reply
      ? ["## reply（本投稿にぶら下げる記事リンク）", "", "```", result.reply.text, "```", ""]
      : []),
    "## 代替案",
    "",
    ...result.alternates.flatMap((alt) => [
      `### ${alt.label}`,
      "",
      "```",
      alt.text,
      "```",
      `(${alt.charCount} 文字 / X加重=${alt.weightedLength}/280 / downshifted=${alt.downshifted})`,
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
    "- 題材タグ候補はXの最新検索（過去7日・3投稿・3アカウント）で確認後、`--validated-subject-tags` を付けて再生成してください。合格なしは初回出力を使います",
    "",
  );

  await writeFile(path.join(draftsDir, `${slug}.x-post.md`), md.join("\n"), "utf-8");
  await writeFile(path.join(logsDir, `${slug}.x-post.json`), JSON.stringify(result, null, 2) + "\n", "utf-8");

  console.log(`generated: drafts/social/${slug}.x-post.md`);
  console.log(`generated: logs/social/${slug}.x-post.json`);
  console.log(`primary charCount=${result.primary.charCount} weighted=${result.primary.weightedLength}/280 downshifted=${result.primary.downshifted}`);
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
