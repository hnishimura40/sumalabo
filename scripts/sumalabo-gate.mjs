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
//
// 終了コード:
//   0 = 合格（violation 0 件。warning は許容）
//   1 = violation 1 件以上、または引数・設定エラー
//
// 使い方:
//   node scripts/sumalabo-gate.mjs --slug 202605-xxx --stage full
//   npm run sumalabo:gate -- --slug 202605-xxx --stage draft
//
// 検査を弱める変更（パターン削除・チェックのスキップ追加）は理由の報告が必要。

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
function checkDraftStage(slug, patterns, stage) {
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
    if (t !== null) checkForbiddenWords(stripProvenanceHeader(t), `drafts/refinement/${slug}/${f}`, "draft", patterns);
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
function checkMdxStage(slug, patterns) {
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
  const fmHasAffiliate = fm ? frontmatterValue(fm, "hasAffiliate") : null;

  if (fmType === "news") {
    if (hasAffiliateContent) {
      const what = [...linkHits, ...(hasComponent ? ["アフィリエイト系コンポーネント"] : [])].join(" / ");
      report("violation", "affiliate-lane", label,
        `ニュースレーン(type: news)の記事にアフィリエイトは入れられません（検出: ${what}）。収益導線は資産記事(type: revenue/foundation)限定`);
    }
    if (fmHasAffiliate === "true") {
      report("violation", "affiliate-lane", label,
        "ニュースレーン(type: news)の記事に hasAffiliate: true は設定できません（ニュースには広告を入れない方針）");
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

// ---- main ----
function main() {
  const args = parseArgs(process.argv.slice(2));
  const slug = (typeof args.slug === "string" ? args.slug : "").trim();
  const stage = (typeof args.stage === "string" ? args.stage : "full").trim();

  if (!slug || !["draft", "full"].includes(stage)) {
    console.error("Usage: sumalabo-gate --slug <slug> [--stage draft|full]");
    process.exit(1);
  }

  const patterns = loadForbiddenWords();

  checkDraftStage(slug, patterns, stage);
  if (stage === "full") {
    const mdx = checkMdxStage(slug, patterns);
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
