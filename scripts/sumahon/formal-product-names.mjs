import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FORMAL_PRODUCT_NAMES_PATH = path.join(ROOT, "data", "qa", "formal-product-names.json");

export function loadFormalProductNames(file = FORMAL_PRODUCT_NAMES_PATH) {
  const json = JSON.parse(readFileSync(file, "utf-8"));
  if (!Array.isArray(json.products)) throw new Error("formal-product-names.json: products must be an array");
  return json.products;
}

export function findProductNameVariants(text, products = loadFormalProductNames()) {
  const lines = String(text).split(/\r?\n/);
  const findings = [];
  for (const product of products) {
    for (const variant of product.variants || []) {
      lines.forEach((line, index) => {
        if (line.includes(variant)) {
          findings.push({
            canonical: product.canonical,
            variant,
            line: index + 1,
            excerpt: line.trim().slice(0, 100),
          });
        }
      });
    }
  }
  return findings;
}

export function formalProductNamesChecklist(products = loadFormalProductNames()) {
  return products.map((product) => product.canonical).join(" / ");
}
