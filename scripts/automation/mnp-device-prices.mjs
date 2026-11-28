
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hosts, officialUrl, reconcilePrices, validateCatalog } from "../../src/lib/mnp-device-prices.mjs";

const path = fileURLToPath(new URL("../../data/mnp-device-prices.json", import.meta.url));
const read = async name => JSON.parse((await readFile(name, "utf8")).replace(/^\uFEFF/, ""));
const write = (name, value) => writeFile(name, JSON.stringify(value,null,2) + "\n", { flag: "wx" });
const published = validateCatalog(await read(path));
const [command, source, destination] = process.argv.slice(2);

if (command === "validate") {
  console.log(JSON.stringify({ ok: true, rows: published.rows.length }));
} else if (command === "check" && source && !destination) {
  const targets = new Map(published.rows.flatMap(row => [row.officialUrl, row.termsUrl].map(url => [url, row.carrier])));
  const pages = [];
  const check = async (address, carrier) => {
    let url = address;
    try {
      for (let i = 0; i < 5; i++) {
        const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(12_000) });
        if ([301,302,303,307,308].includes(response.status)) {
          url = new URL(response.headers.get("location"), url).href;
          if (!officialUrl(url, hosts[carrier])) throw Error("非公式の転送先");
          continue;
        }
        if (!response.ok) throw Error("HTTP " + response.status);
        const html = await response.text();
        if (!html.trim() || /<title>[^<]*(Access Denied|Just a moment|メンテナンス中)/i.test(html)) throw Error("公式価格を表示できません");
        return { address, url, transport: "ok", sha256: createHash("sha256").update(html).digest("hex") };
      }
      throw Error("転送回数超過");
    } catch (error) {
      return { address, url, transport: "unavailable", error: error.cause?.code || error.message };
    }
  };
  for (const [url, carrier] of targets) pages.push(await check(url, carrier));
  const report = { checkedAt: new Date().toISOString(), pages, rows: published.rows.map(({id,officialUrl,termsUrl}) => ({id,officialUrl,termsUrl})), requiresOfficialConditionsReview: true };
  await write(resolve(source), report);
  const failures = pages.filter(page => page.transport !== "ok").length;
  console.log(JSON.stringify({ sources: pages.length, failures, verifyRenderedPrices: true }));
  if (failures) process.exitCode = 2;
} else if (command === "reconcile" && source && destination) {
  const reviewed = await read(source);
  const compared = reconcilePrices(published, reviewed, { confirmedLarge: reviewed.confirmedLarge });
  await write(resolve(destination), compared);
  console.log(JSON.stringify({ rows: compared.catalog.rows.length, changes: compared.changes, issues: compared.issues }));
} else {
  throw Error("Usage: validate | check <private-report.json> | reconcile <reviewed-observations.json> <private-result.json>");
}
