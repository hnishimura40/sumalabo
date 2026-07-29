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
              required: ["label", "handVisible", "observedSide", "sideNatural", "thumbNatural", "connectionNatural", "gripOppositionNatural", "proportionsNatural", "severity", "note"],
              properties: {
                label: { type: "string" }, handVisible: { type: "boolean" }, observedSide: { type: "string", enum: ["left", "right", "unclear"] }, sideNatural: { type: "boolean" }, thumbNatural: { type: "boolean" },
                connectionNatural: { type: "boolean" }, gripOppositionNatural: { type: "boolean" }, proportionsNatural: { type: "boolean" },
                severity: { type: "string", enum: ["ok", "warning", "needs_revision", "no_hand_in_crop"] }, note: { type: "string" },
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
    ...(inspection.slides || []).map((item) => ({ id: item.id, handChecks: (item.handChecks || []).filter((hand) => hand.visible !== false) })),
    ...(inspection.thumbnail ? [{ id: "thumbnail", handChecks: (inspection.thumbnail.handChecks || []).filter((hand) => hand.visible !== false) }] : []),
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
  const manifest = items.map((item) => ({
    id: item.id,
    cropFile: path.basename(item.cropFile),
    hands: item.handChecks.map((h, i) => ({
      label: item.id + "-hand" + (i + 1),
      character: h.character,
    })),
  }));
  return [
    "あなたは画像生成とは別セッションの、手の身体構造だけを検品する担当です。",
    "添付タイルは同じ部位の CONTEXT（周辺を含む）と DETAIL（bbox拡大）です。",
    "",
    "各ラベルを次の順で必ず個別判定してください。",
    "1. CONTEXTまたはDETAILに、対象キャラクターの「手・手首・前腕」が実際に確認できるか。",
    "2. 見えない、別部位、背景、小道具だけ、または手と断定できない場合は handVisible=false、severity=no_hand_in_crop とする。これは判定対象外であり warning/needs_revision にしてはいけない。",
    "3. handVisible=true の場合だけ、同一の手の内部で、親指位置と手の甲/掌の関係に解剖学的矛盾がないか、手首と腕の接続が自然か、指の長さ・太さ（特に親指）が自然かを確認する。",
    "4. 一次検品の left/right 予測や構図上の期待とは比較しない。observedSide は見える範囲で回答するだけで、left/right/unclear のどれでも単独では異常理由にしない。",
    "5. 明確な解剖学的左右矛盾・接続異常は needs_revision。比率だけの違和感は warning。問題がなければ ok。",
    "6. 同一キャラクターに実在する手が3つ以上見える場合は needs_revision。bboxが手を捉えていないタイルは本数に数えない。",
    "7. 二重手: 2つの手が近接・平行して同じ方向を指すほぼ同形の手に見える場合は、総数が2でも needs_revision。肩・腕を別々に追えそうでも、画面上で二重手に見えること自体を構造破綻として扱う。",
    "8. 手首内の型切替: 前腕から手首、掌、親指へ連続して追い、途中で掌/手の甲が反転する、親指が反対側へ切り替わる、別の手を継ぎ足したような境界がある場合は needs_revision。構図予測との比較ではなく、同一の手の内部だけで判断する。",
    "8a. 端末・札・紙などを握る手は、親指と残り4本の長い指が物体または掌を挟んで反対側から向かい合っているかを必ず確認する。親指と4本指が同じ側・同じ面から生え、全てが画面前面や同じ縁へ並ぶ握りは、右手型と左手型が手首で切り替わった接続異常として needs_revision。gripOppositionNatural で個別回答する。",
    "8b. 握る手を ok にする場合、note に (i)掌と手の甲のどちらが見えるか、(ii)どの指を親指と判断したか、(iii)残りの指がどの反対側へ回り込むか、(iv)親指側の手首が前腕へどう連続するか、の4点を具体的に書く。1点でも画像から確認できなければ最低 warning、同時成立しなければ needs_revision。単に『自然に握っている』『明確な矛盾なし』だけで ok にしてはいけない。",
    "9. 比率: 親指は通常ほかの指より短く、手のひら幅と同程度以下。親指が伸ばした人差し指並みに長い、手のひら幅を明確に超える、付け根が指列側へずれる場合は最低 warning。",
    "10. らぼまる: 腕は正本どおり短く・太く・丸い。体側から手先までが胴体幅のおおむね4分の1を超える、細いホース状、急なS字、にょきっと伸びる場合は needs_revision。",
    "11. 同じ人物が片手で紙・札・端末を持ち、反対手で指すという別動作を同時に行う構図は、左右接合破綻を繰り返し見逃した既知の禁止構図なので needs_revision。各手が単体で自然に見えても公開しない。",
    "12. 人差し指を立てた手では、人差し指と親指それぞれを付け根から先端まで追い、見かけの長さを明示比較する。親指が人差し指の約70%以上に見える、親指先端が人差し指の先端側3分の1へ達する、掌幅を超える、または70%未満と確認できない場合は最低 warning。note に比較結果を書き、遠近感だけを理由に安易にokへ倒さない。",
    "",
    "画像verdictは handVisible=true のcheckだけの最大severityとする。全checkが no_hand_in_crop の画像は verdict=ok。overallPass は needs_revision が0件のときだけtrue。",
    "",
    "対象:",
    JSON.stringify(manifest, null, 2),
    "",
    "JSONだけを返してください。",
    JSON.stringify(HAND_CROP_RESULT_SCHEMA, null, 2),
  ].join("\n");
}

export function normalizeNoHandInCrop(result) {
  const rank = { ok: 0, warning: 1, needs_revision: 2 };
  for (const image of result.images || []) {
    for (const check of image.checks || []) {
      if (check.handVisible === false || check.severity === "no_hand_in_crop") {
        check.handVisible = false;
        check.observedSide = "unclear";
        check.sideNatural = true;
        check.thumbNatural = true;
        check.connectionNatural = true;
        check.proportionsNatural = true;
        check.severity = "no_hand_in_crop";
      } else {
        check.handVisible = true;
      }
    }
    const visible = (image.checks || []).filter((check) => check.handVisible);
    image.verdict = visible.reduce(
      (worst, check) => (rank[check.severity] > rank[worst] ? check.severity : worst),
      "ok",
    );
  }
  return result;
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
    for (const [index, hand] of (item.handChecks || []).entries()) {
      if (image.checks?.[index]?.handVisible === false) continue;
      counts[hand.character] = (counts[hand.character] || 0) + 1;
    }
    for (const [character, count] of Object.entries(counts)) {
      if (count <= 2) continue;
      image.verdict = "needs_revision";
      image.checks ||= [];
      image.checks.push({
        label: `${image.id}-topology`, observedSide: "unclear", sideNatural: false, thumbNatural: false,
        connectionNatural: false, gripOppositionNatural: true, proportionsNatural: true, severity: "needs_revision",
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
  return normalizeNoHandInCrop(result);
}
