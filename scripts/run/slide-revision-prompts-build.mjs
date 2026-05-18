#!/usr/bin/env node
// scripts/run/slide-revision-prompts-build.mjs
//
// Driver: factcheck.json を読み、verdict=needs_revision の slide だけ
// generateSlideRevisionPrompt を呼んで
// drafts/slides/{slug}/revision-prompts/{id}.md を書き出す。
//
// 入力:
//   --slug <slug>            (必須)
//   --understanding <path>   (必須)
//   --plan <path>            (必須)
//   --factcheck <path>       drafts/slides/{slug}/factcheck.json (必須)
//   --width <int>            default 1672
//   --height <int>           default 941
//
// 出力 (stdout, JSON):
//   {
//     ok, slug, revisionPromptDir,
//     revisionsNeeded: int,
//     prompts: [{ id, path, verdict }, ...]
//   }
//
// 終了コード: 0 / 非 0

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { generateSlideRevisionPrompt } from "../sumahon/generate-slide-revision-prompt.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const out = { slug: "", understanding: "", plan: "", factcheck: "", width: 1672, height: 941 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i], n = argv[i + 1];
    if (a === "--slug" && n) { out.slug = n; i++; }
    else if (a === "--understanding" && n) { out.understanding = n; i++; }
    else if (a === "--plan" && n) { out.plan = n; i++; }
    else if (a === "--factcheck" && n) { out.factcheck = n; i++; }
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
if (!args.slug || !args.understanding || !args.plan || !args.factcheck) {
  emit({ ok: false, reason: "slug_understanding_plan_factcheck_required" }, 2);
}

function resolveAbs(p) { return path.isAbsolute(p) ? p : path.join(projectRoot, p); }
const understandingAbs = resolveAbs(args.understanding);
const planAbs = resolveAbs(args.plan);
const factcheckAbs = resolveAbs(args.factcheck);

if (!fs.existsSync(understandingAbs)) emit({ ok: false, reason: "understanding_not_found" }, 3);
if (!fs.existsSync(planAbs)) emit({ ok: false, reason: "plan_not_found" }, 3);
if (!fs.existsSync(factcheckAbs)) emit({ ok: false, reason: "factcheck_not_found" }, 3);

let understanding, plan, factcheck;
try { understanding = JSON.parse(fs.readFileSync(understandingAbs, "utf-8")); } catch (e) {
  emit({ ok: false, reason: "understanding_unparseable" }, 4);
}
try { plan = JSON.parse(fs.readFileSync(planAbs, "utf-8")); } catch (e) {
  emit({ ok: false, reason: "plan_unparseable" }, 4);
}
try { factcheck = JSON.parse(fs.readFileSync(factcheckAbs, "utf-8")); } catch (e) {
  emit({ ok: false, reason: "factcheck_unparseable" }, 4);
}

const factcheckSlides = Array.isArray(factcheck.slides) ? factcheck.slides : [];
const slidesById = new Map((plan.slides || []).map((s) => [s.id, s]));

const revisionPromptDir = path.join(projectRoot, "drafts", "slides", args.slug, "revision-prompts");
fs.mkdirSync(revisionPromptDir, { recursive: true });

const results = [];
for (const entry of factcheckSlides) {
  if (entry.verdict !== "needs_revision") continue;
  const slide = slidesById.get(entry.id);
  if (!slide) continue;
  let promptText;
  try {
    promptText = generateSlideRevisionPrompt({
      slide,
      factcheckEntry: entry,
      understanding,
      widthPx: args.width,
      heightPx: args.height,
    });
  } catch (e) {
    emit({ ok: false, reason: "revision_prompt_threw", slideId: entry.id, detail: String(e.message).slice(0, 200) }, 5);
  }
  const out = path.join(revisionPromptDir, `${entry.id}.md`);
  fs.writeFileSync(out, promptText, "utf-8");
  results.push({ id: entry.id, path: path.relative(projectRoot, out).replace(/\\/g, "/"), verdict: entry.verdict });
}

emit({
  ok: true,
  slug: args.slug,
  revisionPromptDir: path.relative(projectRoot, revisionPromptDir).replace(/\\/g, "/"),
  revisionsNeeded: results.length,
  prompts: results,
}, 0);
