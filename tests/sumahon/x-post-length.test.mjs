// tests/sumahon/x-post-length.test.mjs — X投稿文の280加重ガード（非Premium上限）のテスト。
// 背景: 2026-07-05、日本語317文字の生成文がString.length判定をすり抜けて投稿画面で
// 超過→手動短縮になった。ガードは「途中カットではなく短い構成での生成し直し」。
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateXPost, weightedTweetLength } from "../../scripts/sumahon/generate-x-post.mjs";

test("neutral free-offer ending remains grammatical after banned-word sanitizing", () => {
  const result = generateXPost({
    title: "LINEの静かな送信、条件変更",
    description: "LINEラボの機能は8月26日に無料提供を終了し、日本では会員特典へ移ります。",
    slug: "202608-line-mute-message-lyp-premium",
  });
  assert.match(result.primary.text, /無料枠から外れ、日本では会員特典へ移ります/);
  assert.doesNotMatch(result.primary.text, /無料提供をし/);
});

test("1. weightedTweetLength: CJKは1文字=2、ASCIIは1、URLは23固定", () => {
  assert.equal(weightedTweetLength("abc"), 3);
  assert.equal(weightedTweetLength("あいう"), 6);
  assert.equal(weightedTweetLength("https://sumalabo.com/articles/very-long-slug-that-is-much-longer-than-23-chars/"), 23);
  assert.equal(weightedTweetLength("aあ https://x.com/ b"), 1 + 2 + 1 + 23 + 1 + 1);
});

test("2. 長い日本語descriptionでも加重280以内に収まる（downshiftedで生成し直し）", () => {
  const longDesc =
    "Claude Fable 5は7月7日まで対象サブスクの週次上限50%以内で利用でき、7月8日以降は公式説明上usage credits経由に切り替わる予定です。" +
    "50%の意味、Settings > Usageの見方、usage creditsの仕組みと注意点、日本での未確認事項まで、公式情報と報道を分けてやさしく整理します。";
  const r = generateXPost({
    slug: "202607-claude-fable-5-usage-credits-switch",
    title: "Claude Fable 5、7月8日からusage credits制へ。サブスクで使える残り枠と、切り替え後どうなるか",
    description: longDesc,
    type: "news",
  });
  assert.equal(r.primary.fitsLimit, true, `weighted=${r.primary.weightedLength} が280超過`);
  assert.ok(r.primary.weightedLength <= 280);
  assert.equal(r.primary.downshifted, true, "長文は短い構成で生成し直されるはず");
  // 途中カット（…付き切り詰め）は使わない
  assert.equal(r.primary.truncated, false);
  assert.ok(!r.primary.text.includes("…"), "slice+… の自動短縮は禁止");
  // URL・タグは必ず残る
  assert.ok(r.primary.text.includes("https://sumalabo.com/articles/202607-claude-fable-5-usage-credits-switch/"));
  assert.ok(r.primary.text.includes("#すまラボ"));
  // 本文は文の途中で切れていない（本文行が句点や？で終わる）
  const bodyLines = r.primary.text.split("\n").filter((l) => l && !l.startsWith("http") && !l.startsWith("#"));
  const lastBodyLine = bodyLines[bodyLines.length - 1];
  assert.match(lastBodyLine, /[。．！!？?）)か]$/, `本文が文途中で切れている: "${lastBodyLine}"`);
});

test("3. 短いdescriptionはフル構成のまま（downshifted=false）", () => {
  const r = generateXPost({
    slug: "short-article",
    title: "短いタイトル",
    description: "短い説明文です。",
    type: "news",
  });
  assert.equal(r.primary.fitsLimit, true);
  assert.equal(r.primary.downshifted, false);
  assert.ok(r.primary.text.includes("短い説明文です"), "説明文フル構成が残るはず（hedge付与で末尾句点は変化しうる）");
});

test("4. 代替案（結論先出し/問いかけ）も全て280加重以内", () => {
  const longDesc = "とても長い日本語の説明文。".repeat(30);
  const r = generateXPost({
    slug: "x",
    title: "これはかなり長めの日本語タイトルで、読点も含んでいて、それなりの長さがあります",
    description: longDesc,
    type: "news",
  });
  for (const alt of [r.primary, ...r.alternates]) {
    assert.ok(alt.weightedLength <= 280, `${alt.label || "primary"}: weighted=${alt.weightedLength}`);
  }
});

test("5. 禁則語「普通の人」がフォールバック文言に含まれない", () => {
  const r = generateXPost({ slug: "x", title: "タイトルだけの記事", description: "", type: "news" });
  const all = [r.primary.text, ...r.alternates.map((a) => a.text)].join("\n");
  assert.ok(!all.includes("普通の人"), "禁則語がフォールバックに残っている");
});

test("6. 公式一次情報のnews記事へ『公式発表ではありません』を付けない", () => {
  const official = generateXPost({
    slug: "official-news",
    title: "Gemini Spark、日本のProはまだ対象外",
    description: "Google公式の更新履歴と料金ページを確認して整理します。",
    type: "news",
  });
  assert.equal(official.isReporting, false);
  assert.ok(!official.primary.text.includes("公式発表ではありません"));

  const rumor = generateXPost({
    slug: "rumor-news",
    title: "次期モデルの噂を整理",
    description: "未確定情報を報道ベースで確認します。",
    type: "news",
  });
  assert.equal(rumor.isReporting, true);
  assert.match(rumor.primary.text, /未確定|報道ベース|公式発表ではありません/);
});
