#!/usr/bin/env node
// scripts/run/slide-plan-finalize.mjs
//
// Driver: orchestrator から呼ばれ、PR-A の generateSlidePlan を実行して
// drafts/slides/{slug}/slide-plan.json を書き出す。
//
// 入力:
//   --slug <slug>            (必須)
//   --understanding <path>   logs/understanding/{slug}.json (必須)
//   --draft <path>           drafts/generated/{slug}.md (任意。本文要約として活用)
//   --out <path>             書き出し先 (任意、default drafts/slides/{slug}/slide-plan.json)
//   --max-slides <int>       上限 (任意、default 8)
//
// 出力 (stdout, JSON):
//   {
//     ok: true,
//     slug, slidePlanPath, count, slideNeeded,
//     reason
//   }
//   または
//   { ok: false, reason }
//
// 副作用:
//   - drafts/slides/{slug}/slide-plan.json を書き出す
//   - drafts/slides/{slug}/ ディレクトリを作成
//
// 終了コード: 0 (成功) / 非 0 (失敗)
// secret は読まない / ログにも出さない

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { generateSlidePlan } from "../sumahon/generate-slide-plan.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..");

function parseArgs(argv) {
  const out = { slug: "", understanding: "", draft: "", out: "", maxSlides: 8 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    if (a === "--slug" && next) { out.slug = next; i++; }
    else if (a === "--understanding" && next) { out.understanding = next; i++; }
    else if (a === "--draft" && next) { out.draft = next; i++; }
    else if (a === "--out" && next) { out.out = next; i++; }
    else if (a === "--max-slides" && next) { out.maxSlides = parseInt(next, 10) || 8; i++; }
  }
  return out;
}

function reportAndExit(payload, code) {
  process.stdout.write(JSON.stringify(payload) + "\n");
  process.exit(code);
}

const args = parseArgs(process.argv);
if (!args.slug) reportAndExit({ ok: false, reason: "slug_required" }, 2);
if (!args.understanding) reportAndExit({ ok: false, reason: "understanding_required" }, 2);

const understandingAbs = path.isAbsolute(args.understanding)
  ? args.understanding
  : path.join(projectRoot, args.understanding);
if (!fs.existsSync(understandingAbs)) {
  reportAndExit({ ok: false, reason: "understanding_not_found", path: understandingAbs }, 3);
}

let understanding;
try {
  understanding = JSON.parse(fs.readFileSync(understandingAbs, "utf-8"));
} catch (e) {
  reportAndExit({ ok: false, reason: "understanding_unparseable", detail: String(e.message).slice(0, 200) }, 4);
}

let bodySummary;
if (args.draft) {
  const draftAbs = path.isAbsolute(args.draft) ? args.draft : path.join(projectRoot, args.draft);
  if (fs.existsSync(draftAbs)) {
    bodySummary = fs.readFileSync(draftAbs, "utf-8");
  }
}

let plan;
try {
  plan = generateSlidePlan({ understanding, bodySummary, maxSlides: args.maxSlides });
} catch (e) {
  reportAndExit({ ok: false, reason: "plan_generation_threw", detail: String(e.message).slice(0, 200) }, 5);
}

const outPath = args.out
  ? (path.isAbsolute(args.out) ? args.out : path.join(projectRoot, args.out))
  : path.join(projectRoot, "drafts", "slides", args.slug, "slide-plan.json");

fs.mkdirSync(path.dirname(outPath), { recursive: true });
const planPayload = {
  slug: args.slug,
  slideNeeded: understanding.slideNeeded !== false,
  generatedAt: new Date().toISOString(),
  ...plan,
};
fs.writeFileSync(outPath, JSON.stringify(planPayload, null, 2), "utf-8");

reportAndExit({
  ok: true,
  slug: args.slug,
  slidePlanPath: path.relative(projectRoot, outPath).replace(/\\/g, "/"),
  count: plan.count,
  slideNeeded: planPayload.slideNeeded,
  reason: plan.reason,
}, 0);
