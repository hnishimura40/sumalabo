#!/usr/bin/env node
// scripts/automation/phase-a-orchestrator.mjs — Phase A 無人オーケストレータ (L3 コア)。
//
// ゴール: `npm run article -- --theme "テーマ1行"` の 1 コマンドで Phase A
// (research → ChatGPT Refinement Loop → スライド9枚 → ファクトチェック → WebP →
//  MDX → gate → build → PR → Preview → 通知) を完走させる状態機械。
//
// 設計:
//   - 各ステップ完了時に logs/article/{slug}.state.json へチェックポイントを書く。
//     中断しても同コマンドで途中から再開できる（worktree 事故の教訓）
//   - ステップは 2 種類:
//       script   … 本スクリプトが直接実行する（gate / WebP / PR / finalize など）
//       assisted … ChatGPT ブラウザ操作・画像読解など Claude Code が実行する。
//                  本スクリプトは「NEXT ACTION」(手順+頑丈化チェックリスト) を出力して
//                  exit 10 で停止し、完了後に `--advance <step> [--result <path>]` で進める
//   - 有料 API は一切使わない（記事/画像 = ChatGPT サブスクのブラウザ、画像FC = Claude 自身）
//   - リトライは各ステップ 2 回まで。超えたら state を保存して停止・通知（無理に進まない）
//   - 再開時、final_article が 7 日超なら鮮度チェック（公式再取得）ステップへ差し戻す
//
// 使い方:
//   node scripts/automation/phase-a-orchestrator.mjs --theme "テーマ1行" --slug <slug>
//   node scripts/automation/phase-a-orchestrator.mjs --slug <slug>                 # 再開
//   node scripts/automation/phase-a-orchestrator.mjs --slug <slug> --status       # 状態表示
//   node scripts/automation/phase-a-orchestrator.mjs --slug <slug> --advance <step> [--result <path>]
//   node scripts/automation/phase-a-orchestrator.mjs --slug <slug> --fail <step> --reason "..."
//
// 終了コード: 0=完走 or 状態表示 / 10=assisted ステップ待ち / 20=リトライ上限で停止 / 1=エラー / 2=引数

import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import process from "node:process";
import { gate } from "./autonomy.mjs";
import { notifyAutonomyEvent } from "./autonomy-notify.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const STUB = process.env.ORCH_STUB === "1"; // テスト: script ステップを no-op 化
const MAX_ATTEMPTS = 2;
const FRESHNESS_DAYS = 7;

// ---------- ステップ定義（順序どおり） ----------
export const STEPS = [
  { name: "init", type: "script" },
  { name: "freshness_check", type: "script" },
  { name: "chatgpt_turn1_research", type: "assisted", label: "Turn1: Research Pass（公式・一次情報の調査）" },
  { name: "chatgpt_turn2_selection", type: "assisted", label: "Turn2: Editorial Selection（採用/不採用の取捨選択）" },
  { name: "chatgpt_turn3_draft", type: "assisted", label: "Turn3: 本文ドラフト（lead-first）" },
  { name: "chatgpt_turn4_review", type: "assisted", label: "Turn4: セルフレビュー（禁則・断定・線引き）" },
  { name: "chatgpt_turn5_final", type: "assisted", label: "Turn5: 最終確定稿" },
  { name: "chatgpt_turn6_slideplan", type: "assisted", label: "Turn6: slide_plan（8枚+サムネ体験図）" },
  { name: "save_drafts", type: "script" },
  { name: "gate_draft", type: "script" },
  { name: "generate_images", type: "assisted", label: "スライド8枚+サムネ生成（正本添付・character-sheet 準拠）" },
  { name: "factcheck_images", type: "assisted", label: "画像ファクトチェック（Claude が画像を読み slide_plan と突き合わせ）" },
  { name: "webp_convert", type: "script" },
  { name: "write_mdx", type: "assisted", label: "MDX 作成（final_article v→ 記事テンプレ準拠）" },
  { name: "commit_pr", type: "script" },
  { name: "finalize", type: "script" },
];

const REQUIRED_DRAFTS = [
  "research_report.md", "editorial_selection.md", "draft_article.md",
  "review_report.md", "final_article.md", "slide_plan.md",
];

// ---------- 頑丈化チェックリスト（この数日の 4 障害への対策。assisted 出力に毎回添付） ----------
const HARDENING = `
【ChatGPT ブラウザ操作の頑丈化チェックリスト（必須）】
 1. タブ分離: 自動化専用のタブグループ/ウィンドウを使う。人間の作業タブ・別作業のタブを流用しない。
    操作前に document.visibilityState === "visible" のタブだけを対象にする（タブ混線対策）
 2. 送信の二段構え: 送信は要素特定（send ボタンの DOM）→ クリック → 3 秒後に composer が
    空になったか読み戻して確認。残っていれば composer に focus して Enter キー（座標クリック非依存）
 3. 貼り付け検証: 入力後に composer の innerText を読み戻して意図した文字列と前方一致するか検証。
    不一致なら selectAll → delete で全消去 → 再入力（貼り付け破壊対策）
 4. 応答待ち: ポーリング（10 秒間隔）+ 最大待ち時間（テキスト 5 分 / 画像 4 分）。
    タブ無応答（スクリプト実行がタイムアウト）なら新規タブを作成し会話 URL で復帰（タブ死亡対策）
 5. リトライは 2 回まで。ダメなら --fail で記録し停止（オーケストレータが通知する）`;

// ---------- state I/O ----------
function statePath(slug) {
  return path.join(ROOT, "logs", "article", `${slug}.state.json`);
}

export function loadState(slug) {
  const p = statePath(slug);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf-8"));
}

export function saveState(state) {
  const p = statePath(state.slug);
  mkdirSync(path.dirname(p), { recursive: true });
  state.updatedAt = new Date().toISOString();
  writeFileSync(p, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

export function newState({ slug, theme }) {
  return {
    slug,
    theme,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    halted: false,
    steps: Object.fromEntries(STEPS.map((s) => [s.name, { status: "pending", attempts: 0 }])),
  };
}

export function currentStep(state) {
  for (const s of STEPS) {
    if (state.steps[s.name].status !== "done") return s;
  }
  return null;
}

// ---------- script ステップ実装 ----------
function run(cmd, args) {
  if (STUB) return { status: 0 };
  return spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", env: process.env, shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(cmd) });
}

const scriptSteps = {
  init(state) {
    // autonomy ゲート（finalize フェーズ扱い: paused なら開始しない）
    const g = gate({ phase: "finalize", trigger: "manual" });
    if (!g.allowed) return { ok: false, reason: `autonomy_${g.reason}` };
    mkdirSync(path.join(ROOT, "logs", "article"), { recursive: true });
    mkdirSync(path.join(ROOT, "drafts", "refinement", state.slug), { recursive: true });
    return { ok: true, data: { autonomyLevel: g.level } };
  },

  freshness_check(state) {
    // 再開時: final_article が 7 日超なら research からやり直し（CLAUDE.md 鮮度ルール）
    const fa = path.join(ROOT, "drafts", "refinement", state.slug, "final_article.md");
    if (existsSync(fa)) {
      const ageDays = (Date.now() - statSync(fa).mtimeMs) / 86400000;
      if (ageDays > FRESHNESS_DAYS) {
        for (const s of STEPS) {
          if (s.name.startsWith("chatgpt_")) state.steps[s.name] = { status: "pending", attempts: 0 };
        }
        return { ok: true, data: { stale: true, ageDays: Math.round(ageDays) } };
      }
      return { ok: true, data: { stale: false, ageDays: Math.round(ageDays * 10) / 10 } };
    }
    return { ok: true, data: { stale: false, newArticle: true } };
  },

  save_drafts(state) {
    if (STUB) return { ok: true };
    const dir = path.join(ROOT, "drafts", "refinement", state.slug);
    const missing = REQUIRED_DRAFTS.filter((f) => !existsSync(path.join(dir, f)));
    if (missing.length) return { ok: false, reason: `drafts_missing: ${missing.join(", ")}` };
    return { ok: true };
  },

  gate_draft(state) {
    const r = run(process.execPath, [path.join(ROOT, "scripts", "sumalabo-gate.mjs"), "--slug", state.slug, "--stage", "draft"]);
    return r.status === 0 ? { ok: true } : { ok: false, reason: "gate_draft_failed" };
  },

  webp_convert(state) {
    if (STUB) return { ok: true };
    // factcheck_images の結果に含まれる mapping（logs/article/{slug}.images.json）を変換
    const mapPath = path.join(ROOT, "logs", "article", `${state.slug}.images.json`);
    if (!existsSync(mapPath)) return { ok: false, reason: "images_json_missing（factcheck_images の --result で作成される）" };
    const map = JSON.parse(readFileSync(mapPath, "utf-8"));
    const jobs = [
      ...map.slides.map((s2) => [s2.src, path.join(ROOT, "public", "images", "articles", state.slug, s2.name), 1280, 1600]),
      [map.thumbnail.src, path.join(ROOT, "public", "images", "thumbnails", `${state.slug}.webp`), 1600, 900],
    ];
    const script = `
const sharp = require("sharp");
const jobs = ${JSON.stringify(jobs)};
(async () => {
  for (const [src, dst, w, h] of jobs) {
    require("fs").mkdirSync(require("path").dirname(dst), { recursive: true });
    let q = 82, buf;
    for (; q >= 40; q -= 8) {
      buf = await sharp(src).resize(w, h, { fit: "fill" }).webp({ quality: q }).toBuffer();
      if (buf.length <= 500 * 1024) break;
    }
    require("fs").writeFileSync(dst, buf);
    console.log(dst.split(/[\\\\/]/).pop(), Math.round(buf.length / 1024) + "KB");
  }
})();`;
    const r = spawnSync(process.execPath, ["-e", script], { cwd: ROOT, stdio: "inherit" });
    return r.status === 0 ? { ok: true } : { ok: false, reason: "webp_convert_failed" };
  },

  commit_pr(state) {
    if (STUB) return { ok: true, data: { prUrl: "https://github.com/stub/pr/0" } };
    const slug = state.slug;
    const branch = `preview/${slug}`;
    const sh = (args) => spawnSync("git", args, { cwd: ROOT, stdio: "pipe", encoding: "utf-8" });
    const cur = sh(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
    if (cur !== branch) {
      const sw = sh(["switch", "-c", branch]);
      if (sw.status !== 0) {
        const sw2 = sh(["switch", branch]);
        if (sw2.status !== 0) return { ok: false, reason: "branch_switch_failed" };
      }
    }
    // 明示パスのみ add（git add . 禁止）
    const paths = [
      `content/articles/${slug}.mdx`,
      `public/images/articles/${slug}`,
      `public/images/thumbnails/${slug}.webp`,
      `drafts/refinement/${slug}`,
    ];
    for (const p of paths) sh(["add", p]);
    const ci = sh(["commit", "-m", `feat(article): ${state.theme || slug}（Phase Aオーケストレータ経由）\n\nCo-Authored-By: Claude Fable 5 <noreply@anthropic.com>`]);
    if (ci.status !== 0 && !/nothing to commit/.test(ci.stdout + ci.stderr)) return { ok: false, reason: "commit_failed" };
    const push = sh(["push", "-u", "origin", branch]);
    if (push.status !== 0) return { ok: false, reason: "push_failed" };
    const prList = spawnSync("gh", ["pr", "list", "--head", branch, "--json", "url", "--jq", ".[0].url"], { cwd: ROOT, stdio: "pipe", encoding: "utf-8" });
    let prUrl = (prList.stdout || "").trim();
    if (!prUrl) {
      const pr = spawnSync("gh", ["pr", "create", "--base", "main", "--head", branch, "--fill"], { cwd: ROOT, stdio: "pipe", encoding: "utf-8" });
      if (pr.status !== 0) return { ok: false, reason: "pr_create_failed" };
      prUrl = (pr.stdout || "").trim().split("\n").pop();
    }
    return { ok: true, data: { prUrl, branch } };
  },

  finalize(state) {
    if (STUB) return { ok: true };
    const prUrl = state.steps.commit_pr.data?.prUrl || "";
    const title = state.steps.write_mdx.data?.title || state.theme || state.slug;
    const r = run(process.execPath, [
      path.join(ROOT, "scripts", "run", "phase-a-finalize.mjs"),
      "--slug", state.slug,
      "--title", title,
      "--branch", `preview/${state.slug}`,
      "--prUrl", prUrl,
      "--thumbnail", `images/thumbnails/${state.slug}.webp`,
    ]);
    return r.status === 0 ? { ok: true } : { ok: false, reason: "finalize_failed" };
  },
};

// ---------- assisted ステップの指示文 ----------
function assistedInstruction(state, step) {
  const slug = state.slug;
  const dir = `drafts/refinement/${slug}`;
  const common = `\n完了したら:\n  node scripts/automation/phase-a-orchestrator.mjs --slug ${slug} --advance ${step.name}${step.name === "factcheck_images" ? " --result logs/article/" + slug + ".factcheck.json" : ""}\n失敗したら:\n  node scripts/automation/phase-a-orchestrator.mjs --slug ${slug} --fail ${step.name} --reason "..."\n${HARDENING}`;
  const map = {
    chatgpt_turn1_research: `ChatGPT「すまラボ台本」プロジェクトで新規チャットを開き、テーマ「${state.theme}」の Research Pass を実行。公式一次情報を根拠に facts/claims/uncertain を区分した research_report を作らせ、${dir}/research_report.md に保存（出所ヘッダ付き）。`,
    chatgpt_turn2_selection: `同チャットで Editorial Selection（採用/限定採用/不採用）→ ${dir}/editorial_selection.md に保存。`,
    chatgpt_turn3_draft: `同チャットで本文ドラフト（lead-first / 噛み砕き主軸 / 判断は補助）→ ${dir}/draft_article.md に保存。`,
    chatgpt_turn4_review: `同チャットでセルフレビュー（日付数値整合 / 煽り断定 / 禁則語 / 線引き / 旧情報残存）→ ${dir}/review_report.md に保存。`,
    chatgpt_turn5_final: `レビュー反映の確定稿 → ${dir}/final_article.md に保存。`,
    chatgpt_turn6_slideplan: `slide_plan（本文スライド8枚 4:5 1280×1600 + サムネ16:9 体験図方針）→ ${dir}/slide_plan.md に保存。サムネは assets/characters/character-sheet.md の「体験図」3型から選ぶこと。**サムネは同 sheet の「衣装は変えることを基本」に従い、記事テーマから連想される衣装・小道具・シチュエーションを必ず1つ選んで slide_plan に明記する（認識アンカーは不変・露出過多NG）。スライド8枚側は標準衣装で一貫。**`,
    generate_images: `同チャットに正本画像（assets/characters/himari-canonical.png → labomaru-canonical.png を1枚ずつ）を添付し、character-sheet.md の仕様を厳守して slide_plan の順に 8+1 枚を生成。**サムネは slide_plan で選んだテーマ連想の衣装・小道具を反映して生成（標準衣装のまま出さない。認識アンカーは不変）。** 全てダウンロードし D:\\downloads に保存。`,
    factcheck_images: `ダウンロードした 9 枚を Claude 自身が Read で読み、slide_plan と突き合わせて数値・固有名詞・誤字・ブランド表記を検査。**キャラ破綻は認識アンカー（ひまり=金髪サイドテール・顔立ち・頭身／らぼまる=白い卵型ボディ・アンテナ・胸のハートボタン）で判定（服・小道具の違いは破綻ではない）。サムネは衣装がテーマに沿って標準から変えてあるかも確認**。結果を logs/article/${slug}.factcheck.json に保存:\n  { "pass": true|false, "regenerate": [{"which":"slide06","reason":"..."}], "slides": [{"src":"D:/downloads/xxx.png","name":"slide01-xxx.webp"}...], "thumbnail": {"src":"D:/downloads/yyy.png"}, "thumbnailCostume": "themed" | "standard_improvable" }\nサムネが標準衣装のまま（standard_improvable）でも崩れではないので needs_revision にはしない（注意記録のみ）。不合格があれば該当のみ再生成（最大2回）してから advance。pass 時は slides/thumbnail のマッピングが logs/article/${slug}.images.json にコピーされる。`,
    write_mdx: `final_article を MDX 化（frontmatter 12キー / lead-first / スライド8枚を article-slide-section で埋め込み / 禁則語なし）→ content/articles/${slug}.mdx。前記事への内部リンクがテーマ上自然なら本文に入れる。`,
  };
  return `\n=== NEXT ACTION [${step.name}] ${step.label} ===\n${map[step.name] || "(手順未定義)"}\n${common}`;
}

// ---------- advance/fail 時の付随処理 ----------
function onAdvance(state, stepName, resultPath) {
  if (stepName === "factcheck_images" && resultPath) {
    const fc = JSON.parse(readFileSync(resultPath, "utf-8"));
    if (!fc.pass) return { ok: false, reason: "factcheck_not_passed（regenerate を処理してから advance する）" };
    // WebP 変換用マッピングへコピー
    const mapPath = path.join(ROOT, "logs", "article", `${state.slug}.images.json`);
    writeFileSync(mapPath, JSON.stringify({ slides: fc.slides, thumbnail: fc.thumbnail }, null, 2) + "\n", "utf-8");
    return { ok: true, data: { factcheck: { pass: true, regenerated: (fc.regenerated || []).length } } };
  }
  if (stepName === "write_mdx") {
    const mdx = path.join(ROOT, "content", "articles", `${state.slug}.mdx`);
    if (!STUB && !existsSync(mdx)) return { ok: false, reason: "mdx_not_found" };
    let title = null;
    if (existsSync(mdx)) {
      const m = readFileSync(mdx, "utf-8").match(/^title:\s*"([^"]+)"/m);
      title = m ? m[1] : null;
    }
    return { ok: true, data: { title } };
  }
  return { ok: true };
}

// ---------- メインループ ----------
async function halt(state, step, reason) {
  state.halted = true;
  state.haltReason = `${step.name}: ${reason}`;
  saveState(state);
  console.error(`\n[orchestrator] STOP: ${step.name} が ${MAX_ATTEMPTS} 回失敗しました (${reason})。state を保存して停止します。`);
  await notifyAutonomyEvent({ slug: state.slug, status: "orchestrator_blocked", title: `[autonomy] Phase A停止: ${state.slug} @${step.name} (${reason})` }).catch(() => {});
  process.exitCode = 20;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = { theme: null, slug: null, advance: null, fail: null, reason: null, result: null, status: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--theme") args.theme = argv[++i];
    else if (a === "--slug") args.slug = argv[++i];
    else if (a === "--advance") args.advance = argv[++i];
    else if (a === "--fail") args.fail = argv[++i];
    else if (a === "--reason") args.reason = argv[++i];
    else if (a === "--result") args.result = argv[++i];
    else if (a === "--status") args.status = true;
  }
  if (!args.slug) {
    console.error('usage: --theme "..." --slug <slug> | --slug <slug> [--status|--advance <step>|--fail <step> --reason "..."]');
    process.exitCode = 2;
    return;
  }

  let state = loadState(args.slug);
  if (!state) {
    if (!args.theme) {
      console.error("新規記事には --theme が必要です。");
      process.exitCode = 2;
      return;
    }
    state = newState({ slug: args.slug, theme: args.theme });
    saveState(state);
  }

  if (args.status) {
    console.log(JSON.stringify({ slug: state.slug, theme: state.theme, halted: state.halted || false, steps: Object.fromEntries(Object.entries(state.steps).map(([k, v]) => [k, v.status])) }, null, 2));
    return;
  }

  if (args.fail) {
    const st = state.steps[args.fail];
    if (!st) { console.error(`unknown step: ${args.fail}`); process.exitCode = 2; return; }
    st.attempts++;
    st.lastError = args.reason || "unspecified";
    const stepDef = STEPS.find((s) => s.name === args.fail);
    if (st.attempts >= MAX_ATTEMPTS) return halt(state, stepDef, st.lastError);
    saveState(state);
    console.log(`[orchestrator] ${args.fail} failed (attempt ${st.attempts}/${MAX_ATTEMPTS})。再試行してください。`);
    console.log(assistedInstruction(state, stepDef));
    process.exitCode = 10;
    return;
  }

  if (args.advance) {
    const st = state.steps[args.advance];
    if (!st) { console.error(`unknown step: ${args.advance}`); process.exitCode = 2; return; }
    const r = onAdvance(state, args.advance, args.result);
    if (!r.ok) {
      console.error(`[orchestrator] advance 拒否: ${r.reason}`);
      process.exitCode = 1;
      return;
    }
    st.status = "done";
    st.doneAt = new Date().toISOString();
    if (r.data) st.data = { ...(st.data || {}), ...r.data };
    state.halted = false;
    saveState(state);
    console.log(`[orchestrator] ${args.advance} done。続行します...`);
  }

  if (state.halted) {
    console.error(`[orchestrator] halted: ${state.haltReason}。--advance か --fail で状態を更新してください。`);
    process.exitCode = 20;
    return;
  }

  // script ステップを連続実行し、assisted に当たったら指示を出して停止
  for (;;) {
    const step = currentStep(state);
    if (!step) {
      console.log(`\n=== PHASE A COMPLETE: ${state.slug} ===`);
      console.log("Human Review Checkpoint で停止します（公開はユーザー了承後）。");
      return;
    }
    if (step.type === "assisted") {
      console.log(assistedInstruction(state, step));
      process.exitCode = 10;
      return;
    }
    const impl = scriptSteps[step.name];
    const r = await impl(state);
    if (!r.ok) {
      const st = state.steps[step.name];
      st.attempts++;
      st.lastError = r.reason;
      if (st.attempts >= MAX_ATTEMPTS) return halt(state, step, r.reason);
      saveState(state);
      console.error(`[orchestrator] ${step.name} failed (attempt ${st.attempts}/${MAX_ATTEMPTS}): ${r.reason}。同コマンドで再試行できます。`);
      process.exitCode = 1;
      return;
    }
    state.steps[step.name].status = "done";
    state.steps[step.name].doneAt = new Date().toISOString();
    if (r.data) state.steps[step.name].data = r.data;
    saveState(state);
    console.log(`[orchestrator] ${step.name} ✓`);
  }
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isDirectRun) {
  main().catch((err) => {
    console.error("[orchestrator fatal]", err && err.stack ? err.stack : err);
    process.exitCode = 1;
  });
}
