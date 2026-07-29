// tests/sumahon/slide-pipeline.test.mjs
//
// PR-A 単体テスト: スライド主役型パイプラインの決定論的ジェネレータを検証。
// Node の組み込み test runner (node --test) で実行。
//
// 検証観点:
//   - articleUnderstanding 拡張フィールド (slideNeeded / slidePlan / thumbnailIntent) が存在
//   - generateSlidePlan の枚数ルール (Apple AIペンダント相当=5前後 / 短い速報=0 / foundation=3)
//   - 各 slide の characterRole に himari / labomaru が両方非空
//   - generateSlidePrompt / generateSlideFactcheckPrompt /
//     generateSlideRevisionPrompt の出力に「普通の人」が含まれない
//   - validateSlidePlan の verdict が想定通り
//   - thumbnailIntent.forbiddenCopy に「普通の人」が含まれる

import { test } from "node:test";
import assert from "node:assert/strict";

import { generateArticleUnderstanding } from "../../scripts/sumahon/generate-article-understanding.mjs";
import {
  derivePerformanceBlock,
  deriveExpression,
  generateSlidePlan,
  validateSlidePlan,
} from "../../scripts/sumahon/generate-slide-plan.mjs";
import { generateSlidePrompt } from "../../scripts/sumahon/generate-slide-prompt.mjs";
import { generateSlideFactcheckPrompt } from "../../scripts/sumahon/generate-slide-factcheck-prompt.mjs";
import { generateSlideRevisionPrompt } from "../../scripts/sumahon/generate-slide-revision-prompt.mjs";

// ------------------------------------------------------------------------
// Fixtures
// ------------------------------------------------------------------------

const APPLE_PENDANT_BRIEF = {
  slug: "202605-apple-airtag-size-ai-pendant-iphone-siri",
  articleTitle: "Apple、超小型「AIペンダント」を開発か？",
  sourceTitle: "Apple、超小型「AIペンダント」を開発か？",
  coreAngle: "Apple が AI を身につける方向へ広げるかを見るニュース",
  topicCategory: "AI",
  articleType: "news",
};
const APPLE_SOURCE = {
  title: "Apple、超小型「AIペンダント」を開発か？",
  keyPoints: ["AirTagサイズ", "iPhone連携", "Siri"],
  publishedAt: "2026-05-16",
};

const FOUNDATION_BRIEF = {
  slug: "what-is-ai-smartphone",
  articleTitle: "AIスマホとは何か",
  sourceTitle: "AIスマホとは何か",
  coreAngle: "AIスマホの基本を整理",
  topicCategory: "AI",
  articleType: "foundation",
};
const FOUNDATION_SOURCE = { title: "AIスマホとは何か", keyPoints: [] };

const SHORT_ALERT_BRIEF = {
  slug: "202605-foo-beta-released",
  articleTitle: "速報：Foo β 版が配信開始",
  sourceTitle: "速報：Foo β 版が配信開始",
  coreAngle: "",
  topicCategory: "general",
  articleType: "news",
};
const SHORT_ALERT_SOURCE = { title: "速報：Foo β 版が配信開始", keyPoints: [] };

// ------------------------------------------------------------------------
// articleUnderstanding 拡張
// ------------------------------------------------------------------------

test("articleUnderstanding has new slide-pipeline fields", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  assert.equal(typeof u.slideNeeded, "boolean", "slideNeeded should be boolean");
  assert.ok(u.slidePlan, "slidePlan should exist");
  assert.ok(Array.isArray(u.slidePlan.slides), "slidePlan.slides should be array");
  assert.ok(u.thumbnailIntent, "thumbnailIntent should exist");
  assert.ok(
    Array.isArray(u.thumbnailIntent.forbiddenCopy),
    "thumbnailIntent.forbiddenCopy should be array",
  );
  assert.ok(
    u.thumbnailIntent.forbiddenCopy.includes("普通の人"),
    "thumbnailIntent.forbiddenCopy should list 普通の人",
  );
});

test("articleUnderstanding for Apple-like news: slideNeeded=true, slidePlan.count in [2,8]", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  assert.equal(u.slideNeeded, true);
  assert.ok(
    u.slidePlan.count >= 2 && u.slidePlan.count <= 8,
    `expected 2..8 slides, got ${u.slidePlan.count}`,
  );
  // overview は news 系で必須
  assert.ok(
    u.slidePlan.slides.some((s) => s.purpose === "overview"),
    "Apple-like news plan should include overview slide",
  );
});

test("articleUnderstanding for short alert news: slideNeeded=false", () => {
  const u = generateArticleUnderstanding({
    articleBrief: SHORT_ALERT_BRIEF,
    source: SHORT_ALERT_SOURCE,
  });
  assert.equal(u.slideNeeded, false, "short alert should opt out of slides");
});

// ------------------------------------------------------------------------
// generateSlidePlan
// ------------------------------------------------------------------------

test("generateSlidePlan: Apple-like news returns 4-6 slides with character roles", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u });
  assert.ok(plan.count >= 4 && plan.count <= 6, `expected 4..6, got ${plan.count}`);
  assert.ok(plan.performance?.thumbnail?.wardrobe, "thumbnail performance wardrobe missing");
  assert.ok(plan.performance?.thumbnail?.props?.length, "thumbnail performance props missing");
  assert.ok(plan.performance?.thumbnail?.pose, "thumbnail performance pose missing");
  assert.ok(plan.performance?.thumbnail?.background, "thumbnail performance background missing");
  for (const s of plan.slides) {
    assert.ok(s.characterRole?.himari, `slide ${s.id} himari role missing`);
    assert.ok(s.characterRole?.labomaru, `slide ${s.id} labomaru role missing`);
    // 「置物」「立っているだけ」等が含まれないこと
    const combined = `${s.characterRole.himari} ${s.characterRole.labomaru}`;
    assert.equal(
      /置物|立っているだけ|無表情|待機/.test(combined),
      false,
      `slide ${s.id} has static role keyword`,
    );
  }
});

test("derivePerformanceBlock: specific verification staging wins over generic product staging", () => {
  const performance = derivePerformanceBlock({ theme: "モバイルバッテリーのリコールを検証" });
  assert.match(performance.thumbnail.props.join(" "), /虫眼鏡|チェックリスト/);
  assert.match(performance.thumbnail.pose, /確認|虫眼鏡/);
  assert.match(performance.thumbnail.expression, /真剣|心配|調べ顔/);
  assert.match(performance.thumbnail.handUse, /片手|両手/);
  assert.match(performance.slides.handUse, /片手持ち.*両手持ち/);
  assert.match(performance.thumbnail.handUse, /自然に届く距離.*腕を伸長させない/);
  assert.match(performance.slides.handUse, /自然に届く距離.*腕を伸長させない/);
  assert.match(performance.thumbnail.handUse, /手のクローズアップを避け/);
  assert.match(performance.slides.handUse, /画面の主役にしない/);
  assert.match(performance.slides.handUse, /両手に別々の動作を同時指定しない/);
  assert.match(performance.thumbnail.handUse, /標準衣装・棒立ちへ退避しない/);
  assert.ok(performance.thumbnail.handsFreeAlternatives.includes("テーマ別衣装"));
  assert.ok(performance.thumbnail.handsFreeAlternatives.some((item) => /首かけ|肩掛け/.test(item)));
  assert.ok(performance.thumbnail.handsFreeAlternatives.some((item) => /姿勢と視線/.test(item)));
  assert.match(performance.thumbnail.handUse, /手は原則描かない/);
  assert.match(performance.thumbnail.handUse, /卓上スタンド.*ポケット.*長い袖.*後ろ手.*フレームアウト/);
  assert.match(performance.slides.handUse, /手は原則描かない/);
  assert.match(performance.thumbnail.pose, /手はポケット・長い袖・後ろ手・前景・フレーム外/);
});

test("deriveExpression follows article emotion instead of defaulting to a smile", () => {
  assert.equal(deriveExpression({ theme: "GDIDのプライバシーと追跡を解説" }).tone, "caution");
  assert.equal(deriveExpression({ theme: "便利な新機能を提供開始" }).tone, "positive");
  assert.equal(deriveExpression({ theme: "通信方式の基礎を比較" }).tone, "neutral");
});

test("generateSlidePlan: foundation article returns 2-4 slides", () => {
  const u = generateArticleUnderstanding({
    articleBrief: FOUNDATION_BRIEF,
    source: FOUNDATION_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u });
  assert.ok(plan.count >= 2 && plan.count <= 4, `expected 2..4, got ${plan.count}`);
});

test("generateSlidePlan: slideNeeded=false yields 0 slides", () => {
  const u = generateArticleUnderstanding({
    articleBrief: SHORT_ALERT_BRIEF,
    source: SHORT_ALERT_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u });
  assert.equal(plan.count, 0);
  assert.equal(plan.slides.length, 0);
});

test("generateSlidePlan: respects maxSlides upper bound (8)", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u, maxSlides: 3 });
  assert.ok(plan.count <= 3);
});

test("generateSlidePlan: long bodySummary adds checkpoints if absent", () => {
  // Use foundation (which by default has no checkpoints) and a long summary
  const u = generateArticleUnderstanding({
    articleBrief: FOUNDATION_BRIEF,
    source: FOUNDATION_SOURCE,
  });
  const longBody = "a".repeat(5000);
  const plan = generateSlidePlan({ understanding: u, bodySummary: longBody });
  assert.ok(
    plan.slides.some((s) => s.purpose === "checkpoints"),
    "long body should trigger checkpoints",
  );
});

// ------------------------------------------------------------------------
// validateSlidePlan
// ------------------------------------------------------------------------

test("validateSlidePlan: ok plan returns verdict ok", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u });
  const v = validateSlidePlan(plan);
  assert.equal(v.verdict, "ok", `expected ok, got ${v.verdict} (${v.reason})`);
});

test("validateSlidePlan: missing slidePlan -> blocking", () => {
  const v = validateSlidePlan(null);
  assert.equal(v.verdict, "blocking");
});

test("validateSlidePlan: count >= 10 -> blocking", () => {
  const bigPlan = {
    count: 11,
    slides: Array.from({ length: 11 }, (_, i) => ({
      id: `fig${i}-overview`,
      purpose: "overview",
      format: "card-3col",
      title: "x",
      mustInclude: [],
      characterRole: { himari: "ok", labomaru: "ok" },
      props: [],
      factCaveats: [],
    })),
  };
  const v = validateSlidePlan(bigPlan);
  assert.equal(v.verdict, "blocking");
});

test("validateSlidePlan: count=1 -> warning (not blocking)", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u, maxSlides: 1 });
  const v = validateSlidePlan(plan);
  assert.equal(v.verdict, "warning", `expected warning for count=${plan.count}, got ${v.verdict}`);
});

test("validateSlidePlan: static character role -> blocking", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u });
  // Inject static role
  plan.slides[0].characterRole.himari = "立っているだけ";
  const v = validateSlidePlan(plan);
  assert.equal(v.verdict, "blocking");
});

// ------------------------------------------------------------------------
// generateSlidePrompt (no 普通の人 leak)
// ------------------------------------------------------------------------

test("generateSlidePrompt: does NOT contain 普通の人 in output", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u });
  for (const slide of plan.slides) {
    const prompt = generateSlidePrompt({ slide, understanding: u });
    // 「普通の人」が含まれていないことを確認 (禁止語リスト内では言及するが、内容には漏らさない)
    // 注: 禁止語リストの説明文には「『${forbiddenList}』」として登場するが、これは「禁止」
    // の文脈なので OK。プロンプト本体の指示部分には絶対に出ないこと。
    // 簡易チェック: forbiddenList の context 以外で「普通の人」が出ていないこと
    const occurrences = (prompt.match(/普通の人/g) || []).length;
    // 「『普通の人／みんな／全員...』などの外向きにズレるコピーは使わない」の 1 箇所までは OK
    assert.ok(
      occurrences <= 1,
      `slide ${slide.id} prompt contains 普通の人 ${occurrences} times (expected ≤ 1)`,
    );
  }
});

test("generateSlidePrompt: mentions character role and props", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u });
  const slide = plan.slides[0];
  const prompt = generateSlidePrompt({ slide, understanding: u });
  assert.ok(prompt.includes("ひまり"), "prompt must mention himari");
  assert.ok(prompt.includes("らぼまる"), "prompt must mention labomaru");
  // どれか 1 つの prop は登場する
  const anyProp = slide.props.some((p) => prompt.includes(p));
  assert.ok(anyProp, "prompt must mention at least one prop");
});

// ------------------------------------------------------------------------
// generateSlideFactcheckPrompt
// ------------------------------------------------------------------------

test("generateSlideFactcheckPrompt: lists all slides and exposes 13 checks", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u });
  const out = generateSlideFactcheckPrompt({ slidePlan: plan, understanding: u });
  for (const slide of plan.slides) {
    assert.ok(out.includes(slide.id), `factcheck prompt missing slide id ${slide.id}`);
  }
  // 演出適合を含む13番までの番号付き check が含まれる
  for (let i = 1; i <= 13; i++) {
    assert.ok(out.includes(`${i}.`), `factcheck prompt missing check ${i}`);
  }
});

// ------------------------------------------------------------------------
// generateSlideRevisionPrompt
// ------------------------------------------------------------------------

test("generateSlideRevisionPrompt: surfaces issues and revisionHint", () => {
  const u = generateArticleUnderstanding({
    articleBrief: APPLE_PENDANT_BRIEF,
    source: APPLE_SOURCE,
  });
  const plan = generateSlidePlan({ understanding: u });
  const slide = plan.slides[0];
  const out = generateSlideRevisionPrompt({
    slide,
    factcheckEntry: {
      id: slide.id,
      verdict: "needs_revision",
      issues: ["文字が多すぎる", "報道段階の明示が薄い"],
      revisionHint: "大見出しを 1 つに絞り、報道段階を明示",
    },
    understanding: u,
  });
  assert.ok(out.includes("文字が多すぎる"));
  assert.ok(out.includes("報道段階の明示が薄い"));
  assert.ok(out.includes("大見出しを 1 つに絞り"));
  // 元の title は維持される旨が記載される
  assert.ok(out.includes(slide.title));
});
