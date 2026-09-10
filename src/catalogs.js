import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

export function loadProducts() {
  return JSON.parse(readFileSync(join(rootDir, "data", "products.json"), "utf8"));
}

export function loadMerchants() {
  return JSON.parse(readFileSync(join(rootDir, "data", "merchants.json"), "utf8"));
}

export function getProductsByCategory(category) {
  return loadProducts().filter((product) => product.category === category);
}
