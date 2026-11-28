#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { appendObservations, validateObservations, priceBreakdown } from "../../src/lib/phone-return-watch.mjs";

const catalogUrl = new URL("../../data/phone-return-watch.json", import.meta.url);
const catalog = validateObservations(JSON.parse(await readFile(catalogUrl, "utf8")));
const [command, input, flag] = process.argv.slice(2);
const naturalKey = row => [row.device, row.capacityGb, row.offerId].join("/");
const latest = new Map(catalog.observations.map(row => [naturalKey(row), row]));

if (command === "check" && input) {
  const urls = [...new Set([...latest.values()].flatMap(row => row.sources.map(source => source.url)))];
  const results = [];
  for (let start = 0; start < urls.length; start += 4) {
    const batch = urls.slice(start, start + 4);
    results.push(...await Promise.all(batch.map(async url => {
      try {
        const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
        if (!response.ok) return { url, status: response.status, outcome: "unconfirmed" };
        const bytes = Buffer.from(await response.arrayBuffer());
        return { url, status: response.status, sha256: createHash("sha256").update(bytes).digest("hex"), outcome: "fetched" };
      } catch {
        return { url, status: null, outcome: "unconfirmed" };
      }
    })));
  }
  await mkdir(path.dirname(input), { recursive: true });
  await writeFile(input, JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ sources: results.length, unavailable: results.filter(row => row.outcome === "unconfirmed").length }));
  if (results.some(row => row.outcome === "unconfirmed")) process.exitCode = 2;
} else if (command === "append" && input && [undefined, "--apply"].includes(flag)) {
  const { observations } = JSON.parse(await readFile(input, "utf8"));
  if (!Array.isArray(observations) || !observations.length) throw Error("No reviewed observations");
  const now = Date.now();
  const next = appendObservations(catalog, observations);
  for (const row of observations) {
    if (Date.parse(row.observedAt) > now) throw Error("Future observation: " + row.offerId);
    const prev = latest.get(naturalKey(row));
    const before = prev && priceBreakdown(prev);
    const after = priceBreakdown(row);
    if (before && after && Math.abs(after.switchYen - before.switchYen) >= 10_000
      && (!row.recheckReason || !row.recheckUrl || row.recheckUrl === row.sources[0].url
        || !row.sources.some(source => source.url === row.recheckUrl)))
      throw Error("Large price movement requires a separate official source: " + row.offerId);
    console.log(JSON.stringify({ id: row.offerId, status: row.status, before: before?.switchYen, after: after?.switchYen }));
    latest.set(naturalKey(row), row);
  }
  if (flag === "--apply") {
    const tempUrl = new URL("phone-return-watch.json.next", catalogUrl);
    await writeFile(tempUrl, JSON.stringify(next, null, 2) + "\n", { encoding: "utf8", flag: "wx" });
    await rename(tempUrl, catalogUrl);
  }
} else {
  console.error("Usage: phone-return-watch.mjs check <private-report.json> | append <reviewed.json> [--apply]");
  process.exitCode = 1;
}
