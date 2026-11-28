const amounts = [
  "listYen", "mnpDiscountYen", "retainedInstallmentsYen", "returnFeeYen",
  "adminYen", "optionsYen", "insuranceYen", "cashbackYen", "points",
  "sameCarrierWaiverYen", "advertisedYen",
];
const isYen = value => Number.isSafeInteger(value) && value >= 0;
const isHttps = value => {
  try { return new URL(value).protocol === "https:"; } catch { return false; }
};
const key = row => [row.device, row.capacityGb, row.offerId].join("/");

export function priceBreakdown(row) {
  if (row.status !== "verified") return null;
  const { listYen, mnpDiscountYen, retainedInstallmentsYen, returnFeeYen, adminYen, optionsYen,
    insuranceYen, cashbackYen, sameCarrierWaiverYen, advertisedYen } = row.prices;
  // The installment figure already includes the applicable MNP discount.
  const switchYen = retainedInstallmentsYen + returnFeeYen + adminYen + optionsYen + insuranceYen - cashbackYen;
  return { listYen, mnpDiscountYen, advertisedYen, sameYen: switchYen - sameCarrierWaiverYen, switchYen };
}

export function validateObservations(catalog) {
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.observations)) throw Error("Invalid price watch catalog");
  const dates = new Map();
  for (const row of catalog.observations) {
    const timestamp = Date.parse(row.observedAt);
    if (!Number.isFinite(timestamp) || !/(Z|[+-]\d{2}:\d{2})$/.test(row.observedAt)
      || !row.device || !row.carrier || !row.seller || !row.offerId || !Number.isInteger(row.capacityGb) || row.capacityGb <= 0
      || !["online", "store"].includes(row.channel) || !["verified", "unconfirmed", "ended"].includes(row.status)
      || !["available", "sold-out", "unconfirmed"].includes(row.stock)
      || !Array.isArray(row.sources) || !row.sources.length || row.sources.some(source => !isHttps(source.url))
      || (row.deadline && !Number.isFinite(Date.parse(row.deadline)))
      || (dates.has(key(row)) && dates.get(key(row)) >= timestamp))
      throw Error("Invalid source, status, or observation date: " + row.offerId);
    dates.set(key(row), timestamp);
    if (row.status !== "verified") {
      if (row.prices != null || !row.note) throw Error("Unconfirmed observations require a note instead of prices");
      continue;
    }
    const price = row.prices;
    if (!price || !amounts.every(field => isYen(price[field]))
      || price.mnpDiscountYen > price.listYen || price.retainedInstallmentsYen > price.listYen - price.mnpDiscountYen
      || price.sameCarrierWaiverYen > price.returnFeeYen || !row.plan || !row.returnTiming
      || (price.sameCarrierWaiverYen > 0 && !row.sameCarrierCondition)
      || priceBreakdown(row).sameYen < 0)
      throw Error("Invalid price or purchase condition: " + row.offerId);
  }
  return catalog;
}

export function currentOffers(catalog, device, capacityGb, now = Date.now()) {
  const latest = new Map();
  for (const row of validateObservations(catalog).observations) {
    if (row.device === device && row.capacityGb === capacityGb && Date.parse(row.observedAt) <= now) latest.set(row.offerId, row);
  }
  return [...latest.values()].map(row => ({
    ...row, total: priceBreakdown(row),
    expired: Boolean(row.deadline && Date.parse(row.deadline) <= now),
    stale: now - Date.parse(row.observedAt) >= 48 * 60 * 60 * 1000,
  }));
}

export function priceRating(yen, conditions = "standard") {
  const labels = ["超特価", "非常にお得", "お得", "検討候補", "慎重に判断", "安さ重視なら様子見"];
  const index = [1000, 5000, 10000, 20000, 40000, Infinity].findIndex(max => yen <= max);
  if (conditions !== "standard" && index < 4) return "条件も含めて慎重に判断";
  return labels[index];
}

export function appendObservations(catalog, observations) {
  return validateObservations({ ...catalog, observations: [...catalog.observations, ...observations] });
}
