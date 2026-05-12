// Phase B (Chrome MCP + ChatGPT 本文生成) 実行証跡のスキーマと helper。
//
// 背景:
//   2026-05-12 の Galaxy S27 再生成テストで、Phase B (= MCP 接続 Chrome で
//   ChatGPT プロジェクトを開き、prompt 貼付 → 初稿 → 精錬 → 最終稿保存) を
//   Claude が直接本文を書く形で代替してしまい、本来の品質チェック網を全部
//   バイパスする事故が発生した。
//
//   再発防止のため、Phase B が "本当に Chrome MCP + ChatGPT を駆動した"
//   証跡をファイルに残し、Phase C (article:import-generated) でこの証跡を
//   読まなければ blocking する。
//
// 保存先:
//   logs/automation/{slug}.phase-b-proof.json
//
// スキーマ (全てのフィールドが必須ではないが、最終的な validateProof()
// パスには completed: true + 後述 blocking 条件を満たす必要がある):
//
//   {
//     "slug": "202605-xxx",
//     "sourceUrl": "https://smhn.info/...",
//     "articleProjectUrl": "https://chatgpt.com/g/...",
//     "phaseBStartedAt": "...",               // Phase B 開始時 (MCP Chrome 起動)
//     "chatgptProjectOpenedAt": "...",        // ChatGPT project URL を navigate 後
//     "promptPastedAt": "...",                // article prompt 貼付完了
//     "firstDraftCompletedAt": "...",         // 初稿生成完了
//     "firstDraftJapaneseChars": 0,
//     "refinementPasses": {
//       "metaRemovalCheck": {...},
//       "volumeCheck": {...},
//       "sumalaboStyleCheck": {...},
//       "sourceAndReferenceCheck": {...}
//     },
//     "finalDraftRequestedAt": "...",         // 「最終稿として全文再出力」依頼
//     "finalDraftSavedAt": "...",             // drafts/generated に保存完了
//     "finalDraftPath": "drafts/generated/{slug}.md",
//     "finalDraftJapaneseChars": 0,
//     "h2Count": 0,
//     "hasReferenceSection": false,
//     "hasCharacterDialogue": false,
//     "completed": false
//   }
//
// 利用イメージ:
//   import { startProof, recordStep, completeProof, readProof, validateProof, proofPath } from "../sumahon/phase-b-proof.mjs";
//
//   // Phase B の Claude in Chrome 運転中:
//   await startProof(slug, { sourceUrl, articleProjectUrl });
//   await recordStep(slug, "chatgptProjectOpenedAt");
//   await recordStep(slug, "promptPastedAt");
//   await recordStep(slug, "firstDraftCompletedAt", { firstDraftJapaneseChars: 2800 });
//   await recordRefinement(slug, "metaRemovalCheck", { passed: true, notes: "..." });
//   await completeProof(slug, { finalDraftPath, finalDraftJapaneseChars, h2Count, hasReferenceSection, hasCharacterDialogue });
//
//   // Phase C (import-generated) 側:
//   const proof = await readProof(slug);
//   const v = validateProof(proof);
//   if (!v.ok) { /* blocking */ }
//
// 安全方針:
//   - 証跡を作るのは Phase B 実行コードの責任。直接本文を書いてここを偽造
//     しないこと。万一偽造しても、completed=true / Japanese chars / 参考情報
//     有無は import-generated 側の validateForAutomatedPublish と
//     articleQualityCheck によって最終チェックされる。

import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const PROOF_DIR = path.join("logs", "automation");

export function proofPath(slug) {
  return path.join(PROOF_DIR, `${slug}.phase-b-proof.json`);
}

async function readJsonSafe(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(await readFile(filePath, "utf-8"));
  } catch {
    return null;
  }
}

async function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function readProof(slug) {
  return await readJsonSafe(proofPath(slug));
}

export async function startProof(slug, { sourceUrl, articleProjectUrl } = {}) {
  const now = new Date().toISOString();
  const proof = {
    slug,
    sourceUrl: sourceUrl || null,
    articleProjectUrl: articleProjectUrl || null,
    phaseBStartedAt: now,
    chatgptProjectOpenedAt: null,
    promptPastedAt: null,
    firstDraftCompletedAt: null,
    firstDraftJapaneseChars: 0,
    refinementPasses: {
      metaRemovalCheck: null,
      volumeCheck: null,
      sumalaboStyleCheck: null,
      sourceAndReferenceCheck: null,
    },
    finalDraftRequestedAt: null,
    finalDraftSavedAt: null,
    finalDraftPath: null,
    finalDraftJapaneseChars: 0,
    h2Count: 0,
    hasReferenceSection: false,
    hasCharacterDialogue: false,
    completed: false,
  };
  await writeJsonAtomic(proofPath(slug), proof);
  return proof;
}

export async function recordStep(slug, stepKey, payload = {}) {
  const proof = (await readProof(slug)) || (await startProof(slug, {}));
  proof[stepKey] = new Date().toISOString();
  Object.assign(proof, payload);
  await writeJsonAtomic(proofPath(slug), proof);
  return proof;
}

export async function recordRefinement(slug, refinementKey, details = {}) {
  const proof = (await readProof(slug)) || (await startProof(slug, {}));
  if (!proof.refinementPasses) proof.refinementPasses = {};
  proof.refinementPasses[refinementKey] = { recordedAt: new Date().toISOString(), ...details };
  await writeJsonAtomic(proofPath(slug), proof);
  return proof;
}

export async function completeProof(slug, finalMetrics = {}) {
  const proof = (await readProof(slug)) || (await startProof(slug, {}));
  proof.finalDraftSavedAt = new Date().toISOString();
  proof.completed = true;
  Object.assign(proof, finalMetrics);
  await writeJsonAtomic(proofPath(slug), proof);
  return proof;
}

/**
 * Phase C (import-generated) で呼ぶ証跡バリデータ。
 * blocking と warning を分けて返す。
 *
 * blocking 条件 (どれか1つでも該当すれば import を止める):
 *   - phase_b_proof_missing: proof ファイルが存在しない or 読めない
 *   - phase_b_incomplete: proof.completed !== true
 *   - phase_b_no_final_draft_path: proof.finalDraftPath が無い
 *   - phase_b_final_draft_missing: proof.finalDraftPath のファイルが実在しない
 *   - phase_b_final_draft_too_thin: finalDraftJapaneseChars < 2500
 *   - phase_b_missing_reference_section: hasReferenceSection !== true
 *   - phase_b_missing_chatgpt_open: chatgptProjectOpenedAt が記録されていない
 *     (= Phase B の Chrome 動作証跡が無い)
 *   - phase_b_missing_prompt_paste: promptPastedAt が記録されていない
 *   - phase_b_missing_first_draft: firstDraftCompletedAt が記録されていない
 *
 * warning (止めないがログ):
 *   - phase_b_missing_character_dialogue: hasCharacterDialogue !== true
 *     (validateArticleQuality の character_visual_missing で最終的に検出される)
 */
export function validateProof(proof) {
  const blockingReasons = [];
  const warningReasons = [];

  if (!proof) {
    return { ok: false, blockingReasons: ["phase_b_proof_missing"], warningReasons: [] };
  }
  if (proof.completed !== true) blockingReasons.push("phase_b_incomplete: completed !== true");
  if (!proof.finalDraftPath) blockingReasons.push("phase_b_no_final_draft_path");
  else if (!existsSync(proof.finalDraftPath)) {
    blockingReasons.push(`phase_b_final_draft_missing: ${proof.finalDraftPath}`);
  }
  if ((proof.finalDraftJapaneseChars || 0) < 2500) {
    blockingReasons.push(`phase_b_final_draft_too_thin: ${proof.finalDraftJapaneseChars || 0} < 2500`);
  }
  if (proof.hasReferenceSection !== true) {
    blockingReasons.push("phase_b_missing_reference_section");
  }
  if (!proof.chatgptProjectOpenedAt) {
    blockingReasons.push("phase_b_missing_chatgpt_open: Chrome MCP で ChatGPT プロジェクトを開いた証跡が無い");
  }
  if (!proof.promptPastedAt) {
    blockingReasons.push("phase_b_missing_prompt_paste");
  }
  if (!proof.firstDraftCompletedAt) {
    blockingReasons.push("phase_b_missing_first_draft");
  }
  if (proof.hasCharacterDialogue !== true) {
    warningReasons.push("phase_b_missing_character_dialogue");
  }
  return { ok: blockingReasons.length === 0, blockingReasons, warningReasons };
}
