import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

import {
  buildPrompt,
  FALLBACK_CONDITIONS,
  parsePerformanceBlock,
  parseSlidePlan,
  verifyGeneratedManifest,
  sha256,
} from "../../scripts/automation/codex-image-stage.mjs";
import {
  hasIdentityAnchorMismatch,
  validatePerformanceBlock,
  newState, STEPS, assistedInstruction,
} from "../../scripts/automation/phase-a-orchestrator.mjs";

test("parent ImageGen action stays pending without launching a nested carrier or claiming success", () => {
  const slug = "image-carrier-regression-not-real";
  const root = path.resolve(import.meta.dirname, "../..");
  const stateFile = path.join(root, "logs/article", `${slug}.state.json`);
  const state = newState({ slug, theme: "画像経路テスト" });
  for (const step of STEPS) {
    if (step.name === "generate_images") break;
    state.steps[step.name].status = "done";
  }
  mkdirSync(path.dirname(stateFile), { recursive: true });
  writeFileSync(stateFile, JSON.stringify(state));
  const env = { ...process.env, ORCH_STUB: "0", SUMALABO_CODEX_CLI: "missing-carrier-must-not-launch", REVIEW_NOTIFY_SECRET: "" };
  const invoke = extra => spawnSync(process.execPath, ["scripts/automation/phase-a-orchestrator.mjs", "--slug", slug, ...extra], { cwd: root, env, encoding: "utf8", timeout: 20000 });
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = invoke([]);
      assert.equal(result.status, 10, result.stderr);
      assert.match(result.stdout, /親Codex自身のbuilt-in ImageGenを直接/);
      const saved = JSON.parse(readFileSync(stateFile, "utf8"));
      assert.equal(saved.steps.generate_images.status, "pending");
      assert.equal(saved.steps.generate_images.attempts, 0);
      assert.equal(saved.steps.generate_images.data.transport, "codex_builtin_imagegen");
    }
    const refused = invoke(["--advance", "generate_images"]);
    assert.equal(refused.status, 1, refused.stderr);
    assert.match(refused.stderr, /generated_images_invalid/);
    assert.equal(JSON.parse(readFileSync(stateFile, "utf8")).steps.generate_images.status, "pending");
    const instruction = assistedInstruction(state, STEPS.find(step => step.name === "generate_images"));
    assert.match(instruction, /独立検品・身体構造・別セッション手クロップ検品/);
    assert.match(instruction, /自己検品を独立合格扱いしない/);
    // Corrective generation also returns to the parent; no nested retry runs.
    state.steps.generate_images.status = "done";
    writeFileSync(stateFile, JSON.stringify(state));
    const factcheck = path.join(root, "logs/article", `${slug}.factcheck.json`);
    writeFileSync(factcheck, JSON.stringify({ pass: false, regenerate: [{ which: "slide01", reason: "余分な手がある身体構造の破綻" }] }));
    try {
      const retry = invoke(["--advance", "factcheck_images", "--result", factcheck]);
      assert.equal(retry.status, 1, retry.stderr);
      assert.match(retry.stderr, /builtin_targeted_retry_required/);
      const saved = JSON.parse(readFileSync(stateFile, "utf8"));
      assert.equal(saved.steps.factcheck_images.status, "pending");
      assert.deepEqual(saved.steps.factcheck_images.data.builtinRetryTargets, ["slide01"]);
      assert.equal(saved.steps.factcheck_images.data.codexTargetedRetries, 1);
    } finally { rmSync(factcheck, { force: true }); }
  } finally { rmSync(stateFile, { force: true }); }
});

test("generation advance validates all nine real PNGs, IDs, dimensions and hashes", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "sumalabo-image-manifest-"));
  const slug = "image-manifest-test";
  const planPath = path.join(dir, "slide_plan.md"), manifestFile = path.join(dir, "manifest.json");
  const ids = [...Array.from({ length: 8 }, (_, i) => `slide0${i + 1}`), "thumbnail"];
  writeFileSync(planPath, ids.map(id => `## ${id}\n- 文字: テスト`).join("\n"));
  const outputs = [];
  try {
    for (const [index, id] of ids.entries()) {
      const file = path.join(dir, `${id}.png`);
      await sharp({ create: { width: 32, height: 40, channels: 3, background: { r: index * 20, g: 50, b: 60 } } }).png({ compressionLevel: 0 }).toFile(file);
      outputs.push({ id, path: file, width: 32, height: 40, sha256: sha256(file) });
    }
    const manifest = { slug, transport: "codex_builtin_imagegen", outputs };
    const check = value => { writeFileSync(manifestFile, JSON.stringify(value)); return verifyGeneratedManifest({ slug, planPath, manifestFile }); };
    assert.equal(check(manifest).ok, true);
    assert.equal(check({ ...manifest, outputs: outputs.slice(0, 8) }).ok, false);
    assert.equal(check({ ...manifest, slug: "another-article" }).ok, false);
    assert.equal(check({ ...manifest, outputs: outputs.map((x, i) => i ? x : { ...x, sha256: "wrong" }) }).ok, false);
    assert.equal(check({ ...manifest, outputs: outputs.map((x, i) => i ? x : { ...x, width: 31 }) }).ok, false);
    assert.equal(check({ ...manifest, outputs: outputs.map((x, i) => i === 8 ? outputs[0] : x) }).ok, false);
    rmSync(outputs[0].path);
    assert.equal(check(manifest).ok, false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("date imagery gate distinguishes an excluded calendar from an affirmative calendar motif", () => {
  const plan = [
    "## 演出ブロック",
    "- 衣装: 外出用ジャケット",
    "- 小道具: スマホ",
    "- 手・小道具: 壊れにくい手を自然に描く。開いた手・軽く添える手を使う。",
    "- ポーズ・動き: 外出前に相談する",
    "- 背景・状況: 玄関",
    "- 表情: 発見",
    "- 演出根拠: アプリの提供開始",
    "- 日付型判定: 該当",
    "- 変化の中身: iOSアプリの追加",
    "- 日付ラベル: 11/10発表",
    "- 直近10記事類型チェック: 比較机から玄関へ変更",
  ].join("\n");
  assert.equal(validatePerformanceBlock(plan + "\n- 主要モチーフ: スマホから相談する生活場面。カレンダー類や日付そのものを主要モチーフにしない。").ok, true);
  assert.equal(validatePerformanceBlock(plan + "\n- 主要モチーフ: カレンダーを中心にスマホを置く。").ok, false);
  assert.equal(validatePerformanceBlock(plan + "\n- 主要モチーフ: カレンダーは使わないが、スケジュール帳を中心にスマホを置く。").ok, false);
});

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
    "- 日付型判定: 非該当",
    "- 変化の中身: 非該当",
    "- 主要モチーフ: AI判定の操作卓",
    "- 日付ラベル: なし",
    "- 直近10記事類型チェック: 操作卓型は類似なし",
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

test("date-type thumbnail rejects calendar as the major motif", () => {
  const base = [
    "## 演出ブロック",
    "- 衣装: 会員サービス売り場のスタッフ風ベスト",
    "- 小道具: 会員特典カード。カレンダーは片隅だけ",
    "- 手・小道具: 壊れにくい手を自然に描き、開いた手・軽く添える手を使う",
    "- ポーズ・動き: 無料枠から変わる対象を見比べる",
    "- 背景・状況: サービス条件の切替カウンター",
    "- 表情: 自分の条件を確かめる迷い顔",
    "- 演出根拠: 利用条件変更を体験図にする",
    "- 日付型判定: 該当",
    "- 変化の中身: 無料枠から会員特典へ利用条件が移る",
    "- 日付ラベル: 8/26から",
    "- 直近10記事類型チェック: カレンダー型と異なる売り場場面へ変更",
  ];
  const rejected = validatePerformanceBlock([...base, "- 主要モチーフ: 大きなカレンダーを見る二人"].join("\n"));
  assert.equal(rejected.ok, false);
  assert.ok(rejected.missing.includes("日付型記事の主要モチーフはカレンダー類禁止"));
  const accepted = validatePerformanceBlock([...base, "- 主要モチーフ: 会員特典へ移るサービスカード"].join("\n"));
  assert.equal(accepted.ok, true);
});

test("fallback identity classifier ignores performance changes", () => {
  assert.equal(hasIdentityAnchorMismatch("衣装を作業着にして、虫眼鏡を持つポーズへ変更"), false);
  assert.equal(hasIdentityAnchorMismatch("背景を検品机に変更"), false);
  assert.equal(hasIdentityAnchorMismatch("らぼまるの耳ビレと首輪が消えて別キャラ化"), true);
  assert.equal(hasIdentityAnchorMismatch("ひまりの顔立ちと体型が正本と違う"), true);
});

