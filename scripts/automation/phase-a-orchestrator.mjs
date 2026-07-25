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
import { recordFallback } from "./codex-image-stage.mjs";
import { markAdopted, markInspection } from "./image-output-lifecycle.mjs";
import { classifyArticleCategory } from "../sumahon/category-classification.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const STUB = process.env.ORCH_STUB === "1"; // テスト: script ステップを no-op 化
const MAX_ATTEMPTS = 2;
const FRESHNESS_DAYS = 7;

export function hasIdentityAnchorMismatch(issueText = "") {
  return /認識アンカー|別人|別キャラ|顔立ち|髪色|髪型|頭身|サイドテール|耳ビレ|首輪|アンテナ|ハート(?:ボタン|バッジ)?|体型|人型メカ|卵型ボディ/i.test(issueText);
}

function validatePerformanceBlock(text = "") {
  if (!/^##\s+演出ブロック(?:\s|（|\(|$)/m.test(text)) return { ok: false, missing: ["演出ブロック"] };
  const required = ["衣装", "小道具", "手・小道具", "ポーズ", "背景", "表情", "演出根拠"];
  const missing = required.filter((label) => !text.includes(label));
  return { ok: missing.length === 0, missing };
}

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
  { name: "generate_images", type: "script", label: "Codex exec優先でスライド8枚+サムネ生成（正本添付・工房fallback）" },
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
    category: classifyArticleCategory(theme),
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
    const slidePlanText = readFileSync(path.join(dir, "slide_plan.md"), "utf-8");
    const performance = validatePerformanceBlock(slidePlanText);
    if (!performance.ok) {
      return { ok: false, reason: `slide_plan_performance_block_missing: ${performance.missing.join(", ")}` };
    }
    return { ok: true };
  },

  gate_draft(state) {
    const r = run(process.execPath, [path.join(ROOT, "scripts", "sumalabo-gate.mjs"), "--slug", state.slug, "--stage", "draft"]);
    return r.status === 0 ? { ok: true } : { ok: false, reason: "gate_draft_failed" };
  },

  generate_images(state) {
    if (STUB) return { ok: true, data: { transport: "codex_exec", stub: true } };
    const r = spawnSync(process.execPath, [
      path.join(ROOT, "scripts", "automation", "codex-image-stage.mjs"),
      "--slug", state.slug,
    ], { cwd: ROOT, stdio: "inherit", env: process.env });
    if (r.status === 0) return { ok: true, data: { transport: "codex_exec" } };
    if (r.status === 10) {
      return {
        ok: false,
        fallback: true,
        reason: "codex_exec_fallback_required",
        data: { transport: "workshop_chat", fallbackManifest: `logs/article/${state.slug}.image-fallback.json` },
      };
    }
    return { ok: false, reason: `codex_image_stage_failed_exit_${r.status ?? "unknown"}` };
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
      // Preserve the artwork's intrinsic ratio. Unexpected source dimensions
      // must be letterboxed instead of stretching characters and diagrams.
      buf = await sharp(src)
        .resize(w, h, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .webp({ quality: q })
        .toBuffer();
      if (buf.length <= 500 * 1024) break;
    }
    require("fs").writeFileSync(dst, buf);
    console.log(dst.split(/[\\\\/]/).pop(), Math.round(buf.length / 1024) + "KB");
  }
})();`;
    const r = spawnSync(process.execPath, ["-e", script], { cwd: ROOT, stdio: "inherit" });
    if (r.status !== 0) return { ok: false, reason: "webp_convert_failed" };
    try {
      markAdopted(state.slug, jobs.map(([, destination]) => destination));
    } catch (error) {
      // 工房fallbackなどCodex outputDirを使わない経路では状態ファイルを作らない。
      console.warn(`[orchestrator] image output adoption marker skipped: ${error.message || error}`);
    }
    return { ok: true };
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
    chatgpt_turn2_selection: `同チャットで Editorial Selection（採用/限定採用/不採用）→ ${dir}/editorial_selection.md に保存。カテゴリ候補は「${state.category?.name || "ニュースをかみくだく"}」。当サイトの実体験・検証が記事の核なら hands-on を選ぶ。`,
    chatgpt_turn3_draft: `同チャットで本文ドラフト（lead-first / 噛み砕き主軸 / 判断は補助）→ ${dir}/draft_article.md に保存。`,
    chatgpt_turn4_review: `同チャットでセルフレビュー（日付数値整合 / 煽り断定 / 禁則語 / 線引き / 旧情報残存）→ ${dir}/review_report.md に保存。`,
    chatgpt_turn5_final: `レビュー反映の確定稿 → ${dir}/final_article.md に保存。`,
    chatgpt_turn6_slideplan: `slide_plan（本文スライド8枚 4:5 1280×1600 + サムネ16:9 体験図方針）→ ${dir}/slide_plan.md に保存。サムネは assets/characters/character-sheet.md の「体験図」3型から選ぶこと。**先頭付近に必ず \`## 演出ブロック\` を設け、\`衣装\`・\`小道具\`・\`ポーズ・動き\`・\`背景・状況\`・\`演出根拠\` の5欄を記事テーマから自動生成する。さらに \`スライド演出方針\` として、本文8枚で使う小道具・動き・背景（必要なら一貫したテーマ衣装）を記す。** 同一性は「顔・体型・髪型・耳ビレ・首輪・アンテナ・ハート」の正本アンカーに限定して固定し、衣装・小道具・ポーズ・背景は演出ブロックに従い自由に変える。サムネは標準衣装＋棒立ちを禁止し、記事テーマから連想される衣装・小道具・シチュエーションを最低1つ入れる。スライドも置物化を避け、比較なら2つを見比べる、検証なら道具で調べる等の動きを付ける。スライドで衣装を変える場合は8枚で一貫させる（露出過多・無関係なコスプレNG）。例:
\`## 演出ブロック\`
\`- 衣装: 検証用の作業ベスト\`
\`- 小道具: 虫眼鏡、工具、対象機器\`
\`- ポーズ・動き: 手元を調べ、らぼまるがチェックする\`
\`- 背景・状況: 明るい検品机\`
\`- 演出根拠: 「実機検証」→点検作業を体験図にする\`
\`- スライド演出方針: 衣装は一貫、小道具・ポーズ・背景は各purposeに合わせる\`
**漢字化け対策（docs/kanji_pitfalls.md）: スライドの帯・見出し・吹き出しの短い文言は、化けやすい漢字（目/未/末/微 等）を避け、ひらがな・言い換えを優先する（例「目的別」→「使い方で」）。特に1〜4文字のラベルは優先的にやさしい和語にする。** **X直接投稿を見据え、各スライドは「文字量を絞り・数字は正確に・単体で意味が通る」ことを意識（文字密度の高いスライドは X 選抜から外れ記事内専用になる）。**`,
    generate_images: `Codex exec が自動退避条件に該当したため、常設キャラ工房チャット方式へ切り替える。logs/article/${slug}.image-fallback.json の condition を確認し、slide_plan の未生成または要修正分だけを工房で生成する。**fallback のキャラ不一致は、顔・体型・髪型・耳ビレ・首輪・アンテナ・ハート等の認識アンカー不一致に限る。衣装・小道具・ポーズ・背景の変化を理由に退避しない。** 正本2枚の同一性を守りつつ、演出ブロックは維持して生成する。完了したら --advance generate_images で続行する。`,
    factcheck_images: `logs/article/${slug}.codex-images.json に記録された画像を1枚ずつ Read し、slide_plan と突き合わせて数値・固有名詞・誤字・ブランド表記を検査。**キャラ破綻は認識アンカー（ひまり=金髪サイドテール・顔立ち・頭身／らぼまる=白い卵型ボディ・黄緑アンテナ1本・胸のハートボタン・青い首輪バンド・左右の青い耳ビレ）だけで判定**。耳ビレが正本より短い・丸い傾向は warning として監視し、別キャラ化していなければ pass のまま。服・小道具・ポーズ・背景の違いは破綻ではない。**演出ブロックと照合し、衣装・小道具・ポーズ・背景が記事テーマを体験として表しているかを warning 観察項目にする。弱くても公開停止はしないが改善点を記録する。** 結果を logs/article/${slug}.factcheck.json に保存:\n  { "pass": true|false, "regenerate": [{"which":"slide06","reason":"..."}], "slides": [{"src":"D:/downloads/xxx.png","name":"slide01-xxx.webp"}...], "thumbnail": {"src":"D:/downloads/yyy.png"}, "performanceFit": "themed" | "weak_warning" }\n日本語誤字または認識アンカー不一致は、--advance 時に Codex の対象1回修正を自動実行する。修正後も不合格なら工房チャットへ自動退避する。演出が弱いだけなら warning とし、Hiroの実物レビューへ回す。不合格は該当のみ最大2回。pass 時は slides/thumbnail のマッピングが logs/article/${slug}.images.json にコピーされる。`,
    write_mdx: `final_article を MDX 化（frontmatter 12キー / lead-first / 禁則語なし）→ content/articles/${slug}.mdx。category は「${state.category?.name || "ニュースをかみくだく"}」。当サイトの実体験・検証を軸にした記事は「やってみた・検証」（hands-on）に分類する。前記事への内部リンクがテーマ上自然なら本文に入れる。**収益記事(モバイルバッテリー比較 /articles/power-bank-comparison/・USB-C充電器比較 /articles/usb-c-charger-comparison/・リコール確認 /articles/power-bank-recall-check/)への文脈リンクは、本文が実際にそのトピックに触れたときだけ自然な一文で1本まで（言及が無ければ入れない・宣伝臭NG）。記事末尾の関連ガイドカードは自動表示されるので本文の手動リンクは重複させない。定義: data/related-guides.json。**
  **publishAt は実公開見込み時刻を入れる（2026-07-14・一覧順ずれ防止）**: 固定の朝時刻（08:00 等）をデフォルトにしない。完走型なら「今」に近い時刻、後で公開予定なら公開予定時刻。未来にすると build から除外され、他記事より古いと一覧で最上位に来ない。**公開直前（Phase B deploy 前）に \`npm run normalize:publish-at -- --slug ${slug}\` を実行して実公開時刻へ自動補正し、その変更を build→commit に含めて deploy する。**
  **タイトルは「感情に刺す主タイトル＋やさしく整理するサブ」で組む（2026-07-14 バズ強化・第一候補）:**
  - 主タイトルは「読者への影響」を主語にした感情に刺す型を第一候補にする。型の例:「消える／変わる／損する＋あなた（のデータ／料金／使い方）」「まだ〇〇してるの?」「知らないと損する〇〇」。例:「Atlasは8月9日で終了へ」→「Atlasが8/9で消える。あなたのデータも」。
  - **ただし事実に反する煽りは禁止**。主タイトルの主張（消える・値上げ・終了・危険 等）と数字・固有名詞は、必ず final_article の facts で裏付けられていること（未確定を確定と言い切らない。gate の title-fact-backing 検査で弾かれる）。
  - サブタイトル（description 相当・本文リード）は従来どおり「何が変わって誰に関係あるかをやさしく整理」を維持する。主タイトルで刺し、サブと本文で落ち着かせる二段構え。
  - 「絶対」「100%」「必見」「全部〇〇化」等の断定・誇張、および既存の禁則語（普通の人 等）はタイトルにも入れない。
  **本文は v3 コンポーネントで組む（docs/article_components_v3.md 準拠・2026-07-08 有効化。お手本: content/articles/202607-claude-fable-5-free-extension-july13.mdx）:**
  - import 文を frontmatter 直後に置く（Summary30 / Callout / Chip / NumCards / Timeline / TimelineItem / CharacterBubble / Note。使うものだけ。パスは ../../src/components/article/{Name}.astro）
  - 冒頭に <Summary30>（<ol><li> で要点3〜5個・1記事1回）
  - editorial_selection の facts / claims / uncertain を確度 Callout に 1:1 マッピング（kind="facts" / "claims" / "unc"。unc は「〜時点」を明記）
  - 経緯・締切・続報は <Timeline> + <TimelineItem date="...">（今後動く点は hot）
  - 価格・日付・数量など数字が主役の要点は <NumCards items={[{num,cap},...]}>（3枚組基本・事実確認済みの数字のみ）
  - ひまり・らぼまるの会話は <CharacterBubble speaker="himari|labo" mood="...">（himari: curious/aha/explain、labo: smile/point/worried。labo worried は unc ボックス併設が定型）
  - 確度ラベルを使う場合は <Chip kind="..."> を本文から独立した位置に置く（1段落2個まで）。**「確定・報道・未確定」はChipまたは見出しのラベルとしてのみ使用し、地の文に単独で書かない。Chipの直後へ引用や本文を続けず、句読点または改行で区切る。**軽い注記は <Note>
  - **図解スライド8枚（article-slide-section + slide-reading-note + ライトボックス）と「## 参考情報」（URL2件以上）は従来どおり併用**（v3 はこれらを置き換えない）`,
  };
  map.chatgpt_turn6_slideplan += `\n**演出ブロックの追加必須欄**: \`手・小道具\` に、小道具を片手/両手のどちらで持つかと空いている手の位置を必ず書く。\`表情\` も記事の感情トーンから自動導出する。身体構造は、ひまり=腕/手/脚各2、らぼまる=腕・手・脚・足が左右各1つ（追加突起はアンテナ1本と左右の耳ビレのみ）を前提にする。`;
  map.factcheck_images += `\n**身体構造は認識アンカーとは別の公開ブロック項目**: 手がある画像は手の本数と指を最初に確認する。ひまりは腕/手/脚各2、らぼまるは腕・手・脚・足が左右各1つで、追加突起はアンテナ1本と左右の耳ビレだけ。余分な手・腕、重複、顔の破綻、物体との融合は needs_revision。日本語誤字・アンカー不一致と同様に、対象画像だけCodexで1回再生成して再検品する。`;
  return `\n=== NEXT ACTION [${step.name}] ${step.label} ===\n${map[step.name] || "(手順未定義)"}\n${common}`;
}

// ---------- advance/fail 時の付随処理 ----------
function onAdvance(state, stepName, resultPath) {
  if (stepName === "factcheck_images" && resultPath) {
    const fc = JSON.parse(readFileSync(resultPath, "utf-8"));
    if (!fc.pass) {
      const issueText = JSON.stringify(fc);
      const japaneseMismatch = /文字化け|誤字|脱字|表記|漢字|目.?自|未.?末|微.?徴|\$記号/i.test(issueText);
      const anchorMismatch = hasIdentityAnchorMismatch(issueText);
      const bodyStructureMismatch = /身体構造|四肢|手指|手が\d+本|腕が\d+本|余分な手|余分な腕|謎の手|重複.*(?:手|腕)|(?:手|腕).*重複|融合/i.test(issueText);
      if (japaneseMismatch || anchorMismatch || bodyStructureMismatch) {
        const retryCount = state.steps.factcheck_images.data?.codexTargetedRetries || 0;
        if (retryCount < 1) {
          const targets = (fc.regenerate || []).map((entry) => entry.which || entry.id).filter(Boolean);
          if (targets.length) {
            const correction = (fc.regenerate || []).map((entry) => `${entry.which || entry.id}: ${entry.reason || "検品指摘を修正"}`).join(" / ");
            const retry = spawnSync(process.execPath, [
              path.join(ROOT, "scripts", "automation", "codex-image-stage.mjs"),
              "--slug", state.slug,
              "--only", targets.join(","),
              "--correction", correction,
            ], { cwd: ROOT, stdio: "inherit", env: process.env });
            state.steps.factcheck_images.data = {
              ...(state.steps.factcheck_images.data || {}),
              codexTargetedRetries: 1,
              lastRetryAt: new Date().toISOString(),
            };
            saveState(state);
            if (retry.status === 0) {
              return { ok: false, reason: "codex_targeted_retry_completed（独立した画像検品を再実行してから advance）" };
            }
          }
        }
        const condition = retryCount >= 1 || bodyStructureMismatch
          ? "targeted_retry_exhausted"
          : (anchorMismatch ? "character_anchor_mismatch" : "japanese_text_mismatch");
        const fallbackManifest = recordFallback(state.slug, condition, { source: resultPath });
        return { ok: false, fallback: true, reason: `workshop_fallback_required:${condition}`, fallbackManifest };
      }
      return { ok: false, reason: "factcheck_not_passed（regenerate を処理してから advance する）" };
    }
    // WebP 変換用マッピングへコピー
    const mapPath = path.join(ROOT, "logs", "article", `${state.slug}.images.json`);
    writeFileSync(mapPath, JSON.stringify({ slides: fc.slides, thumbnail: fc.thumbnail }, null, 2) + "\n", "utf-8");
    try {
      markInspection(state.slug, {
        pass: true,
        source: path.resolve(resultPath),
        regenerated: (fc.regenerated || []).length,
      });
    } catch (error) {
      // 工房fallbackなど外部Codexフォルダが存在しない経路は後片付け対象外。
      console.warn(`[orchestrator] image output inspection marker skipped: ${error.message || error}`);
    }
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
      if (r.fallback) {
        state.steps[args.advance].data = {
          ...(state.steps[args.advance].data || {}),
          transport: "workshop_chat",
          fallbackManifest: r.fallbackManifest || `logs/article/${state.slug}.image-fallback.json`,
        };
        saveState(state);
        console.error(`[orchestrator] ${r.reason}`);
        console.log(assistedInstruction(state, STEPS.find((s) => s.name === args.advance)));
        process.exitCode = 10;
        return;
      }
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
      if (r.fallback) {
        state.steps[step.name].data = { ...(state.steps[step.name].data || {}), ...(r.data || {}) };
        saveState(state);
        console.log(assistedInstruction(state, step));
        process.exitCode = 10;
        return;
      }
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
