import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (file) => readFileSync(path.join(ROOT, file), "utf8");

test("Rakuten Mobile A8 reservation uses the Sumalabo 003 text link", () => {
  const links = read("src/data/mobileCarrierLinks.ts");
  const placements = read("src/data/articleAffiliatePlacements.ts");
  const articlePage = read("src/pages/articles/[slug].astro");
  assert.match(links, /rakuten:[\s\S]*affiliateHref: "https:\/\/px\.a8\.net\/svt\/ejp\?a8mat=4B8B4X\+1GZN5U\+5W58\+5YRHE"/);
  assert.match(links, /s00000027494001 \/ 素材002 \/ すまラボ 003/);
  assert.match(links, /rakuten:[\s\S]*network: "A8"/);
  assert.match(placements, /"mobile-plan-cost-comparison"[\s\S]*carrier: "rakuten"/);
  assert.match(articlePage, /<ArticleAffiliatePlacements slug=\{article\.data\.slug\} \/>/);
});

test("Rakuten Mobile program terms record eligibility, denials, and prohibited claims", () => {
  const registry = JSON.parse(read("data/affiliate-program-terms.json"));
  const program = registry.programs.rakutenMobileA8;
  assert.equal(registry.checkedAt, "2026-08-17");
  assert.equal(program.programId, "s00000027494001");
  assert.equal(program.publisherSiteId, "003");
  assert.equal(program.linkMaterialId, "002");
  assert.equal(program.reward, "新規利用7000円");
  assert.ok(program.achievementConditions.some((item) => item.includes("90日以内")));
  assert.ok(program.achievementConditions.some((item) => item.includes("2カ月以上")));
  assert.ok(program.denialConditions.some((item) => item.includes("インセンティブ")));
  assert.ok(program.prohibitedClaims.some((item) => item.includes("MNP弾")));
  assert.ok(program.prohibitedClaims.some((item) => item.includes("転売")));
});

test("mobile plan comparison keeps disclosure, fact date, and recommendation order consistent", () => {
  const article = read("content/articles/mobile-plan-cost-comparison.mdx");
  const layout = read("src/layouts/ArticleLayout.astro");
  assert.match(article, /hasAffiliate: true/);
  assert.match(layout, /article\.hasAffiliate[\s\S]*本記事は広告（アフィリエイトリンク）を含みます。/);
  assert.match(article, /2026年8月4日時点/);

  const large = article.indexOf("### 大容量・無制限を使いたい：楽天モバイル、povo、ahamo");
  const rakuten = article.indexOf("- **楽天モバイル**", large);
  const povo = article.indexOf("- **povo**", large);
  const ahamo = article.indexOf("- **ahamo**", large);
  assert.ok(large >= 0 && rakuten > large && povo > rakuten && ahamo > povo);

  const uqCta = article.indexOf('<MobileCarrierCTA carrier="uq"');
  const ahamoCta = article.indexOf('<MobileCarrierCTA carrier="ahamo"');
  assert.ok(uqCta >= 0 && ahamoCta > uqCta);
});
