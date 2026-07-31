import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPrompt,
  FALLBACK_CONDITIONS,
  parsePerformanceBlock,
  parseSlidePlan,
} from "../../scripts/automation/codex-image-stage.mjs";
import {
  hasIdentityAnchorMismatch,
  validatePerformanceBlock,
} from "../../scripts/automation/phase-a-orchestrator.mjs";

test("parseSlidePlan extracts thumbnail and slide01-08 but stops before memo headings", () => {
  const text = [
    "# plan",
    "## thumbnail（16:9）",
    "- 入れる文字: テスト",
    "## slide01（4:5）",
    "- 見出し帯: 一枚目",
    "## 生成メモ",
    "- slide01 の説明に混ぜない",
  ].join("\n");
  const items = parseSlidePlan(text);
  assert.deepEqual(items.map((item) => item.id), ["thumbnail", "slide01"]);
  assert.equal(items[0].width, 1600);
  assert.equal(items[0].height, 900);
  assert.equal(items[1].width, 1122);
  assert.equal(items[1].height, 1402);
  assert.doesNotMatch(items[1].section, /生成メモ/);
});

test("fallback policy has the approved seven distinct conditions", () => {
  assert.equal(FALLBACK_CONDITIONS.length, 7);
  assert.equal(new Set(FALLBACK_CONDITIONS).size, 7);
  assert.ok(FALLBACK_CONDITIONS.includes("japanese_text_mismatch"));
  assert.ok(FALLBACK_CONDITIONS.includes("character_anchor_mismatch"));
  assert.ok(FALLBACK_CONDITIONS.includes("targeted_retry_exhausted"));
});

test("performance block is extracted and passed to every image item", () => {
  const text = [
    "# plan",
    "## 演出ブロック",
    "- 衣装: 点検用ベスト",
    "- 小道具: 虫眼鏡",
    "- ポーズ・動き: 端末を調べる",
    "- 背景・状況: 検品机",
    "- 表情: 真剣に調べる顔",
    "- 演出根拠: 検証記事だから",
    "## thumbnail（16:9）",
    "- 入れる文字: テスト",
    "## slide01（4:5）",
    "- 見出し帯: 一枚目",
  ].join("\n");
  const block = parsePerformanceBlock(text);
  assert.match(block, /点検用ベスト/);
  const items = parseSlidePlan(text);
  assert.equal(items.length, 2);
  assert.equal(items[0].performanceBlock, block);
  assert.equal(items[1].performanceBlock, block);

  const prompt = buildPrompt({
    item: items[0],
    outputFile: "D:/tmp/thumbnail.png",
    planPath: "D:/repo/slide_plan.md",
  });
  assert.match(prompt, /同一性（正本厳守・変更禁止）/);
  assert.match(prompt, /演出（記事テーマに合わせて積極的に変える）/);
  assert.match(prompt, /短く・太く・丸く/);
  assert.match(prompt, /触手状・ホース状/);
  assert.match(prompt, /自然に手が届く距離/);
  assert.match(prompt, /手のクローズアップを避け/);
  assert.match(prompt, /親指は手の向きと体側に対して正しい側/);
  assert.match(prompt, /手首と前腕をねじれ・継ぎ足しなく接続/);
  assert.match(prompt, /各1人\/1体だけ/);
  assert.match(prompt, /安全制約の適用範囲/);
  assert.match(prompt, /生成の既定は「壊れにくい手を自然に描く」/);
  assert.match(prompt, /開いた手・軽く添える手/);
  assert.match(prompt, /「安全のため演出を減らす」は不可/);
  assert.match(prompt, /首かけ・肩掛け・バッジ・ヘッドセット/);
  assert.match(prompt, /標準衣装・棒立ちへの退避は禁止/);
  assert.match(prompt, /手を隠す構図や演出項目の削除へ退避してはならない/);
  assert.match(prompt, /点検用ベスト/);
  assert.match(prompt, /真剣に調べる顔/);
  assert.doesNotMatch(prompt, /スライドでは白い標準衣装/);
});

test("performance block rejects unexplained standard-only thumbnail outfits", () => {
  const common = [
    "## 演出ブロック",
    "- 小道具: モニター",
    "- 手・小道具: 自然な構図で壊れにくい手を描く。開いた手・軽く添える手を小さめ・遠めにし、動作は片手だけ",
    "- ポーズ・動き: 見比べる",
    "- 背景・状況: 司令室",
    "- 表情: 穏やか",
    "- 演出根拠: AI判定",
  ];
  const weak = validatePerformanceBlock([
    common[0],
    "- 衣装: ひまりは正本準拠の白衣。らぼまるは正本素体。",
    ...common.slice(1),
  ].join("\n"));
  const missingHandDefault = validatePerformanceBlock([
    common[0],
    "- 衣装: AI判定オペレーター風ジャケットとヘッドセット",
    ...common.slice(1).map((line) => line.startsWith("- 手・小道具:") ? "- 手・小道具: 手は体側" : line),
  ].join("\n"));
  assert.equal(missingHandDefault.ok, false);
  assert.ok(missingHandDefault.missing.some((item) => item.includes("壊れにくい手を自然に描く")));
  assert.equal(weak.ok, false);
  assert.ok(weak.missing.some((item) => item.includes("テーマ別衣装")));

  const themed = validatePerformanceBlock([
    common[0],
    "- 衣装: AI判定オペレーター風ジャケットとヘッドセット",
    ...common.slice(1),
  ].join("\n"));
  assert.equal(themed.ok, true);

  const neutral = validatePerformanceBlock([
    common[0],
    "- 衣装: 中立解説系のため標準衣装。比較表を邪魔しない理由による。",
    ...common.slice(1),
  ].join("\n"));
  assert.equal(neutral.ok, true);
});

test("fallback identity classifier ignores performance changes", () => {
  assert.equal(hasIdentityAnchorMismatch("衣装を作業着にして、虫眼鏡を持つポーズへ変更"), false);
  assert.equal(hasIdentityAnchorMismatch("背景を検品机に変更"), false);
  assert.equal(hasIdentityAnchorMismatch("らぼまるの耳ビレと首輪が消えて別キャラ化"), true);
  assert.equal(hasIdentityAnchorMismatch("ひまりの顔立ちと体型が正本と違う"), true);
});

