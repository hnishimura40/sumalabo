#!/usr/bin/env node
// ChatGPT browser responses are stored as a conversation graph. Object insertion
// order is not conversation order: deep-research/tool nodes and abandoned branches
// may be appended after the visible final answer. Always walk current_node -> parent.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const DEFAULT_LIMITS = {
  chatgpt_turn1_research: { minBodyBlocks: 3, minProseChars: 600, minHeadings: 3 },
  chatgpt_turn2_selection: { minBodyBlocks: 3, minProseChars: 400, minHeadings: 2 },
  chatgpt_turn3_draft: { minBodyBlocks: 6, minProseChars: 1200, minHeadings: 3 },
  chatgpt_turn4_review: { minBodyBlocks: 3, minProseChars: 300, minHeadings: 1 },
  chatgpt_turn5_final: { minBodyBlocks: 6, minProseChars: 1200, minHeadings: 3 },
  chatgpt_turn6_slideplan: { minBodyBlocks: 8, minProseChars: 1200, minHeadings: 3 },
};

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next == null || next.startsWith("--")) out[key.slice(2)] = true;
    else { out[key.slice(2)] = next; i += 1; }
  }
  return out;
}

function scalarText(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  if (typeof value.text === "string") return value.text;
  if (typeof value.content === "string") return value.content;
  if (typeof value.value === "string") return value.value;
  return "";
}

export function extractContentText(content) {
  if (typeof content === "string") return content;
  if (!content || typeof content !== "object") return "";
  const parts = Array.isArray(content.parts) ? content.parts : [];
  const fromParts = parts.map(scalarText).filter(Boolean).join("\n").trim();
  if (fromParts) return fromParts;
  return scalarText(content).trim();
}

function assistantCandidate(node) {
  const message = node?.message;
  if (message?.author?.role !== "assistant") return null;
  const text = extractContentText(message.content);
  return text ? {
    text,
    messageId: message.id || node.id || null,
    createTime: Number(message.create_time || 0),
    status: message.status || null,
  } : null;
}

export function extractLatestAssistant(raw) {
  if (typeof raw === "string") return { text: raw, source: "plain_text", messageId: null };
  if (!raw || typeof raw !== "object") return { text: "", source: "empty", messageId: null };
  if (typeof raw.output === "string") {
    return { text: raw.output, source: "rendered_capture", messageId: raw.conversationId || null, externalMetrics: raw.metrics || null };
  }
  const mapping = raw.mapping;
  if (mapping && typeof mapping === "object") {
    const visited = new Set();
    let id = raw.current_node;
    while (id && mapping[id] && !visited.has(id)) {
      visited.add(id);
      const candidate = assistantCandidate(mapping[id]);
      if (candidate) return { ...candidate, source: "current_node_parent_chain" };
      id = mapping[id].parent;
    }
    const candidates = Object.values(mapping).map(assistantCandidate).filter(Boolean)
      .sort((a, b) => b.createTime - a.createTime);
    if (candidates[0]) return { ...candidates[0], source: "create_time_fallback" };
  }
  for (const key of ["assistant", "response", "text", "markdown"]) {
    if (typeof raw[key] === "string") return { text: raw[key], source: `field:${key}`, messageId: null };
  }
  return { text: "", source: "unrecognized_json", messageId: null };
}

function stripCitationNoise(text) {
  return text
    .replace(/cite[^]*/g, "")
    .replace(/^\s*(?:OpenAI|ITmedia|Axios|Google|Anthropic|Reuters|Bloomberg)(?:\s*\+\d+)?\s*$/gim, "")
    .replace(/https?:\/\/\S+/g, "");
}

function meaningfulBlock(block) {
  const cleaned = stripCitationNoise(block)
    .replace(/^\s{0,3}#{1,6}\s+.*$/gm, "")
    .replace(/^\s*(?:---+|___+)\s*$/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/[*_`>|\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length >= 20 ? cleaned : "";
}

function findActualOutputTokens(raw) {
  const seen = new Set();
  let found = null;
  function visit(value, depth = 0) {
    if (found != null || depth > 8 || !value || typeof value !== "object" || seen.has(value)) return;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (/^(?:output_tokens|completion_tokens)$/i.test(key) && Number.isFinite(Number(child))) {
        found = Number(child);
        return;
      }
      visit(child, depth + 1);
    }
  }
  visit(raw);
  return found;
}

export function analyzeResponse(text, { step = "chatgpt_turn1_research", externalMetrics = null, raw = null } = {}) {
  const normalized = String(text || "").replace(/\r\n/g, "\n").trim();
  const blocks = normalized.split(/\n\s*\n/).map(meaningfulBlock).filter(Boolean);
  const proseChars = blocks.join("\n").length;
  const markdownHeadings = (normalized.match(/^\s{0,3}#{1,6}\s+\S+/gm) || []).length;
  const renderedHeadings = ["h1", "h2", "h3", "h4", "h5", "h6"]
    .reduce((sum, key) => sum + Math.max(0, Number(externalMetrics?.[key] || 0)), 0);
  const headings = Math.max(markdownHeadings, renderedHeadings);
  const citations = Math.max(
    (normalized.match(/cite/g) || []).length,
    Number(externalMetrics?.citationLinks || 0),
  );
  const limits = DEFAULT_LIMITS[step] || { minBodyBlocks: 3, minProseChars: 400, minHeadings: 1 };
  const reasons = [];
  if (blocks.length < limits.minBodyBlocks) reasons.push(`body_blocks_too_few:${blocks.length}<${limits.minBodyBlocks}`);
  if (proseChars < limits.minProseChars) reasons.push(`prose_chars_too_few:${proseChars}<${limits.minProseChars}`);
  if (headings < limits.minHeadings) reasons.push(`headings_too_few:${headings}<${limits.minHeadings}`);
  return {
    healthy: reasons.length === 0,
    reasons,
    outputChars: normalized.length,
    bodyBlocks: blocks.length,
    proseChars,
    headings,
    citations,
    outputTokensActual: findActualOutputTokens(raw),
    outputTokensEstimated: Math.ceil(normalized.length / 2),
    limits,
  };
}

function extractPromptOutline(original) {
  const headings = (original.match(/^#{1,6}\s+.+$/gm) || []).map((s) => s.replace(/^#+\s*/, "").trim());
  const requirements = (original.match(/^\s*(?:[-*]|\d+[.)])\s+.+$/gm) || []).map((s) => s.trim());
  return { headings, requirements };
}

export function buildStructuredRetryPrompt(originalPrompt, step) {
  const outline = extractPromptOutline(originalPrompt);
  return `# 構造化リトライ（1回限り）\n\n` +
    `前回の調査量・参照サイト・引用は減らさず、この会話ですでに完了した調査をすべて再利用してください。新しい調査のやり直しは不要です。画像は再生成しません。\n\n` +
    `## 出力対象\n- 工程: ${step}\n- Markdown本文だけを出力\n- 見出しだけ、引用チップだけ、メタ説明だけで終了しない\n- 各必須節に具体的な本文または箇条書きを入れる\n\n` +
    `## 必須構造（元依頼から抽出）\n${outline.headings.map((h) => `- ${h}`).join("\n") || "- 元依頼の見出し構成を維持"}\n\n` +
    `## 必須要件（元依頼から抽出）\n${outline.requirements.join("\n") || "- 元依頼の全要件を維持"}\n\n` +
    `## 作成手順\n1. 既存の調査結果を facts / claims / uncertain / source に内部整理する。\n2. 情報を捨てず、重複だけを統合する。\n3. その整理結果から指定構造の完成Markdownを一括出力する。\n4. 出力後、全必須節に本文があることを自己確認する。\n\n` +
    `## 元の依頼（情報欠落防止のため全文保持）\n\n${originalPrompt.trim()}\n`;
}

export function runHealthCheck({ raw, step, attempt = 1, originalPrompt = "" }) {
  const extracted = extractLatestAssistant(raw);
  const metrics = analyzeResponse(extracted.text, { step, externalMetrics: extracted.externalMetrics, raw });
  const retryPrompt = !metrics.healthy && attempt < 2 ? buildStructuredRetryPrompt(originalPrompt, step) : null;
  return { extracted, metrics, retryPrompt, attempt };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.input || !args.output || !args.report || !args.step) {
    console.error("usage: --input <raw.json|text> --output <markdown> --report <json> --step <chatgpt_step> [--attempt 1|2] [--original-prompt <path>] [--retry-prompt <path>] [--dom-fallback <path>]");
    process.exitCode = 2;
    return;
  }
  const inputPath = path.resolve(args.input);
  const inputText = fs.readFileSync(inputPath, "utf8").replace(/^\uFEFF/, "");
  let raw;
  try { raw = JSON.parse(inputText); } catch { raw = inputText; }
  const attempt = Math.max(1, Number(args.attempt || 1));
  const originalPrompt = args["original-prompt"] ? fs.readFileSync(path.resolve(args["original-prompt"]), "utf8") : "";
  let result = runHealthCheck({ raw, step: args.step, attempt, originalPrompt });
  let selectedInput = inputPath;
  if (!result.metrics.healthy && args["dom-fallback"] && fs.existsSync(path.resolve(args["dom-fallback"]))) {
    const fallbackPath = path.resolve(args["dom-fallback"]);
    const fallbackText = fs.readFileSync(fallbackPath, "utf8").replace(/^\uFEFF/, "");
    let fallbackRaw;
    try { fallbackRaw = JSON.parse(fallbackText); } catch { fallbackRaw = fallbackText; }
    const fallbackResult = runHealthCheck({ raw: fallbackRaw, step: args.step, attempt, originalPrompt });
    if (fallbackResult.metrics.healthy) {
      result = fallbackResult;
      selectedInput = fallbackPath;
    }
  }
  const outputPath = path.resolve(args.output);
  const reportPath = path.resolve(args.report);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(outputPath, `${result.extracted.text.trim()}\n`, "utf8");
  let retryPromptPath = null;
  if (result.retryPrompt) {
    retryPromptPath = path.resolve(args["retry-prompt"] || `${outputPath}.retry-prompt.md`);
    fs.writeFileSync(retryPromptPath, result.retryPrompt, "utf8");
  }
  const report = {
    step: args.step,
    attempt,
    healthy: result.metrics.healthy,
    reasons: result.metrics.reasons,
    metrics: result.metrics,
    extraction: { source: result.extracted.source, messageId: result.extracted.messageId || null },
    inputPath: selectedInput,
    outputPath,
    retryPromptPath,
    checkedAt: new Date().toISOString(),
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.healthy ? 0 : (attempt < 2 ? 12 : 20);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();

