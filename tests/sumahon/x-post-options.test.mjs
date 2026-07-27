// tests/sumahon/x-post-options.test.mjs — Phase C投稿形式とフォールバックのテスト。
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadXPostOptions,
  resolvePostWindow,
  buildAttachmentPlan,
  listSlideImages,
  variantName,
  X_POST_OPTIONS_DEFAULT,
} from "../../scripts/automation/x-post-options.mjs";

const TMP = mkdtempSync(join(tmpdir(), "xpostopts-"));

test("1. 設定欠落時は互換用の既定値で補完", () => {
  const opts = loadXPostOptions({}); // xPostOptions欠落のstate
  assert.deepEqual(opts, {
    attachSlides: false,
    attachSlidesCount: 4,
    leadWithThumbnail: false,
    linkInReply: false,
    threadAllSlides: false,
    postWindow: null,
  });
});

test("2. postWindow=null なら即投稿（現状どおり）", () => {
  const r = resolvePostWindow(new Date(), X_POST_OPTIONS_DEFAULT);
  assert.equal(r.postNow, true);
  assert.equal(r.reason, "no_window");
});

test("3. postWindow: 窓より前→保留 / 窓内→即 / 窓後→即（放置しない）", () => {
  const opts = { ...X_POST_OPTIONS_DEFAULT, postWindow: { start: "07:20", end: "08:00" } };
  // JST 05:30（無人runの公開直後想定）→ 07:20 まで保留
  const early = resolvePostWindow(new Date("2026-07-06T05:30:00+09:00"), opts);
  assert.equal(early.postNow, false);
  assert.equal(early.waitMinutes, 110);
  assert.equal(new Date(early.waitUntil).toISOString(), "2026-07-05T22:20:00.000Z"); // = JST 07:20
  // JST 07:30 → 窓内
  assert.equal(resolvePostWindow(new Date("2026-07-06T07:30:00+09:00"), opts).postNow, true);
  // JST 09:00 → 窓後でも投稿する（安全側）
  const late = resolvePostWindow(new Date("2026-07-06T09:00:00+09:00"), opts);
  assert.equal(late.postNow, true);
  assert.equal(late.reason, "after_window_post_anyway");
});

test("4. attachSlides OFF → 添付なし・variant=text_only（現状どおり）", () => {
  const plan = buildAttachmentPlan("any-slug", X_POST_OPTIONS_DEFAULT, TMP);
  assert.deepEqual(plan, { variant: "text_only", attach: [], threadBatches: [], linkInReply: false, selectionSource: "none" });
});

test("5. attachSlides ON → 先頭N枚 + threadAllSlides ONで残りを4枚ずつ", () => {
  // stub: fig01..fig07 を持つ記事ディレクトリ
  const slug = "stub-article";
  const dir = join(TMP, "public", "images", "articles", slug);
  mkdirSync(dir, { recursive: true });
  for (let i = 1; i <= 7; i++) writeFileSync(join(dir, `fig0${i}-x.webp`), "stub");

  const on = { attachSlides: true, attachSlidesCount: 3, threadAllSlides: false, postWindow: null };
  const plan = buildAttachmentPlan(slug, on, TMP);
  assert.equal(plan.attach.length, 3);
  assert.ok(plan.attach[0].endsWith("fig01-x.webp"));
  assert.equal(plan.variant, "images3");
  assert.equal(plan.threadBatches.length, 0);

  const thread = buildAttachmentPlan(slug, { ...on, threadAllSlides: true }, TMP);
  assert.equal(thread.attach.length, 3);
  assert.equal(thread.threadBatches.length, 1); // 残り4枚 → 1返信
  assert.equal(thread.threadBatches[0].length, 4);
  assert.equal(thread.variant, "images3+thread");
});

test("6. variantName の命名", () => {
  assert.equal(variantName(X_POST_OPTIONS_DEFAULT, 0), "text_only");
  assert.equal(variantName({ attachSlides: true, threadAllSlides: false }, 3), "images3");
  assert.equal(variantName({ attachSlides: true, threadAllSlides: true }, 2), "images2+thread");
  assert.equal(variantName({ attachSlides: true, linkInReply: true, threadAllSlides: false }, 4), "images4+reply");
});

test("7. 題材タグは候補のままでは付かず、X検索で検証済みの候補だけ採用", async () => {
  const { generateXPost } = await import("../../scripts/sumahon/generate-x-post.mjs");
  const base = {
    slug: "x",
    title: "VIVANTの「AIハヤト」は現実に作れる？",
    description: "AIの現実を検証",
    type: "news",
    tags: ["VIVANT", "AIハヤト", "ニュース"],
  };
  const beforeSearch = generateXPost(base);
  assert.deepEqual(beforeSearch.subjectHashtagCandidates, ["#VIVANT"]);
  assert.deepEqual(beforeSearch.hashtags, ["#AI", "#すまラボ"]);

  const verified = generateXPost({ ...base, validatedSubjectTags: ["VIVANT", "AIハヤト"] });
  assert.deepEqual(verified.hashtags, ["#AI", "#すまラボ", "#VIVANT"]);
  assert.deepEqual(verified.subjectHashtags, ["#VIVANT"]);
});

test("7-b. 一般語・企業名・巨大タグ・連結造語を候補から除外", async () => {
  const { buildHashtags, buildSubjectHashtagCandidates } = await import("../../scripts/sumahon/generate-x-post.mjs");
  const generic = buildHashtags({ title: "スマホニュース", tags: ["スマホ", "ニュース", "AI"] });
  assert.deepEqual(generic, ["#ITニュース", "#すまラボ"]);

  const candidates = buildSubjectHashtagCandidates({
    title: "企業LINEの裏側にAIが入る",
    tags: ["Google", "Apple", "Salesforce", "LINE", "DX-LINE", "Agentforce", "AIハヤト"],
  });
  assert.deepEqual(candidates, ["#Agentforce"]);
  assert.deepEqual(buildHashtags({
    title: "企業LINEの裏側にAIが入る",
    tags: ["Agentforce"],
    validatedSubjectTags: ["DXLINE", "Agentforce"],
  }), ["#AI", "#すまラボ", "#Agentforce"]);
});

test("7-c. 複数語を連結せず短い既存タグ候補へ丸め、採用は最大2個", async () => {
  const { buildHashtags, buildSubjectHashtagCandidates } = await import("../../scripts/sumahon/generate-x-post.mjs");
  assert.deepEqual(buildSubjectHashtagCandidates({
    title: "Claude Opus 5とChatGPTをVIVANTで比較",
    tags: ["Claude Opus 5", "ClaudeOpus5", "DX-LINE", "Claude", "ChatGPT", "VIVANT"],
  }), ["#Claude", "#ChatGPT"]);
  assert.deepEqual(buildHashtags({
    title: "ClaudeとChatGPTとVIVANT",
    tags: ["Claude", "ChatGPT", "VIVANT"],
    validatedSubjectTags: ["Claude", "ChatGPT", "VIVANT"],
  }), ["#AI", "#すまラボ", "#Claude", "#ChatGPT"]);
});

test("7-d. CLI frontmatter parser が複数行 tags を配列で渡せる", async () => {
  const { extractFrontmatter } = await import("../../scripts/sumahon/frontmatter-lite.mjs");
  const raw = `---\ntitle: "VIVANTのAIハヤト"\ntags:\n  - "VIVANT"\n  - "AIハヤト"\n---\n本文`;
  const { fm } = extractFrontmatter(raw);
  assert.deepEqual(fm.tags, ["VIVANT", "AIハヤト"]);
});

test("8. listSlideImages: fig*.webp のみ昇順", () => {
  const slug = "stub-article";
  const files = listSlideImages(slug, TMP);
  assert.equal(files.length, 7);
  assert.ok(files[0] < files[1]);
});

test.after(() => {
  try {
    rmSync(TMP, { recursive: true, force: true });
  } catch {}
});
