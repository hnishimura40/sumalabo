import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { appendObservations, currentOffers, priceBreakdown, priceRating, validateObservations } from "../../src/lib/phone-return-watch.mjs";

const data = JSON.parse(await readFile(new URL("../../data/phone-return-watch.json", import.meta.url)));
const now = Date.parse("2026-11-28T13:00:00+09:00");
const rows = currentOffers(data, "iPhone 18 Pro", 256, now);
const entry = id => rows.find(row => row.offerId === id);

test("割引は分割支払額に一度だけ反映し、買い替え免除と手数料は分ける", () => {
  assert.deepEqual(rows.filter(row => row.total).map(row => [row.offerId, row.total.sameYen, row.total.switchYen]), [
    ["au-online", 26750, 48750],
    ["softbank-online", 30274, 52274],
    ["ahamo-online", 44814, 66814],
    ["rakuten-online", 131244, 131244],
  ]);
  assert.equal(entry("rakuten-online").prices.points, 5000);
});

test("公式確認できないセルに価格を入れず、確認履歴を上書きしない", () => {
  assert.equal(entry("docomo-online").total, null);
  assert.throws(() => appendObservations(data, [{ ...data.observations[0] }]));
  const revised = { ...data.observations[2], prices: { ...data.observations[2].prices, sameCarrierWaiverYen: 22001 } };
  assert.throws(() => validateObservations({ schemaVersion: 1, observations: [revised] }));
});

test("期限や鮮度を判定し、複雑な条件は買い時評価を抑える", () => {
  assert.equal(priceRating(1000), "超特価");
  assert.equal(priceRating(1001), "非常にお得");
  assert.equal(priceRating(20001), "慎重に判断");
  assert.equal(priceRating(40001), "安さ重視なら様子見");
  assert.equal(priceRating(500, "plan"), "条件も含めて慎重に判断");
  const expired = { ...data.observations[2], deadline: "2026-11-29T12:00:00+09:00" };
  assert.equal(currentOffers({ schemaVersion: 1, observations: [expired] }, expired.device, 256, now)[0].expired, false);
  const later = currentOffers({ schemaVersion: 1, observations: [expired] }, expired.device, 256, now + 3 * 86400000)[0];
  assert.equal(later.expired, true);
  assert.equal(later.stale, true);
  assert.equal(priceBreakdown(entry("docomo-online")), null);
});
