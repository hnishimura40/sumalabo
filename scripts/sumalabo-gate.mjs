#!/usr/bin/env node
// sumalabo-gate.mjs — 記事品質ゲート（P2 第1版）
//
// 思想: W杯2026 qa_labels.py と同じ「機械判定できるものは lint にして、
//       不合格なら exit 1 で止める」。目視・自己申告に頼らない。
//
// ステージ:
//   --stage draft : 画像生成前ゲート。drafts/refinement/{slug}/ の
//                   final_article.md / review_report.md / slide_plan.md の存在と
//                   禁則語（data/qa/forbidden-words.json）のみ検査。
//   --stage full  : draft の検査に加えて MDX（frontmatter 必須キー / slug 整合 /
//                   本文禁則語）・画像参照整合（/images/ 参照の実在・WebP 限定・
//                   サムネ実在・未参照画像）・dist の OGP メタ実測（build 済みの場合）。
//   --audit       : 全記事棚卸しモード（2026-07-25 追加）。--slug は不要。
//                   content/articles/ の公開 MDX を「全部」走査し、タイトルを
//                   含む frontmatter と本文の禁則語を検査する。
//                   背景: stage draft/full は制作中の 1 記事しか見ないため、
//                   公開済みの記事に禁則語が残り続ける死角があった（実際に
//                   「普通の人」が 7 記事・57 箇所で本番に出ていた）。月 1 回の
//                   棚卸しでこの死角を塞ぐ。
//
// 終了コード:
//   0 = 合格（violation 0 件。warning は許容）
//   1 = violation 1 件以上、または引数・設定エラー
//
// 使い方:
//   node scripts/sumalabo-gate.mjs --slug 202605-xxx --stage full
//   npm run sumalabo:gate -- --slug 202605-xxx --stage draft
//   npm run sumalabo:audit          # 全記事棚卸し（月 1 回）
//
// 検査を弱める変更（パターン削除・チェックのスキップ追加）は理由の報告が必要。

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findProductNameVariants, FORMAL_PRODUCT_NAMES_PATH, loadFormalProductNames } from "./sumahon/formal-product-names.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// ---- CONFIG（実リポジトリ構成に合わせて確認済み 2026-07-03）----
const CONFIG = {
  // ChatGPT 複数ターン成果物の置き場（ローカル運用・未コミット）
  draftsDir: path.join(REPO_ROOT, "drafts", "refinement"),
  // MDX 記事本体（Astro content collection: src/content.config.ts の articles）
  articlesDir: path.join(REPO_ROOT, "content", "articles"),
  // 公開画像。記事スライド: articles/{slug}/*.webp、サムネ: thumbnails/{slug}.webp
  imagesDir: path.join(REPO_ROOT, "public", "images"),
  // astro build 出力。記事 HTML: dist/articles/{slug}/index.html
  distDir: path.join(REPO_ROOT, "dist"),
  forbiddenWordsPath: path.join(REPO_ROOT, "data", "qa", "forbidden-words.json"),
};

// 実 MDX / src/content.config.ts に合わせた必須 frontmatter。
// 日付キーは published / publishedAt / date ではなく pubDate / updated / publishAt。
// （updated はスキーマ必須。pubDate / publishAt はスキーマ上 default "" だが、
//   新規 news 記事の運用では必須のため gate では要求する）
const REQUIRED_FRONTMATTER = [
  "title",
  "slug",
  "type",
  "category",
  "description",
  "thumbnail",
  "thumbnailAlt",
  "status",
  "priority",
  "updated",
  "pubDate",
  "publishAt",
];

// draft ステージで必須の成果物（欠落 = violation）
const REQUIRED_DRAFT_ARTIFACTS = ["final_article.md", "review_report.md", "slide_plan.md"];
// 推奨成果物（欠落 = warning）
const RECOMMENDED_DRAFT_ARTIFACTS = [
  "research_report.md",
  "editorial_selection.md",
  "draft_article.md",
  "revised_article.md",
];

// ---- 結果収集 ----
const findings = []; // {severity: "violation"|"warning", check, file, detail}
function report(severity, check, file, detail) {
  findings.push({ severity, check, file, detail });
}

// ---- ユーティリティ ----
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else { out[key] = next; i++; }
  }
  return out;
}

function readTextOrNull(p) {
  try { return readFileSync(p, "utf8"); } catch { return null; }
}

// 成果物ファイル先頭の出所ヘッダ（「# final_article.md — …」〜最初の "---"）を除去。
// 記事本文だけを禁則語検査の対象にするため。ヘッダが無ければそのまま返す。
function stripProvenanceHeader(text) {
  const lines = text.split(/\r?\n/);
  const limit = Math.min(lines.length, 12);
  for (let i = 0; i < limit; i++) {
    if (lines[i].trim() === "---") {
      return lines.slice(i + 1).join("\n");
    }
  }
  return text;
}

// MDX から frontmatter とボディを分離
function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { frontmatter: null, body: text };
  return { frontmatter: m[1], body: m[2] };
}

// frontmatter のトップレベルキーを列挙（YAML の簡易パース。ネストは無視）
function frontmatterTopKeys(fm) {
  const keys = [];
  for (const line of fm.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z][A-Za-z0-9_]*):/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

function frontmatterValue(fm, key) {
  const m = fm.match(new RegExp(`^${key}:\\s*"?([^"\\r\\n]*)"?\\s*$`, "m"));
  return m ? m[1].trim() : null;
}

// ---- 禁則語 ----
function loadForbiddenWords() {
  const raw = readTextOrNull(CONFIG.forbiddenWordsPath);
  if (raw === null) {
    report("violation", "config", CONFIG.forbiddenWordsPath, "禁則語リストが読めません（data/qa/forbidden-words.json）");
    return [];
  }
  let json;
  try { json = JSON.parse(raw); } catch (e) {
    report("violation", "config", CONFIG.forbiddenWordsPath, `禁則語リストの JSON が壊れています: ${e.message}`);
    return [];
  }
  return (json.patterns || []).map((p) => ({
    pattern: p.pattern,
    severity: p.severity === "warning" ? "warning" : "violation",
    kind: p.kind === "regex" ? "regex" : "literal",
    flags: p.flags || "",
    appliesTo: Array.isArray(p.appliesTo) ? p.appliesTo : ["mdx", "draft"],
    // 誤検知対策: この正規表現に一致する行は検査対象外にする
    //（例: slide_plan の「『最強』などの煽り文句は使わない」という禁止指示文）
    excludeLineRegex: typeof p.excludeLineRegex === "string" ? p.excludeLineRegex : null,
    note: p.note || "",
  }));
}

function checkForbiddenWords(text, fileLabel, scope, patterns) {
  const lines = text.split(/\r?\n/);
  for (const p of patterns) {
    if (!p.appliesTo.includes(scope)) continue;
    let re;
    try {
      re = p.kind === "regex"
        ? new RegExp(p.pattern, p.flags.includes("g") ? p.flags : p.flags + "g")
        : new RegExp(p.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    } catch (e) {
      report("violation", "config", CONFIG.forbiddenWordsPath, `パターン不正 "${p.pattern}": ${e.message}`);
      continue;
    }
    let excludeRe = null;
    if (p.excludeLineRegex) {
      try { excludeRe = new RegExp(p.excludeLineRegex); } catch { excludeRe = null; }
    }
    lines.forEach((line, idx) => {
      if (excludeRe && excludeRe.test(line)) return;
      if (re.test(line)) {
        report(p.severity, "forbidden-word", fileLabel,
          `L${idx + 1}: 「${p.pattern}」${p.note ? `（${p.note}）` : ""} → ${line.trim().slice(0, 60)}`);
      }
      re.lastIndex = 0;
    });
  }
}

function checkFormalProductNames(text, fileLabel, products) {
  for (const finding of findProductNameVariants(text, products)) {
    report("violation", "formal-product-name", fileLabel,
      `L${finding.line}: 「${finding.variant}」は正式表記「${finding.canonical}」に直してください → ${finding.excerpt}`);
  }
}

// ---- 確度ラベルの地の文混入 ----
// Chip は独立したラベルとしてのみ許可する。ラベル直後に本文が続くケースと、
// 文末にラベルだけが残るケースを限定検出し、正常な見出し・表の「確定」等は対象外にする。
const STRAY_STATUS_LABEL_SEVERITY = "violation";
function checkStrayStatusLabels(text, fileLabel) {
  const lines = text.split(/\r?\n/);
  const chipRe = /<Chip\b[^>]*>\s*(確定|報道|未確定)\s*<\/Chip>/g;
  const bareBeforeQuoteRe = /(?:^|[、。！？]\s*)(確定|報道|未確定)(?=[「『“"])/g;

  lines.forEach((line, idx) => {
    for (const match of line.matchAll(chipRe)) {
      const tail = line.slice(match.index + match[0].length);
      const followedByProse = /^\s*(?:[「『“"（(ぁ-んァ-ヶ一-龠々〆ヵヶA-Za-z0-9*]|<(?:strong|em)\b)/u.test(tail);
      const dangling = /^\s*(?:$|[。．.!?！？）)】」』]|<\/(?:Note|p|li|div|aside)>)/u.test(tail);
      if (followedByProse || dangling) {
        report(STRAY_STATUS_LABEL_SEVERITY, "stray-status-label", fileLabel,
          `L${idx + 1}: ラベル「${match[1]}」を地の文へ直結・孤立させないでください → ${line.trim().slice(0, 80)}`);
      }
    }
    for (const match of line.matchAll(bareBeforeQuoteRe)) {
      report(STRAY_STATUS_LABEL_SEVERITY, "stray-status-label", fileLabel,
        `L${idx + 1}: ラベル語「${match[1]}」が引用文の前に単独で混入しています → ${line.trim().slice(0, 80)}`);
    }
  });
}

// ---- タイトルの主張が本文 facts で裏付けられているか（2026-07-14 バズ強化・感情に刺すタイトルの安全弁）----
// 感情に刺す主タイトル（消える/終了/値上げ+あなた 等）を許可する代わりに、
// 「事実に反する煽り」を弾く。判定は自動でできる範囲＝(1) タイトルにも禁則語検査を効かせる、
// (2) タイトル中の数値・日付・割合・価格が本文に存在するか（未確定を確定と言い切って
// いないかの機械的な裏取り）。意味的な主張の妥当性は引き続き reviewer + プロンプト規則で担保。
function normalizeNumeric(s) {
  return s
    .replace(/[０-９]/g, (d) => String("０１２３４５６７８９".indexOf(d)))
    .replace(/％/g, "%")
    .replace(/／/g, "/");
}
function bodyHasNumericToken(nbody, tok) {
  const variants = new Set([tok]);
  let m = tok.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (m) variants.add(`${m[1]}月${m[2]}日`);
  m = tok.match(/^(\d{1,2})月(\d{1,2})日$/);
  if (m) variants.add(`${m[1]}/${m[2]}`);
  for (const v of variants) if (nbody.includes(v)) return true;
  return false;
}
function checkTitleFactBacking(title, body, mdxLabel, patterns) {
  if (!title) return;
  // (1) タイトルにも禁則語（煽り・断定・普通の人 等）検査を効かせる
  checkForbiddenWords(title, `${mdxLabel} (title)`, "mdx", patterns);
  // (2) タイトル中の数値・日付・割合・価格の裏取り
  const ntitle = normalizeNumeric(title);
  const nbody = normalizeNumeric(body);
  const tokenRes = [
    /\d{1,2}\/\d{1,2}/g,
    /\d{1,4}年\d{1,2}月\d{1,2}日/g,
    /\d{1,2}月\d{1,2}日/g,
    /\d{1,4}年/g,
    /\d{1,3}%/g,
    /\d[\d,]*円/g,
    /\$\d[\d,]*/g,
    /\d[\d,]*ドル/g,
  ];
  const found = new Set();
  for (const re of tokenRes) for (const m of ntitle.matchAll(re)) found.add(m[0]);
  for (const tok of found) {
    if (!bodyHasNumericToken(nbody, tok)) {
      report("violation", "title-fact-backing", mdxLabel,
        `タイトルの「${tok}」が本文に見当たりません。タイトルの数値・日付・価格は本文の facts で裏付けてください（未確定を確定と言い切らない）`);
    }
  }
}

// ---- draft ステージ ----
// stage=draft: drafts ディレクトリ不在 = violation（画像生成前は必ず必要）
// stage=full : drafts ディレクトリ不在 = warning（レガシー記事 / 別環境制作 /
//              Temp クリーンアップ後の再実行を想定。存在するのに成果物欠落なら violation）
function checkDraftStage(slug, patterns, productNames, stage) {
  const dir = path.join(CONFIG.draftsDir, slug);
  if (!existsSync(dir)) {
    const sev = stage === "draft" ? "violation" : "warning";
    report(sev, "draft-artifacts", dir,
      stage === "draft"
        ? "drafts/refinement/{slug} が存在しません（Article Refinement Loop 未実施の疑い）"
        : "drafts/refinement/{slug} が存在しません（レガシー記事・別環境制作の場合のみ許容。新規制作では draft ステージを先に通してください）");
    return;
  }
  for (const f of REQUIRED_DRAFT_ARTIFACTS) {
    const p = path.join(dir, f);
    const t = readTextOrNull(p);
    if (t === null || t.trim().length === 0) {
      report("violation", "draft-artifacts", p, "必須成果物が存在しないか空です");
    }
  }
  for (const f of RECOMMENDED_DRAFT_ARTIFACTS) {
    const p = path.join(dir, f);
    if (!existsSync(p)) report("warning", "draft-artifacts", p, "推奨成果物がありません");
  }
  // 禁則語: 公開物の元になる final_article と slide_plan のみ対象
  for (const f of ["final_article.md", "slide_plan.md"]) {
    const t = readTextOrNull(path.join(dir, f));
    if (t !== null) {
      const body = stripProvenanceHeader(t);
      checkForbiddenWords(body, `drafts/refinement/${slug}/${f}`, "draft", patterns);
      checkFormalProductNames(body, `drafts/refinement/${slug}/${f}`, productNames);
      if (f === "final_article.md") {
        checkStrayStatusLabels(body, `drafts/refinement/${slug}/${f}`);
      }
      if (f === "slide_plan.md" && !/^##\s+演出ブロック(?:\s|（|\(|$)/m.test(body)) {
        report("warning", "image-performance", `drafts/refinement/${slug}/${f}`,
          "演出ブロックがありません。新規記事は衣装・小道具・ポーズ・背景・演出根拠を明記してください（Phase Aでは必須）");
      }
    }
  }

  // full ステージ: 成果物保全チェック（P7）。
  // 「ファイルがある」だけでなく「git 追跡下にあり、未コミット変更が無い」ことを要求する。
  // 背景: 2026-07 に OS Temp クリーンアップで未コミットの drafts が3記事分消失した事故。
  if (stage === "full") {
    checkDraftsCommitted(slug);
  }
}

// drafts/refinement/{slug} 配下が git 追跡下かつクリーン（未追跡/未ステージ/未コミット無し）かを検査
function checkDraftsCommitted(slug) {
  const rel = `drafts/refinement/${slug}`;
  let tracked, dirty;
  try {
    const opts = { cwd: REPO_ROOT, encoding: "utf8", windowsHide: true };
    tracked = execSync(`git ls-files -- "${rel}"`, opts).split(/\r?\n/).filter(Boolean).map((s) => s.replace(/\\/g, "/"));
    dirty = execSync(`git status --porcelain -- "${rel}"`, opts).split(/\r?\n/).filter(Boolean);
  } catch (e) {
    report("warning", "draft-preservation", rel, `git 状態を確認できませんでした（git 不在?）: ${e.message.split("\n")[0]}`);
    return;
  }
  const trackedSet = new Set(tracked);
  for (const f of REQUIRED_DRAFT_ARTIFACTS) {
    const relFile = `${rel}/${f}`;
    if (existsSync(path.join(REPO_ROOT, relFile)) && !trackedSet.has(relFile)) {
      report("violation", "draft-preservation", relFile, "git 追跡外です。成果物は記事の PR に含めてコミットしてください（消失事故防止）");
    }
  }
  for (const line of dirty) {
    report("violation", "draft-preservation", rel, `未コミットの変更/未追跡ファイルがあります: ${line.trim()}`);
  }
}

// ---- full ステージ（MDX / 画像 / OGP）----
const CHARACTER_BUBBLE_VARIANTS = {
  himari: new Set(["curious", "aha", "explain", "worried", "smile", "serious"]),
  labo: new Set(["smile", "point", "worried"]),
};

function checkCharacterBubbleVariants(body, file) {
  for (const match of body.matchAll(/<CharacterBubble\b[^>]*>/g)) {
    const tag = match[0];
    const speaker = tag.match(/\bspeaker=["']([^"']+)["']/)?.[1];
    const mood = tag.match(/\bmood=["']([^"']+)["']/)?.[1];
    if (!speaker || !CHARACTER_BUBBLE_VARIANTS[speaker]) {
      report("violation", "character-avatar", file, `CharacterBubble の speaker が未定義です: ${speaker || "(missing)"}`);
      continue;
    }
    if (!mood || !CHARACTER_BUBBLE_VARIANTS[speaker].has(mood)) {
      const allowed = [...CHARACTER_BUBBLE_VARIANTS[speaker]].join("/");
      report("violation", "character-avatar", file,
        `CharacterBubble mood="${mood || "(missing)"}" は未定義です。使用可能variant: ${allowed}`);
    }
  }
}

function checkMdxStage(slug, patterns, productNames) {
  const mdxPath = path.join(CONFIG.articlesDir, `${slug}.mdx`);
  const raw = readTextOrNull(mdxPath);
  if (raw === null) {
    report("violation", "mdx", mdxPath, "MDX が存在しません");
    return null;
  }
  const { frontmatter, body } = splitFrontmatter(raw);
  if (frontmatter === null) {
    report("violation", "mdx-frontmatter", mdxPath, "frontmatter（--- ... ---）がありません");
    return { body, fm: null };
  }
  const keys = frontmatterTopKeys(frontmatter);
  for (const k of REQUIRED_FRONTMATTER) {
    if (!keys.includes(k)) report("violation", "mdx-frontmatter", mdxPath, `必須キー ${k} がありません`);
  }
  const fmSlug = frontmatterValue(frontmatter, "slug");
  if (fmSlug !== null && fmSlug !== slug) {
    report("violation", "mdx-frontmatter", mdxPath, `frontmatter slug "${fmSlug}" がファイル名 "${slug}" と不一致`);
  }
  checkForbiddenWords(body, `content/articles/${slug}.mdx`, "mdx", patterns);
  checkFormalProductNames(raw, `content/articles/${slug}.mdx`, productNames);
  checkStrayStatusLabels(body, `content/articles/${slug}.mdx`);
  checkCharacterBubbleVariants(body, mdxPath);
  const title = frontmatterValue(frontmatter, "title");
  checkTitleFactBacking(title, body, `content/articles/${slug}.mdx`, patterns);
  return { body, fm: frontmatter };
}

function checkImageStage(slug, mdx) {
  if (!mdx) return;
  const { body, fm } = mdx;
  const mdxLabel = `content/articles/${slug}.mdx`;

  // 本文中の /images/ 参照を収集（src="..." と markdown 画像の両方）
  const refs = new Set();
  for (const m of body.matchAll(/(?:src=|\]\()\s*"?(\/images\/[^"\s)]+)/g)) refs.add(m[1]);

  for (const ref of refs) {
    const fsPath = path.join(REPO_ROOT, "public", ref.replace(/^\//, "").replace(/\?.*$/, ""));
    if (!existsSync(fsPath)) {
      report("violation", "image-ref", mdxLabel, `参照画像が存在しません: ${ref}`);
    }
    if (/\.(png|jpe?g)$/i.test(ref)) {
      report("violation", "image-ref", mdxLabel, `WebP 以外の画像参照（リポジトリは WebP のみ）: ${ref}`);
    }
  }

  // サムネイル
  if (fm) {
    const thumb = frontmatterValue(fm, "thumbnail");
    if (thumb) {
      const thumbPath = path.join(REPO_ROOT, "public", thumb.replace(/^\//, ""));
      if (!existsSync(thumbPath)) report("violation", "image-ref", mdxLabel, `thumbnail が存在しません: ${thumb}`);
      if (!/\.webp$/i.test(thumb)) report("violation", "image-ref", mdxLabel, `thumbnail が WebP ではありません: ${thumb}`);
    }
  }

  // 未参照画像（置きっぱなし検出）
  const artDir = path.join(CONFIG.imagesDir, "articles", slug);
  if (existsSync(artDir)) {
    for (const f of readdirSync(artDir)) {
      const rel = `/images/articles/${slug}/${f}`;
      if (!refs.has(rel)) report("warning", "image-ref", rel, "public に存在するが MDX から参照されていません");
      if (!/\.webp$/i.test(f)) report("violation", "image-ref", rel, "記事画像フォルダに WebP 以外のファイルがあります");
    }
  }
}

// ---- アフィリエイト検査（2026-07-11 追加・景表法ステマ規制対応 + 二層構造の強制） ----
// 検出対象は 2 種類:
//   (1) 生のアフィリエイトリンク URL（各 ASP / モールのアフィリエイトドメイン）
//   (2) アフィリエイト系コンポーネントの使用（ProductCard / CTABox / AffiliateLinks。
//       ID 設定後にリンクが自動有効化されるため「広告枠あり」として扱う）
// ルール:
//   - ニュースレーン（frontmatter type: news）に (1)(2) いずれかがあれば violation
//     （ニュース記事には広告を入れない = 信頼と Discover 適性を守る）
//   - (1)(2) を含むのに frontmatter hasAffiliate: true が無ければ violation
//     （広告表示ラベルが出ないままアフィリエイトを含む記事は公開不可）
//   - type: news で hasAffiliate: true も violation（ニュースにラベルは出さない）
const AFFILIATE_URL_PATTERNS = [
  { re: /af\.moshimo\.com/i, label: "もしもアフィリエイト" },
  { re: /px\.a8\.net|a8ejpredirect/i, label: "A8.net" },
  { re: /hb\.afl\.rakuten\.co\.jp/i, label: "楽天アフィリエイト" },
  { re: /ck\.jp\.ap\.valuecommerce\.com/i, label: "バリューコマース" },
  { re: /amzn\.to\//i, label: "Amazon 短縮リンク" },
  { re: /amazon\.co\.jp\/[^\s"')>]*[?&]tag=/i, label: "Amazon アソシエイトタグ" },
];
const AFFILIATE_COMPONENT_RE = /<(ProductCard|CTABox|AffiliateLinks)\b/;

function checkAffiliate(slug, mdx) {
  if (!mdx) return;
  const { body, fm } = mdx;
  const label = `content/articles/${slug}.mdx`;

  const linkHits = AFFILIATE_URL_PATTERNS.filter((p) => p.re.test(body)).map((p) => p.label);
  const hasComponent = AFFILIATE_COMPONENT_RE.test(body);
  const hasAffiliateContent = linkHits.length > 0 || hasComponent;

  const fmType = fm ? frontmatterValue(fm, "type") : null;
  const fmCategory = fm ? frontmatterValue(fm, "category") : null;
  const fmHasAffiliate = fm ? frontmatterValue(fm, "hasAffiliate") : null;

  if (fmType === "news" || fmCategory === "やってみた・検証") {
    if (hasAffiliateContent) {
      const what = [...linkHits, ...(hasComponent ? ["アフィリエイト系コンポーネント"] : [])].join(" / ");
      report("violation", "affiliate-lane", label,
        `ニュースレーンまたはhands-onの記事にアフィリエイトは入れられません（検出: ${what}）。hands-onにも当面は無広告原則を適用します`);
    }
    if (fmHasAffiliate === "true") {
      report("violation", "affiliate-lane", label,
        "ニュースレーンまたはhands-onの記事に hasAffiliate: true は設定できません（当面は無広告の方針）");
    }
    return;
  }

  if (hasAffiliateContent && fmHasAffiliate !== "true") {
    const what = [...linkHits, ...(hasComponent ? ["アフィリエイト系コンポーネント"] : [])].join(" / ");
    report("violation", "affiliate-disclosure", label,
      `アフィリエイト(${what})を含むのに frontmatter に hasAffiliate: true がありません（記事冒頭の広告表示ラベルが出ない = 景表法ステマ規制違反のリスク）`);
  }
  if (!hasAffiliateContent && fmHasAffiliate === "true") {
    report("warning", "affiliate-disclosure", label,
      "hasAffiliate: true だがアフィリエイトリンク/コンポーネントが見つかりません（ラベルだけ表示される状態。意図的でなければ false に）");
  }
}

function checkDistOgp(slug) {
  const htmlPath = path.join(CONFIG.distDir, "articles", slug, "index.html");
  const html = readTextOrNull(htmlPath);
  if (html === null) {
    report("warning", "dist-ogp", htmlPath, "dist が未 build のため OGP 実測をスキップ（finalize では gate 後に build されます）");
    return;
  }
  if (/<span\b[^>]*class=["'][^"']*\bface--fallback\b[^"']*["']/i.test(html)) {
    report("violation", "character-avatar", htmlPath,
      "CharacterBubble が文字アバターへフォールバックしています。speaker/mood variant と互換aliasを確認してください");
  }
  const metas = {
    "og:title": /<meta[^>]+property="og:title"[^>]+content="([^"]+)"/,
    "og:description": /<meta[^>]+property="og:description"[^>]+content="([^"]+)"/,
    "og:image": /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/,
    "twitter:card": /<meta[^>]+name="twitter:card"[^>]+content="([^"]+)"/,
  };
  for (const [name, re] of Object.entries(metas)) {
    const m = html.match(re);
    if (!m) {
      report("violation", "dist-ogp", htmlPath, `${name} メタタグがありません`);
      continue;
    }
    if (name === "og:image") {
      const imgPath = m[1].replace(/^https?:\/\/[^/]+/, "");
      const distImg = path.join(CONFIG.distDir, imgPath.replace(/^\//, ""));
      const pubImg = path.join(REPO_ROOT, "public", imgPath.replace(/^\//, ""));
      if (!existsSync(distImg) && !existsSync(pubImg)) {
        report("violation", "dist-ogp", htmlPath, `og:image の実体がありません: ${imgPath}`);
      }
    }
  }
}

// dist の rendered HTML に「生の Markdown 記法」が残っていないか検査する
// （2026-07-19 追加）。CJK の intra-word で **bold** が未変換のまま出る等を検出。
// 記法掃除は dist ベースで判定する（source の ** は正常にレンダされる場合もあるため）。
function checkDistRawMarkdown(slug) {
  const htmlPath = path.join(CONFIG.distDir, "articles", slug, "index.html");
  const html = readTextOrNull(htmlPath);
  if (html === null) {
    report("warning", "dist-raw-markdown", htmlPath, "dist が未 build のため記法掃除の実測をスキップ");
    return;
  }
  // <script>（JSON-LD 等）を除いた本文領域だけを対象にする。
  const body = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const checks = [
    { re: /\*\*/g, label: "未変換の太字記法 **（<strong> を使うか、CJK 語中では ** を避ける）" },
    { re: /(^|[^!])\]\(https?:\/\//g, label: "未変換のリンク記法 ](http…（Markdown リンクが素で出ている）" },
  ];
  for (const { re, label } of checks) {
    const m = body.match(re);
    if (m && m.length > 0) {
      // 文脈を1つ添える
      const idx = body.search(re);
      const ctx = body.slice(Math.max(0, idx - 20), idx + 30).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      report("violation", "dist-raw-markdown", htmlPath, `${label} が ${m.length} 箇所（例: …${ctx}…）`);
    }
  }
}

// ---- 全記事棚卸し（--audit・2026-07-25 追加）----
// stage draft/full は制作中の 1 記事しか見ないため、公開済み記事に禁則語が残り
// 続ける死角があった。ここでは content/articles/ の MDX を全部走査し、
// frontmatter（title / description を含む）と本文の両方を検査する。
// 通常の stage full は本文のみを "mdx" スコープで見るが、棚卸しでは
// タイトルにも同じパターンを効かせたいので frontmatter も同スコープで検査する。
function runAudit(patterns) {
  const dir = CONFIG.articlesDir;
  if (!existsSync(dir)) {
    report("violation", "audit", dir, "content/articles が見つかりません");
    finishAudit(0);
    return;
  }
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .sort();

  for (const f of files) {
    const full = path.join(dir, f);
    const raw = readTextOrNull(full);
    if (raw === null) {
      report("warning", "audit", full, "読み込めませんでした");
      continue;
    }
    const { frontmatter, body } = splitFrontmatter(raw);
    const label = path.join("content", "articles", f);
    // frontmatter（title / description / thumbnailAlt など）も検査対象にする。
    // 行番号を実ファイルと合わせるため、frontmatter は先頭 1 行分ずらして渡す。
    if (frontmatter !== null) {
      checkForbiddenWords(`---\n${frontmatter}`, `${label} (frontmatter)`, "mdx", patterns);
    }
    checkForbiddenWords(body, label, "mdx", patterns);
  }

  // 記事だけでなく「サイト側の読者向け文言」も検査する（2026-07-25）。
  // 実際に categories.ts のカテゴリ説明・記事一覧のリード文・キャラ紹介文に
  // 「普通の人」が残っており、記事を全部直しても一覧/カテゴリ面の HTML に
  // 出続けていた。記事だけを見るのは死角になる。
  const siteCopyCount = auditSiteCopy(patterns);

  finishAudit(files.length + siteCopyCount);
}

// サイト側の読者向け文言（カテゴリ説明・固定ページ・収益記事カードの説明文）を検査する。
// 対象は「読者の目に触れる日本語コピーを持つ」ファイルに限定する。ソース全体を
// 走査すると、コメントや禁則語リスト自身まで拾って誤検知だらけになるため。
const SITE_COPY_TARGETS = [
  path.join("src", "lib", "categories.ts"),
  path.join("src", "config", "site.ts"),
  path.join("data", "related-guides.json"),
];
const SITE_COPY_PAGES_DIR = path.join("src", "pages");

function auditSiteCopy(patterns) {
  const targets = [...SITE_COPY_TARGETS];
  const pagesDir = path.join(REPO_ROOT, SITE_COPY_PAGES_DIR);
  if (existsSync(pagesDir)) {
    for (const f of readdirSync(pagesDir)) {
      if (f.endsWith(".astro")) targets.push(path.join(SITE_COPY_PAGES_DIR, f));
    }
  }

  let checked = 0;
  for (const rel of targets) {
    const full = path.join(REPO_ROOT, rel);
    const raw = readTextOrNull(full);
    if (raw === null) continue;
    checkForbiddenWords(raw, `${rel} (site copy)`, "mdx", patterns);
    checked++;
  }
  return checked;
}

function finishAudit(fileCount) {
  const violations = findings.filter((f) => f.severity === "violation");
  const warnings = findings.filter((f) => f.severity === "warning");

  console.log(`\n=== sumalabo-gate: 全記事棚卸し (audit) — ${fileCount} ファイル ===`);
  for (const f of findings) {
    const mark = f.severity === "violation" ? "✗ VIOLATION" : "△ warning  ";
    console.log(`${mark} [${f.check}] ${path.relative(REPO_ROOT, f.file) || f.file}`);
    console.log(`             ${f.detail}`);
  }
  console.log(`--- violations: ${violations.length} / warnings: ${warnings.length} ---`);

  if (violations.length > 0) {
    console.error(
      `AUDIT FAILED: ${violations.length} violation(s)。公開中の記事に禁則語が残っています。修正してから再実行してください。`
    );
    process.exit(1);
  }
  console.log("AUDIT PASSED（公開中の記事に禁則語なし）");
  process.exit(0);
}

// ---- main ----
function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = (typeof args.slug === "string" ? args.slug : "").trim();
  const stage = (typeof args.stage === "string" ? args.stage : "full").trim();
  const audit = args.audit === true || args.audit === "true";

  if (!audit && (!slug || !["draft", "full"].includes(stage))) {
    console.error("Usage: sumalabo-gate --slug <slug> [--stage draft|full]");
    console.error("       sumalabo-gate --audit   # 全記事棚卸し（slug 不要）");
    process.exit(1);
  }

  const patterns = loadForbiddenWords();
  let productNames = [];
  try {
    productNames = loadFormalProductNames();
  } catch (e) {
    report("violation", "config", FORMAL_PRODUCT_NAMES_PATH, `正式表記リストが読めません: ${e.message}`);
  }

  if (audit) {
    runAudit(patterns);
    return;
  }

  checkDraftStage(slug, patterns, productNames, stage);
  if (stage === "full") {
    const mdx = checkMdxStage(slug, patterns, productNames);
    checkImageStage(slug, mdx);
    checkAffiliate(slug, mdx);
    checkDistOgp(slug);
    checkDistRawMarkdown(slug);
  }

  const violations = findings.filter((f) => f.severity === "violation");
  const warnings = findings.filter((f) => f.severity === "warning");

  console.log(`\n=== sumalabo-gate: ${slug} (stage=${stage}) ===`);
  for (const f of findings) {
    const mark = f.severity === "violation" ? "✗ VIOLATION" : "△ warning  ";
    console.log(`${mark} [${f.check}] ${path.relative(REPO_ROOT, f.file) || f.file}`);
    console.log(`             ${f.detail}`);
  }
  console.log(`--- violations: ${violations.length} / warnings: ${warnings.length} ---`);

  if (violations.length > 0) {
    console.error(`GATE FAILED: ${violations.length} violation(s). 公開フローを進めないでください。`);
    process.exit(1);
  }
  console.log("GATE PASSED");
  process.exit(0);
}

main();
