#!/usr/bin/env node
// scripts/run/slide-factcheck-prompt-build.mjs
//
// Driver: PR-A の generateSlideFactcheckPrompt を呼び、
// drafts/slides/{slug}/factcheck-prompt.md を書き出す。
// 実際の factcheck 実行 (Claude in Chrome に画像添付) は後続テスト。
//
// 入力:
//   --slug <slug>            (必須)
//   --understanding <path>   logs/understanding/{slug}.json (必須)
//   --plan <path>            drafts/slides/{slug}/slide-plan.json (必須)
//   --draft <path>           drafts/generated/{slug}.md (任意。本文要約として活用)
//   --images-dir <path>      drafts/slides/{slug}/images (任意。slide png のパス列挙用)
//
// 出力 (stdout, JSON):
//   { ok, slug, factcheckPromptPath, slideCount, imagePathsListed }
//
// 副作用:
//   - drafts/slides/{slug}/factcheck-prompt.md を書き出す
//
// 終了コード: 0 / 非 0

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { generateSlideFactcheckPrompt } from "../sumahon/generate-slide-factcheck-prompt.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const out = { slug: "", understanding: "", plan: "", draft: "", imagesDir: "" };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i], n = argv[i + 1];
    if (a === "--slug" && n) { out.slug = n; i++; }
    else if (a === "--understanding" && n) { out.understanding = n; i++; }
    else if (a === "--plan" && n) { out.plan = n; i++; }
    else if (a === "--draft" && n) { out.draft = n; i++; }
    else if (a === "--images-dir" && n) { out.imagesDir = n; i++; }
  }
  return out;
}

function emit(payload, code) {
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(code);
}

const args = parseArgs(process.argv);
if (!args.slug || !args.understanding || !args.plan) {
  emit({ ok: false, reason: "slug_understanding_plan_required" }, 2);
}

function resolveAbs(p) { return path.isAbsolute(p) ? p : path.join(projectRoot, p); }
const understandingAbs = resolveAbs(args.understanding);
const planAbs = resolveAbs(args.plan);

if (!fs.existsSync(understandingAbs)) emit({ ok: false, reason: "understanding_not_found" }, 3);
if (!fs.existsSync(planAbs)) emit({ ok: false, reason: "plan_not_found" }, 3);

let understanding, plan;
try { understanding = JSON.parse(fs.readFileSync(understandingAbs, "utf-8")); } catch (e) {
  emit({ ok: false, reason: "understanding_unparseable" }, 4);
}
try { plan = JSON.parse(fs.readFileSync(planAbs, "utf-8")); } catch (e) {
  emit({ ok: false, reason: "plan_unparseable" }, 4);
}

let bodySummary;
if (args.draft) {
  const draftAbs = resolveAbs(args.draft);
  if (fs.existsSync(draftAbs)) bodySummary = fs.readFileSync(draftAbs, "utf-8");
}

let slidePngPaths;
if (args.imagesDir) {
  const imagesDirAbs = resolveAbs(args.imagesDir);
  if (fs.existsSync(imagesDirAbs)) {
    slidePngPaths = (plan.slides || []).map((s) =>
      path.join(imagesDirAbs, `${s.id}.png`).replace(/\\/g, "/"),
    );
  }
}

let promptText;
try {
  promptText = generateSlideFactcheckPrompt({
    slidePlan: plan,
    understanding,
    bodySummary,
    slidePngPaths,
  });
} catch (e) {
  emit({ ok: false, reason: "prompt_build_threw", detail: String(e.message).slice(0, 200) }, 5);
}

const outDir = path.join(projectRoot, "drafts", "slides", args.slug);
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "factcheck-prompt.md");
fs.writeFileSync(outPath, promptText, "utf-8");

emit({
  ok: true,
  slug: args.slug,
  factcheckPromptPath: path.relative(projectRoot, outPath).replace(/\\/g, "/"),
  slideCount: (plan.slides || []).length,
  imagePathsListed: Array.isArray(slidePngPaths) && slidePngPaths.length > 0,
}, 0);
