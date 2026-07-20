#!/usr/bin/env node
// Codex CLI image-generation carrier for the Phase A orchestrator.
// Generated PNGs stay outside the repository. Only audit/usage manifests are
// written under logs/article so the existing independent inspection remains a
// separate downstream stage.

import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { markGenerated } from "./image-output-lifecycle.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_OUTPUT_ROOT = "D:\\downloads\\sumalabo-codex";
const DEFAULT_TIMEOUT_MS = 12 * 60 * 1000;
const CANONICAL = [
  path.join(ROOT, "assets", "characters", "himari-canonical.png"),
  path.join(ROOT, "assets", "characters", "labomaru-canonical.png"),
];

export const FALLBACK_CONDITIONS = Object.freeze([
  "content_policy_refusal",
  "japanese_text_mismatch",
  "character_anchor_mismatch",
  "authentication_required",
  "cli_abnormal_exit",
  "generation_timeout",
  "targeted_retry_exhausted",
]);

function usagePath(slug) {
  return path.join(ROOT, "logs", "article", `${slug}.codex-image-usage.json`);
}

function manifestPath(slug) {
  return path.join(ROOT, "logs", "article", `${slug}.codex-images.json`);
}

function fallbackPath(slug) {
  return path.join(ROOT, "logs", "article", `${slug}.image-fallback.json`);
}

function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try { return JSON.parse(readFileSync(file, "utf8").replace(/^\uFEFF/, "")); }
  catch { return fallback; }
}

function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function parseSlidePlan(text) {
  const performanceBlock = parsePerformanceBlock(text);
  const headings = [...text.matchAll(/^##\s+([^\r\n]+)$/gm)];
  return headings.map((match, index) => {
    const idMatch = match[1].match(/^(thumbnail|slide\d{2})/i);
    if (!idMatch) return null;
    const id = idMatch[1].toLowerCase();
    const end = headings[index + 1]?.index ?? text.length;
    return {
      id,
      section: text.slice(match.index, end).trim(),
      performanceBlock,
      width: id === "thumbnail" ? 1600 : 1122,
      height: id === "thumbnail" ? 900 : 1402,
    };
  }).filter((item) => item && (item.id === "thumbnail" || /^slide0[1-8]$/.test(item.id)));
}

export function parsePerformanceBlock(text) {
  const headings = [...text.matchAll(/^##\s+([^\r\n]+)$/gm)];
  const index = headings.findIndex((match) => /^演出ブロック(?:\s|（|\(|$)/.test(match[1].trim()));
  if (index < 0) return "";
  const start = headings[index].index;
  const end = headings[index + 1]?.index ?? text.length;
  return text.slice(start, end).trim();
}

export function pngDimensions(file) {
  const data = readFileSync(file);
  if (data.length < 24 || data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("not_png");
  }
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

export function sha256(file) {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function resolveCodexCli() {
  const configured = process.env.SUMALABO_CODEX_CLI;
  if (configured) return { command: configured, argsPrefix: [] };
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    const explicit = path.join(appData, "npm", "codex.cmd");
    const cliJs = path.join(appData, "npm", "node_modules", "@openai", "codex", "bin", "codex.js");
    if (existsSync(cliJs)) return { command: process.execPath, argsPrefix: [cliJs] };
    if (existsSync(explicit)) return { command: explicit, argsPrefix: [] };
    return { command: "codex.cmd", argsPrefix: [] };
  }
  return { command: "codex", argsPrefix: [] };
}

export function buildPrompt({ item, outputFile, planPath, correction = "" }) {
  const performanceBlock = item.performanceBlock || `## 演出ブロック（互換補完）
- 衣装: 対象セクションのテーマから連想し、サムネは標準衣装だけにしない
- 小道具: 対象セクションで意味のある道具を最低1点使う
- ポーズ・動き: 道具を実際に使う、見比べる、確認するなど動作で主題を表す
- 背景・状況: テーマ固有の現場を描く
- 演出根拠: 対象セクションの中心名詞から導出する`;
  return `画像生成ジョブを1件だけ実行してください。必ず imagegen スキルと built-in imagegen を使います。

添付した2枚はキャラクター正本です。最初に両方を見比べ、「同一性」と「演出」を混同せずに描いてください。

【同一性（正本厳守・変更禁止）】
- ひまり: 金髪サイドテール、水色〜ティールのリボン、大きな青い瞳、正本と同じ顔立ち・頭身・体型。
- らぼまる: 白い卵型ボディ、黄緑アンテナ1本、黒い丸い目、胸のオレンジのハートボタン、青い首輪バンド、左右の青い耳ビレ。
- 耳ビレは正本同様の横へ伸びる青い形を保つ。短く丸い突起へ縮めすぎない。首輪バンドと耳ビレを省略しない。
- 別人化、人型メカ化、アンテナ増加、体型変更は禁止。

【演出（記事テーマに合わせて積極的に変える）】
- 衣装・小道具・ポーズ・背景はキャラ同一性の判定対象ではない。下の演出ブロックを優先し、記事テーマ固有の体験を描く。
- サムネは標準衣装で棒立ち・指さし説明だけにしない。道具を手に持つ、操作する、見比べる、調べるなど動作を主役にする。
- 本文スライドも、小道具・ポーズ・背景は各スライドの役割に合わせて変えてよい。衣装を変える場合は演出ブロックに従い、記事内で一貫させる。
- 露出の多い衣装、記事と無関係なコスプレ、実在ロゴは不可。

${performanceBlock}

対象: ${item.id}
出力: PNG ${item.width}×${item.height}px
保存先（絶対パス）: ${outputFile}
slide_plan: ${planPath}

対象セクション:
${item.section}

共通品質:
- 日本語は対象セクションの表記を1文字ずつ正確に描く。特に 目/自、未/末、微/徴、数字、日付、$ 記号を確認する。
- 実在企業ロゴ、ブランドロゴ、実在人物を描かない。英字の商品名は文字情報としてのみ扱う。
- 明るく読みやすい日本のアニメ調・パステル調。文字を見切れさせない。
- このプロジェクト内は一切変更・保存しない。指定した外部PNGだけを作成する。
- 生成後、指定パスにファイルが存在し、寸法が完全一致するところまで行う。
${correction ? `\n修正指示（今回必ず直す）:\n${correction}\n` : ""}
完了時は、保存した絶対パスだけを最終回答に書いてください。`;
}

function parseUsageLine(line, aggregate) {
  let event;
  try { event = JSON.parse(line); } catch { return; }
  const usage = event?.usage || event?.turn?.usage || event?.item?.usage;
  if (!usage || typeof usage !== "object") return;
  for (const [key, value] of Object.entries(usage)) {
    if (typeof value === "number") aggregate[key] = (aggregate[key] || 0) + value;
  }
}

function classifyFailure(text, timedOut) {
  if (timedOut) return "generation_timeout";
  if (/not logged in|login required|authentication|unauthorized|401/i.test(text)) return "authentication_required";
  if (/content.?policy|safety policy|couldn.?t generate|cannot generate|refus/i.test(text)) return "content_policy_refusal";
  return "cli_abnormal_exit";
}

async function runCodex({ prompt, outputDir, timeoutMs }) {
  const cli = resolveCodexCli();
  // 2026-07-19: node_modules 消失事故の恒久対策。
  // workspace-write の書き込み先はリポジトリ ROOT ではなく「外部の出力ディレクトリ」に限定する。
  // 以前は `--cd ROOT` で Codex にリポジトリ全体（node_modules 含む）への書き込みを許していた。
  // 画像工程が必要とするのは (1) 正本画像の読み込み（--image で添付＝FS不要）、
  // (2) 出力 PNG の書き込み（outputDir・外部）だけ。slide_plan の対象セクションはプロンプトに
  // インライン展開済みなのでリポジトリへの FS アクセスは不要。よって書き込み可能領域を
  // outputDir だけに絞り、リポジトリ（＝node_modules）を Codex から保護する。
  const args = [...cli.argsPrefix,
    "exec", "--json", "--ephemeral", "--skip-git-repo-check", "--sandbox", "workspace-write",
    "--cd", outputDir,
    "--image", CANONICAL[0], "--image", CANONICAL[1], "-",
  ];
  const started = Date.now();
  const usage = {};
  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const child = spawn(cli.command, args, {
    cwd: ROOT,
    shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(cli.command),
    windowsHide: true,
    env: {
      ...process.env,
      LANG: process.env.LANG || "ja_JP.UTF-8",
      LC_ALL: process.env.LC_ALL || "ja_JP.UTF-8",
      PYTHONIOENCODING: "utf-8",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  child.stdin.setDefaultEncoding("utf8");
  child.stdin.end(prompt, "utf8");
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    for (const line of chunk.split(/\r?\n/)) parseUsageLine(line, usage);
  });
  child.stderr.on("data", (chunk) => { stderr += chunk; });
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  }).finally(() => clearTimeout(timer));

  return {
    ok: exitCode === 0 && !timedOut,
    exitCode,
    timedOut,
    elapsedMs: Date.now() - started,
    usage,
    stdout,
    stderr,
    failureCondition: exitCode === 0 && !timedOut ? null : classifyFailure(`${stdout}\n${stderr}`, timedOut),
  };
}

function appendUsage(slug, entry) {
  const file = usagePath(slug);
  const doc = readJson(file, { slug, transport: "codex_exec", runs: [] });
  doc.runs.push(entry);
  doc.updatedAt = new Date().toISOString();
  doc.totalElapsedMs = doc.runs.reduce((sum, run) => sum + (run.elapsedMs || 0), 0);
  doc.totalUsage = doc.runs.reduce((totals, run) => {
    for (const [key, value] of Object.entries(run.usage || {})) totals[key] = (totals[key] || 0) + value;
    return totals;
  }, {});
  writeJson(file, doc);
}

export function recordFallback(slug, condition, details = {}) {
  if (!FALLBACK_CONDITIONS.includes(condition)) throw new Error(`unknown fallback condition: ${condition}`);
  const file = fallbackPath(slug);
  const doc = readJson(file, { slug, required: false, events: [] });
  doc.required = true;
  doc.preferredTransport = "workshop_chat";
  doc.events.push({ condition, at: new Date().toISOString(), ...details });
  doc.updatedAt = new Date().toISOString();
  writeJson(file, doc);
  return file;
}

function verifyOutput(item, outputFile, beforeSha, seenShas) {
  if (!existsSync(outputFile) || statSync(outputFile).size < 1024) throw new Error("output_missing_or_empty");
  const dimensions = pngDimensions(outputFile);
  if (dimensions.width !== item.width || dimensions.height !== item.height) {
    throw new Error(`dimension_mismatch:${dimensions.width}x${dimensions.height}`);
  }
  const hash = sha256(outputFile);
  if (beforeSha && hash === beforeSha) throw new Error("sha_unchanged");
  if (seenShas.has(hash)) throw new Error("sha_duplicate_in_batch");
  seenShas.add(hash);
  return { ...dimensions, sha256: hash, bytes: statSync(outputFile).size };
}

function parseArgs(argv) {
  const args = { slug: null, outputDir: null, only: [], timeoutMs: DEFAULT_TIMEOUT_MS, correction: "", dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--slug") args.slug = argv[++i];
    else if (token === "--output-dir") args.outputDir = path.resolve(argv[++i]);
    else if (token === "--only") args.only.push(...argv[++i].split(",").map((v) => v.trim().toLowerCase()).filter(Boolean));
    else if (token === "--timeout-ms") args.timeoutMs = Number(argv[++i]);
    else if (token === "--correction") args.correction = argv[++i];
    else if (token === "--dry-run") args.dryRun = true;
  }
  return args;
}

export async function runImageStage(options) {
  const { slug } = options;
  if (!slug) throw new Error("--slug is required");
  for (const canonical of CANONICAL) if (!existsSync(canonical)) throw new Error(`canonical_missing:${canonical}`);
  const planPath = path.join(ROOT, "drafts", "refinement", slug, "slide_plan.md");
  if (!existsSync(planPath)) throw new Error(`slide_plan_missing:${planPath}`);
  const allItems = parseSlidePlan(readFileSync(planPath, "utf8"));
  const items = options.only?.length ? allItems.filter((item) => options.only.includes(item.id)) : allItems;
  if (!items.length) throw new Error("no_generation_items");
  const outputDir = options.outputDir || path.join(process.env.SUMALABO_CODEX_IMAGE_OUTPUT_ROOT || DEFAULT_OUTPUT_ROOT, slug);
  if (options.dryRun) return { ok: true, dryRun: true, slug, outputDir, items };
  mkdirSync(outputDir, { recursive: true });

  const seenShas = new Set();
  const outputs = [];
  for (const item of items) {
    const outputFile = path.join(outputDir, `${item.id}.png`);
    const beforeSha = existsSync(outputFile) ? sha256(outputFile) : null;
    const prompt = buildPrompt({ item, outputFile, planPath, correction: options.correction });
    const result = await runCodex({ prompt, outputDir, timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS });
    const runEntry = {
      item: item.id,
      startedAt: new Date(Date.now() - result.elapsedMs).toISOString(),
      finishedAt: new Date().toISOString(),
      elapsedMs: result.elapsedMs,
      exitCode: result.exitCode,
      usage: result.usage,
      failureCondition: result.failureCondition,
    };
    if (!result.ok) {
      appendUsage(slug, runEntry);
      const fallback = recordFallback(slug, result.failureCondition, { item: item.id, exitCode: result.exitCode });
      return { ok: false, fallbackRequired: true, condition: result.failureCondition, item: item.id, fallback };
    }
    try {
      const verification = verifyOutput(item, outputFile, beforeSha, seenShas);
      Object.assign(runEntry, verification, { outputFile });
      outputs.push({ id: item.id, path: outputFile, ...verification });
    } catch (error) {
      runEntry.failureCondition = "cli_abnormal_exit";
      runEntry.verificationError = String(error.message || error);
      appendUsage(slug, runEntry);
      const fallback = recordFallback(slug, "cli_abnormal_exit", { item: item.id, verificationError: runEntry.verificationError });
      return { ok: false, fallbackRequired: true, condition: "cli_abnormal_exit", item: item.id, fallback };
    }
    appendUsage(slug, runEntry);
  }

  const prior = readJson(manifestPath(slug), { slug, transport: "codex_exec", outputs: [] });
  const byId = new Map(prior.outputs.map((entry) => [entry.id, entry]));
  for (const output of outputs) byId.set(output.id, output);
  const manifest = {
    slug,
    transport: "codex_exec",
    outputDir,
    canonicalImages: CANONICAL,
    outputs: [...byId.values()],
    completedAt: new Date().toISOString(),
  };
  writeJson(manifestPath(slug), manifest);
  markGenerated(slug, manifest.outputs);
  return { ok: true, ...manifest };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  try {
    const result = await runImageStage(args);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 10;
  } catch (error) {
    console.error(JSON.stringify({ ok: false, error: String(error.message || error) }));
    process.exitCode = 1;
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) await main();
