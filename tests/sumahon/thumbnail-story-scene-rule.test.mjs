import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { generateThumbnailPrompt } from "../../scripts/sumahon/generate-thumbnail-prompt.mjs";

const root = new URL("../../", import.meta.url);

test("thumbnail prompt requires emotion, action, scene, hand action, and integrated text", () => {
  const prompt = generateThumbnailPrompt({
    articleTitle: "テスト記事",
    coreIdea: "読者が選択肢を比べる",
    thumbnailMood: "発見",
    mainSubject: "比較体験",
    characterUse: { himari: "試す", labomaru: "覗き込む", note: "同じ画面を見る" },
    referenceAssetsMissing: true,
    referenceAssets: [],
    visualMotifs: ["スマホ"],
    headlineIdeas: ["どれを使う？"],
    sublineIdeas: ["3つを比較"],
    avoid: ["実在ロゴ"],
  });

  for (const required of ["感情（必須）", "行動（必須）", "場面（必須）", "手の動作（必須）", "文字配置（必須）"]) {
    assert.match(prompt, new RegExp(required.replace(/[（）]/g, "\\$&")));
  }
  assert.match(prompt, /紹介役にしない/);
  assert.match(prompt, /後乗せは禁止/);
});

test("phase A and Codex image prompt carry the story-scene rule", () => {
  const phaseA = readFileSync(new URL("scripts/automation/phase-a-orchestrator.mjs", root), "utf8");
  const codexStage = readFileSync(new URL("scripts/automation/codex-image-stage.mjs", root), "utf8");

  assert.match(phaseA, /サムネイル節には.*感情.*行動.*場面.*手の動作/s);
  assert.match(phaseA, /テキストパネル横の紹介役は禁止/);
  assert.match(codexStage, /記事主題に対する具体的な感情/);
  assert.match(codexStage, /文字込み一枚絵として生成/);
});
