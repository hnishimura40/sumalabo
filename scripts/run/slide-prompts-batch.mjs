#!/usr/bin/env node
// scripts/run/slide-prompts-batch.mjs
//
// Driver: PR-A の generateSlidePrompt を slidePlan の全 slide に対して呼び、
// drafts/slides/{slug}/prompts/{id}.md を書き出す。
//
// 入力:
//   --slug <slug>            (必須)
//   --understanding <path>   logs/understanding/{slug}.json (必須)
//   --plan <path>            drafts/slides/{slug}/slide-plan.json (必須)
//   --width <int>            default 1672
//   --height <int>           default 941
//
// 出力 (stdout, JSON):
//   { ok, slug, slidePromptDir, count, prompts: [{ id, path }, ...] }
//
// 副作用:
//   - drafts/slides/{slug}/prompts/{id}.md を slide ごとに書き出す
//
// 終了コード: 0 / 非 0

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { generateSlidePrompt } from "../sumahon/generate-slide-prompt.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const out = { slug: "", understanding: "", plan: "", width: 1672, height: 941 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i], n = argv[i + 1];
    if (a === "--slug" && n) { out.slug = n; i++; }
    else if (a === "--understanding" && n) { out.understanding = n; i++; }
    else if (a === "--plan" && n) { out.plan = n; i++; }
    else if (a === "--width" && n) { out.width = parseInt(n, 10) || 1672; i++; }
    else if (a === "--height" && n) { out.height = parseInt(n, 10) || 941; i++; }
  }
  return out;
}

function emit(payload, code) {
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(code);
}

const args = parseArgs(process.argv);
if (!args.slug) emit({ ok: false, reason: "slug_required" }, 2);
if (!args.understanding) emit({ ok: false, reason: "understanding_required" }, 2);
if (!args.plan) emit({ ok: false, reason: "plan_required" }, 2);

function resolveAbs(p) {
  return path.isAbsolute(p) ? p : path.join(projectRoot, p);
}

const understandingAbs = resolveAbs(args.understanding);
const planAbs = resolveAbs(args.plan);

if (!fs.existsSync(understandingAbs)) emit({ ok: false, reason: "understanding_not_found" }, 3);
if (!fs.existsSync(planAbs)) emit({ ok: false, reason: "plan_not_found" }, 3);

let understanding, plan;
try {
  understanding = JSON.parse(fs.readFileSync(understandingAbs, "utf-8"));
} catch (e) {
  emit({ ok: false, reason: "understanding_unparseable" }, 4);
}
try {
  plan = JSON.parse(fs.readFileSync(planAbs, "utf-8"));
} catch (e) {
  emit({ ok: false, reason: "plan_unparseable" }, 4);
}

const slides = Array.isArray(plan.slides) ? plan.slides : [];
const slidePromptDir = path.join(projectRoot, "drafts", "slides", args.slug, "prompts");
fs.mkdirSync(slidePromptDir, { recursive: true });

const results = [];
for (const slide of slides) {
  let promptText;
  try {
    promptText = generateSlidePrompt({
      slide,
      understanding,
      widthPx: args.width,
      heightPx: args.height,
    });
  } catch (e) {
    emit({ ok: false, reason: "prompt_generation_threw", slideId: slide.id, detail: String(e.message).slice(0, 200) }, 5);
  }
  const out = path.join(slidePromptDir, `${slide.id}.md`);
  fs.writeFileSync(out, promptText, "utf-8");
  results.push({ id: slide.id, path: path.relative(projectRoot, out).replace(/\\/g, "/") });
}

emit({
  ok: true,
  slug: args.slug,
  slidePromptDir: path.relative(projectRoot, slidePromptDir).replace(/\\/g, "/"),
  count: results.length,
  prompts: results,
}, 0);
