// Topic-selection hypotheses from mature article comparisons. These are bounded
// editorial weights, not learned probabilities or a forecast of pageviews.
export function scoreReaderValue(item, config) {
  const policy = config.readerValuePolicy;
  if (!policy?.enabled) return null;
  const text = `${item.title || ""} ${item.description || ""}`.replace(/<[^>]*>/g, " ").normalize("NFKC").toLowerCase();
  const hit = (key) => (policy.keywords[key] || []).filter((word) => {
    const normalized = word.normalize("NFKC").toLowerCase();
    // AI must not match "detail", LINE must not match "deadline", etc.
    if (/^[a-z]+$/.test(normalized)) {
      return new RegExp(`(^|[^a-z0-9])${normalized}($|[^a-z0-9])`, "u").test(text);
    }
    return text.includes(normalized);
  });
  const matched = Object.fromEntries(Object.keys(policy.keywords).map((key) => [key, hit(key)]));
  const has = (key) => Boolean(matched[key]?.length);
  const narrow = has("nicheAiContexts") || has("restrictedAudience");
  const broad = has("mainstreamServices") && !narrow;
  const consumerChange = broad && has("consumerStakes") && has("concreteChanges");
  const benefitConditions = broad && has("costBenefits") && has("conditions");
  const concreteCuriosity = has("popularCulture") && has("technology") && has("feasibility") && !narrow;
  // RSS headlines usually do not contain the final editorial question. Preserve
  // a culture/technology lead and propose an angle for subsequent fact checking.
  const cultureTechOpportunity = has("popularCulture") && has("technology") && !narrow && !concreteCuriosity;
  const practicalWorkflow = has("mainstreamServices") && has("handsOn") && has("workflows") && !narrow;
  // A question mark or "what changes?" alone is not evidence of reader value.
  const clarification = (consumerChange || benefitConditions) && has("clarification");
  const hasValue = consumerChange || benefitConditions || concreteCuriosity || cultureTechOpportunity || practicalWorkflow;
  const nicheAiUpdate = has("aiServices") && (narrow || has("modelUpdates")) && !hasValue;
  const announcementOnly = has("announcements") && !hasValue;
  const signals = { consumerChange, benefitConditions, concreteCuriosity, cultureTechOpportunity, practicalWorkflow, clarification, nicheAiUpdate, announcementOnly };
  const reasons = [];
  const deductions = [];
  let positive = 0;
  let negative = 0;
  for (const [key, active] of Object.entries(signals)) {
    if (!active) continue;
    const weight = policy.weights[key] || 0;
    if (weight > 0) { positive += weight; reasons.push(key); }
    if (weight < 0) { negative += weight; deductions.push(key); }
  }
  positive = Math.min(policy.positiveCap, positive);
  negative = Math.max(-policy.negativeCap, negative);
  return {
    policyVersion: policy.version,
    net: positive + negative,
    positive,
    negative,
    signals,
    reasons,
    deductions,
    matched,
    // One observed successful mechanism is curiosity, not an immediate action.
    // It can pass only with culture + technology, sufficient total score, and
    // the existing Japan/exclusion/deduplication checks. Never assert feasibility.
    curiosityEligible: (concreteCuriosity || cultureTechOpportunity) && positive >= policy.curiosityMinScore,
    relevanceEligible: ((concreteCuriosity || cultureTechOpportunity) && positive >= policy.curiosityMinScore) || (consumerChange && positive >= policy.consumerMinScore),
    suggestedAngle: cultureTechOpportunity ? "作品で描かれる技術は現実にどこまで実現できるか。作品中の描写と現実の技術を一次情報で照合する" : null,
    reason: [
      consumerChange && "広く使われるサービスの料金・規約・設定などが変わる",
      benefitConditions && "得になる条件・対象外を具体的に確認できる",
      concreteCuriosity && "作品・話題への関心から技術の実現可能性を確かめる",
      cultureTechOpportunity && "作品と技術の接点がある（実現可能性を調べる切り口の候補）",
      practicalWorkflow && "実際の作業・使い方を検証して判断できる",
      nicheAiUpdate && "モデル発表・限定利用枠だけでは読者層が狭い",
      announcementOnly && "発表・提供開始だけでは具体的な疑問が見えない",
    ].filter(Boolean).join(" / ") || null,
  };
}
