import path from "node:path";

export const HAND_CROP_RESULT_SCHEMA = {
  type: "object",
  required: ["overallPass", "sourceImagesInspected", "cropsInspected", "verdictCounts", "images"],
  properties: {
    overallPass: { type: "boolean" },
    sourceImagesInspected: { type: "integer" },
    cropsInspected: { type: "integer" },
    verdictCounts: {
      type: "object",
      required: ["ok", "warning", "needs_revision"],
      properties: {
        ok: { type: "integer" }, warning: { type: "integer" }, needs_revision: { type: "integer" },
      },
    },
    images: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "verdict", "cropFile", "checks"],
        properties: {
          id: { type: "string" },
          verdict: { type: "string", enum: ["ok", "warning", "needs_revision"] },
          cropFile: { type: "string" },
          checks: {
            type: "array",
            items: {
              type: "object",
              required: ["label", "observedSide", "sideNatural", "thumbNatural", "connectionNatural", "proportionsNatural", "severity", "note"],
              properties: {
                label: { type: "string" }, observedSide: { type: "string", enum: ["left", "right", "unclear"] }, sideNatural: { type: "boolean" }, thumbNatural: { type: "boolean" },
                connectionNatural: { type: "boolean" }, proportionsNatural: { type: "boolean" },
                severity: { type: "string", enum: ["ok", "warning", "needs_revision"] }, note: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
};

export function collectVisibleHands(inspection, sourceById) {
  const entries = [
    ...(inspection.slides || []).map((item) => ({ id: item.id, handChecks: item.handChecks || [] })),
    ...(inspection.thumbnail ? [{ id: "thumbnail", handChecks: inspection.thumbnail.handChecks || [] }] : []),
  ];
  return entries.filter((item) => item.handChecks.length > 0).map((item) => {
    const source = sourceById[item.id];
    if (!source) throw new Error(`画像パスを解決できません: ${item.id}`);
    item.handChecks.forEach((hand, index) => validateBbox(hand.bbox, `${item.id} hand ${index + 1}`));
    return { ...item, source };
  });
}

export function validateBbox(bbox, label = "hand") {
  if (!bbox || ![bbox.x, bbox.y, bbox.width, bbox.height].every(Number.isInteger)) {
    throw new Error(`${label}: bbox がありません。一次検品を新スキーマで再実行してください`);
  }
  if (bbox.x < 0 || bbox.y < 0 || bbox.width < 1 || bbox.height < 1 || bbox.x >= 1000 || bbox.y >= 1000 || bbox.x + bbox.width > 1000 || bbox.y + bbox.height > 1000) {
    throw new Error(`${label}: bbox が範囲外です`);
  }
}

export function paddedPixelBox(bbox, imageWidth, imageHeight, padding = 0.45) {
  const x = (bbox.x / 1000) * imageWidth;
  const y = (bbox.y / 1000) * imageHeight;
  const width = (bbox.width / 1000) * imageWidth;
  const height = (bbox.height / 1000) * imageHeight;
  const padX = width * padding;
  const padY = height * padding;
  const left = Math.max(0, Math.floor(x - padX));
  const top = Math.max(0, Math.floor(y - padY));
  const right = Math.min(imageWidth, Math.ceil(x + width + padX));
  const bottom = Math.min(imageHeight, Math.ceil(y + height + padY));
  return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top) };
}

export function buildHandCropPrompt(items) {
  const manifest = items.map((item) => ({ id: item.id, cropFile: path.basename(item.cropFile), hands: item.handChecks.map((h, i) => ({ label: `${item.id}-hand${i + 1}`, character: h.character, expectedSide: h.side })) }));
  return `あなたは画像生成とは別セッションの、手の身体構造だけを検品する担当です。添付画像は手・手首・前腕を拡大したコンタクトシートです。元画像や生成文脈は参照せず、拡大部位だけを白紙で判定してください。

各タイルについて必ず順番に確認:
1. 左手/右手として自然な向きか。親指が手の向きと体側に対して矛盾しないか。
2. 手首と前腕が自然につながるか。別の手の継ぎ足し、ねじれ、融合、関節位置の破綻がないか。
3. 指の長さ・太さの比率が自然か。特に親指が異常に長い/太い/細い形でないか。
4. 同じ画像のタイルを横断して、ひまり/らぼまるの手が左右各1つを超えていないか。同じ腕から手が二重化して見える、体から独立した手がある、3本目の手がある場合は needs_revision。

曖昧さを残さない具体基準:
- タイル名の expectedSide は一次検品が全身像から割り当てた左右である。まず expectedSide を見ずに、親指側・手の甲/掌・指の曲がりから observedSide を left/right/unclear のどれかで必ず回答し、その後に expectedSide と照合する。反対側なら needs_revision。expectedSide を拡大像に合わせて読み替えない。判断不能を安易に自然扱いしない。
- 親指は通常、他の指より短く、手のひら幅と同程度以下である。親指が伸ばした人差し指と同程度に長い、手のひら幅を明らかに超える、付け根が指列側へ移動している場合は最低 warning。
- 2本でも、同方向を指すほぼ同形の手が近接・平行に重なり、別々の肩から出た左右の腕として追えず「手が二重」に見える場合は needs_revision。単に総数が2なら正常とはしない。
- 同じキャラの両手が同時に、近い位置から同じ方向へ指を伸ばす構図は、別々の腕を追えても「二重手」に見える高リスク構図である。2つの手が画面上で近接・平行なら needs_revision とし、見た目の二重化を優先する。
- 片手で紙やボードを持ち、反対の手で指差す構図では、指差し手を指先の向きだけで左右判定しない。袖口側の前腕の左右と、手の甲/掌・親指側が途中で反対の手型へ切り替わっていないかを重点確認する。前腕は左手位置なのに手首から先が右手型（または逆）なら needs_revision。
- 同じ人物が「片手で紙・札・端末を持つ＋反対手で指す」のように、両手で別々の動作を同時にしている構図は、左右接合の破綻を繰り返し見逃した既知の高リスク構図であり、生成側でも禁止している。見た目が一見自然でも needs_revision として再生成へ回す（この構図自体を公開しない）。
- らぼまるの腕は短く・太く・丸い。体側から手先までが胴体幅のおおむね4分の1を超える、細いホース状、急なS字、にょきっと伸びる腕は needs_revision。
- 各タイルには同じ部位の CONTEXT（肩側まで広い）と DETAIL（手首・指の拡大）が並ぶ。DETAILで左右・指比率、CONTEXTで腕の起点・接続・重複を別々に確認する。
- タイルが袖・腕の付け根を示し、手先が隠れていても、同じキャラに3本目の袖/腕が存在する証拠なら手数異常として needs_revision。

判定:
- 明確な左右不整合、親指位置の矛盾、手首接続異常、継ぎ足し・融合は needs_revision（公開ブロック）。
- 本数は正常でも、指・親指の長さや太さの比率だけに違和感がある場合は warning。判断に迷う比率は ok に倒さず warning とし、画像ID・タイル名と根拠を note に書く。
- 問題がなければ ok。
- 画像ごとの verdict は最も重い手の severity。overallPass は needs_revision が0件のときだけ true。
- sourceImagesInspected は添付画像数、cropsInspected はタイル総数。verdictCounts は画像単位で集計。

対象:
${JSON.stringify(manifest, null, 2)}

次のJSONスキーマに完全準拠したJSONだけを返してください。Markdownや前置きは禁止です。
${JSON.stringify(HAND_CROP_RESULT_SCHEMA, null, 2)}`;
}

export function summarizeVerdicts(images) {
  const counts = { ok: 0, warning: 0, needs_revision: 0 };
  for (const image of images || []) counts[image.verdict] = (counts[image.verdict] || 0) + 1;
  return counts;
}

export function applyStructuralOverrides(result, items) {
  const byId = new Map(items.map((item) => [item.id, item]));
  for (const image of result.images || []) {
    const item = byId.get(image.id);
    if (!item) continue;
    const counts = {};
    for (const hand of item.handChecks || []) counts[hand.character] = (counts[hand.character] || 0) + 1;
    for (const [character, count] of Object.entries(counts)) {
      if (count <= 2) continue;
      image.verdict = "needs_revision";
      image.checks ||= [];
      image.checks.push({
        label: `${image.id}-topology`, observedSide: "unclear", sideNatural: false, thumbNatural: false,
        connectionNatural: false, proportionsNatural: true, severity: "needs_revision",
        note: `${character} の一次検品で独立した手が ${count} 件列挙され、左右各1本を超えています。明確な本数異常として公開ブロック。`,
      });
    }
  }
  return result;
}

export function validateAgentResult(result, items) {
  if (!result || !Array.isArray(result.images)) throw new Error("二段検品agentの images がありません");
  const returned = new Map(result.images.map((image) => [image.id, image]));
  for (const item of items) {
    const image = returned.get(item.id);
    if (!image) throw new Error(`二段検品agentが画像を返していません: ${item.id}`);
    if (!Array.isArray(image.checks) || image.checks.length < item.handChecks.length) {
      throw new Error(`二段検品agentの部位回答が不足しています: ${item.id}`);
    }
    if (!["ok", "warning", "needs_revision"].includes(image.verdict)) throw new Error(`不正な二段検品判定: ${item.id}`);
  }
  return result;
}
