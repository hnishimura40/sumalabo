// Topic-selection hypotheses from mature article comparisons. These are bounded
// editorial weights, not learned probabilities or a forecast of pageviews.
export function scoreReaderValue(item, config, source = {}) {
  const policy = config.readerValuePolicy;
  if (!policy?.enabled) return null;
  const text = `${item.title || ""} ${item.description || ""}`.replace(/<[^>]*>/g, " ").normalize("NFKC").toLowerCase();
  const hit = (key, target = text) => (policy.keywords[key] || []).filter((word) => {
    const normalized = word.normalize("NFKC").toLowerCase();
    // AI must not match "detail", LINE must not match "deadline", etc.
    if (/^[a-z]+$/.test(normalized)) {
      return new RegExp(`(^|[^a-z0-9])${normalized}($|[^a-z0-9])`, "u").test(target);
    }
    return target.includes(normalized);
  });
  const matched = Object.fromEntries(Object.keys(policy.keywords).map((key) => [key, hit(key)]));
  const has = (key) => Boolean(matched[key]?.length);
  const title = String(item.title || "").normalize("NFKC").toLowerCase();
  const aiContext = (matched.aiServices || []).some(word => !["Meta", "メタ"].includes(word));
  const uncertain = hit("unconfirmed", title).length > 0;
  const event = hit("peripheralEvents", title).length > 0;
  const aiBenchmark = aiContext && hit("aiMetrics", title).length > 0 && !uncertain && !event;
  const aiModelLaunch = aiContext && hit("aiLaunchMarkers", title).length > 0 && has("announcements") && !uncertain && !event;
  const chart = item.appChart;
  // A headline claiming '#1' is not a verified chart observation.
  const aiChartMomentum = source.type === "app-store-chart" && source.official === true &&
    chart?.provider === "Apple" && chart.feedUrl === source.url && chart.country === source.country &&
    chart.chart === "top-free" && chart.scope === "all-apps" && Number.isInteger(chart.rank) && chart.rank > 0 &&
    Number.isFinite(Date.parse(chart.feedUpdatedAt));
  const aiCore = aiBenchmark || aiModelLaunch || aiChartMomentum;
  const peripheralEvent = event && !aiCore;
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
  const hasValue = aiCore || consumerChange || benefitConditions || concreteCuriosity || cultureTechOpportunity || practicalWorkflow;
  const nicheAiUpdate = aiContext && narrow && !hasValue;
  const announcementOnly = has("announcements") && !hasValue;
  const signals = { aiBenchmark, aiModelLaunch, aiChartMomentum, peripheralEvent, consumerChange, benefitConditions, concreteCuriosity, cultureTechOpportunity, practicalWorkflow, clarification, nicheAiUpdate, announcementOnly };
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
    aiCoreEligible: aiCore,
    aiPriority: aiChartMomentum || aiBenchmark ? 2 : aiModelLaunch ? 1 : 0,
    // One observed successful mechanism is curiosity, not an immediate action.
    // It can pass only with culture + technology, sufficient total score, and
    // the existing Japan/exclusion/deduplication checks. Never assert feasibility.
    curiosityEligible: (concreteCuriosity || cultureTechOpportunity) && positive >= policy.curiosityMinScore,
    relevanceEligible: ((concreteCuriosity || cultureTechOpportunity) && positive >= policy.curiosityMinScore) || (consumerChange && positive >= policy.consumerMinScore),
    suggestedAngle: aiChartMomentum ? "なぜ注目されているか、何ができるか、既存AIとの違い、料金・利用条件を公式情報で確認する。順位の国・総合/カテゴリ・確認日を明示する" : aiBenchmark ? "指標の測定対象・条件・前回からの変化・実用上の意味を比較する。単一スコアで万能な優劣を断定しない" : cultureTechOpportunity ? "作品で描かれる技術は現実にどこまで実現できるか。作品中の描写と現実の技術を一次情報で照合する" : null,
    reason: [
      aiBenchmark && "AIの最新性能指標・ベンチマークを優先",
      aiModelLaunch && "AIの重要モデル・サービス発表を優先",
      aiChartMomentum && "Apple公式ランキングでAIアプリの人気を確認",
      peripheralEvent && "局地的な教室・催事はAI主軸より優先度を下げる",
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
