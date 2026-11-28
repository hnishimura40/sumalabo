
export const hosts = {
  ahamo: ["ahamo.com", "faq.ahamo.com"],
  rakuten: ["network.mobile.rakuten.co.jp"],
  uq: ["shop.uqmobile.jp", "www.uqwimax.jp"],
  ymobile: ["www.ymobile.jp", "order.ymobile.jp"],
  iijmio: ["www.iijmio.jp"],
};
const specHosts = ["www.apple.com", "jp.nothing.tech", "www.oppo.com"];
const forbidden = /最安|絶対お得|MNP\s*弾|せどり|転売|短期解約/i;
const isPrice = value => Number.isSafeInteger(value) && value > 0;
const date = value => typeof value === "string" && /(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value));
const photoLicenses = {
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
  "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0/",
  "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
};

export function officialUrl(value, allowed) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.port && allowed.includes(url.hostname);
  } catch {
    return false;
  }
}

function words(...strings) {
  return strings.every(s => typeof s === "string" && s.trim() && !forbidden.test(s));
}

export function isDeviceOfferEnded({ status, endsAt }, now) {
  return status === "ended" || Boolean(endsAt && Date.parse(endsAt) <= now);
}

export function validateCatalog(catalog) {
  if (catalog?.schemaVersion !== 1 || !Array.isArray(catalog.rows) || !catalog.rows.length)
    throw Error("価格データがありません");
  const ids = new Set();
  for (const row of catalog.rows) {
    const allowed = hosts[row.carrier];
    if (!allowed || !/^[a-z0-9-]+$/.test(row.id) || ids.has(row.id)) throw Error("機種ID・会社が不正です");
    ids.add(row.id);
    const { normalYen, mnpYen, real } = row;
    if (!isPrice(normalYen) || !isPrice(mnpYen) || mnpYen > normalYen
        || (real !== null && (!isPrice(real?.yen) || !Number.isInteger(real.installments)
          || real.installments < 2 || !words(real.return, real.plan) || !/回収|返却/.test(real.return) || (real.url && !officialUrl(real.url, allowed)))))
      throw Error("価格・返却条件が不正です: " + row.id);
    if (!words(row.model, row.storage, row.plan, row.option, row.eligibility, row.period,
          row.specs?.display, row.specs?.weight, row.specs?.feature)
        || !["verified", "checking", "ended"].includes(row.status)
        || !date(row.checkedAt) || (row.endsAt !== null && !date(row.endsAt))
        || !officialUrl(row.officialUrl, allowed) || !officialUrl(row.termsUrl, allowed)
        || !officialUrl(row.specUrl, [...allowed, ...specHosts]))
      throw Error("条件・確認日時・出典が不正です: " + row.id);
    if ((row.specs.battery != null && !words(row.specs.battery))
        || (row.returnNote != null && !words(row.returnNote)))
      throw Error("補足の仕様または返却価格の注記が不正です: " + row.id);
    const { photo } = row;
    if (photo && (!/^\/images\/articles\/mnp-smartphone-price-comparison\/[a-z0-9-]+\.webp$/.test(photo.src)
        || !officialUrl(photo.source, ["commons.wikimedia.org"])
        || !words(photo.alt, photo.credit)
        || (photo.edits != null && !words(photo.edits))
        || photo.license !== photoLicenses[photo.licenseLabel ?? "CC BY-SA 4.0"]))
      throw Error("写真の出典またはライセンスが不正です: " + row.id);
  }
  return catalog;
}

function largeChange(previous, current) {
  if (previous == null || current == null) return previous !== current;
  const delta = Math.abs(current - previous);
  return delta >= 10_000 || (delta >= 1_000 && delta / previous >= 0.2);
}

export function reconcilePrices(previous, input, { now = new Date().toISOString(), confirmedLarge = [] } = {}) {
  validateCatalog(previous);
  if (!date(now) || !Array.isArray(input?.observations) || !Array.isArray(confirmedLarge)) throw Error("確認結果の形式が不正です");
  const currentIds = new Set(previous.rows.map(row => row.id));
  const observations = new Map(input.observations.map(observation => [observation.id, observation]));
  if (observations.size !== input.observations.length || [...observations.keys()].some(id => !currentIds.has(id)))
    throw Error("未知または重複の機種があります");
  const issues = [];
  const changes = [];
  const rows = previous.rows.map(old => {
    const observation = observations.get(old.id);
    const hold = reason => {
      issues.push({ id: old.id, reason });
      return { ...old, status: old.status === "ended" ? "ended" : "checking" };
    };
    if (!observation || observation.outcome === "unavailable") return hold("公式価格または条件を取得できません");
    if (!["verified", "ended"].includes(observation.outcome)) return hold("確認結果が不明です");
    const { checkedAt, evidenceUrl, evidenceNote, values } = observation;
    if (!date(checkedAt) || Date.parse(checkedAt) > Date.parse(now)
        || Date.parse(now) - Date.parse(checkedAt) > 24 * 60 * 60 * 1000
        || Date.parse(checkedAt) < Date.parse(old.checkedAt)
        || !officialUrl(evidenceUrl, hosts[old.carrier]) || !words(evidenceNote))
      return hold("公式照合の証拠または確認日時が不足しています");
    if (observation.outcome === "ended") {
      if (old.status !== "ended") changes.push({ id: old.id, kind: "ended" });
      return { ...old, status: "ended", checkedAt };
    }
    if (!values || !Object.hasOwn(values, "real")) return hold("一括・実質価格の照合が不足しています");
    const candidate = {
      ...old, status: "verified", checkedAt,
      ...Object.fromEntries(
        ["normalYen", "mnpYen", "real", "plan", "option", "eligibility", "period", "endsAt", "officialUrl", "termsUrl"]
          .map(key => [key, values[key]])
      ),
    };
    try {
      validateCatalog({ schemaVersion: 1, rows: [candidate] });
      if (candidate.endsAt && Date.parse(candidate.endsAt) <= Date.parse(now)) throw Error();
    } catch {
      return hold("価格・期間・条件の検証に失敗しました");
    }
    const moved = ["normalYen", "mnpYen"].some(key => largeChange(old[key], candidate[key]))
      || largeChange(old.real?.yen, candidate.real?.yen);
    if (moved) {
      const proof = confirmedLarge.find(item => item.id === old.id && item.status === "confirmed"
        && item.prices?.normalYen === candidate.normalYen && item.prices?.mnpYen === candidate.mnpYen
        && item.prices?.realYen === (candidate.real?.yen ?? null) && words(item.note)
        && officialUrl(item.url, hosts[old.carrier]) && date(item.checkedAt)
        && Date.parse(item.checkedAt) >= Date.parse(checkedAt) && Date.parse(item.checkedAt) <= Date.parse(now));
      if (old.status !== "checking" || !proof) return hold("価格が大きく変動しました。前回値を保持し、再照合が必要です");
    }
    const { checkedAt: _oldDate, ...oldValues } = old;
    const { checkedAt: _newDate, ...newValues } = candidate;
    if (JSON.stringify(oldValues) !== JSON.stringify(newValues)) changes.push({ id: old.id, kind: "updated" });
    return candidate;
  });
  return { catalog: validateCatalog({ schemaVersion: 1, rows }), changes, issues };
}
