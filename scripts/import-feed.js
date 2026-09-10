#!/usr/bin/env node
import { execPath } from "node:process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));

function usage() {
  console.error(`Usage: ${execPath} scripts/import-feed.js --input feed.csv|feed.json --merchant ecoflow --category backup_power --out data/products.imported.json [--mapping config/feed-mapping.example.json] [--merge]`);
  process.exit(1);
}

function parseArgs() {
  const values = {};
  for (let index = 2; index < process.argv.length; index += 1) {
    const key = process.argv[index];
    if (key === "--merge") {
      values.merge = true;
      continue;
    }
    if (!key.startsWith("--")) usage();
    values[key.slice(2)] = process.argv[index + 1];
    index += 1;
  }
  if (!values.input || !values.merchant) usage();
  return values;
}

function parseCsv(text) {
  const rows = [];
  let cell = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  const headers = rows.shift()?.map((header) => header.trim()) ?? [];
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function parseInput(path) {
  const text = readFileSync(path, "utf8");
  if (path.toLowerCase().endsWith(".json")) {
    const payload = JSON.parse(text);
    return Array.isArray(payload) ? payload : payload.products ?? payload.items ?? [];
  }
  return parseCsv(text);
}

function firstValue(row, names = []) {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && String(value).trim() !== "") return value;
  }
  return undefined;
}

function listValue(value, fallback = []) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).split(/[|;,]/).map((item) => item.trim().toLowerCase().replaceAll(" ", "_")).filter(Boolean);
}

function boolValue(value) {
  if (typeof value === "boolean") return value;
  return ["1", "yes", "true", "y", "autoship", "subscription"].includes(String(value ?? "").trim().toLowerCase());
}

function numberValue(value, fallback = 0) {
  const number = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(number) ? number : fallback;
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalize(row, merchant, category, mapping) {
  const fields = mapping.fields;
  const defaults = structuredClone(mapping.defaults ?? {});
  const attributes = { ...(defaults.attributes ?? {}) };

  attributes.capacityWh = numberValue(firstValue(row, fields.capacityWh), attributes.capacityWh);
  attributes.continuousWatts = numberValue(firstValue(row, fields.continuousWatts), attributes.continuousWatts);
  attributes.surgeWatts = numberValue(firstValue(row, fields.surgeWatts), attributes.surgeWatts);
  attributes.solarInputWatts = numberValue(firstValue(row, fields.solarInputWatts), attributes.solarInputWatts);
  attributes.batteryChemistry = String(firstValue(row, fields.batteryChemistry) ?? attributes.batteryChemistry);
  attributes.weightLb = numberValue(firstValue(row, fields.weightLb), attributes.weightLb);
  attributes.expandable = boolValue(firstValue(row, fields.expandable));
  attributes.indoorSafeBattery = boolValue(firstValue(row, fields.indoorSafeBattery));
  attributes.useCases = listValue(firstValue(row, fields.useCases), attributes.useCases);
  attributes.ports = listValue(firstValue(row, fields.ports), attributes.ports);

  const rawSku = firstValue(row, fields.sku) ?? `${merchant}-${firstValue(row, fields.name) ?? "product"}`;
  const price = numberValue(firstValue(row, fields.price), defaults.price ?? 0);

  return {
    sku: slug(rawSku),
    merchant: slug(firstValue(row, fields.merchant) ?? merchant),
    category,
    name: String(firstValue(row, fields.name) ?? rawSku),
    price,
    priceUnit: defaults.priceUnit ?? "monthly_estimate",
    aov: price || defaults.aov || 0,
    commissionWeight: defaults.commissionWeight ?? 0.5,
    url: String(firstValue(row, fields.url) ?? ""),
    image: String(firstValue(row, fields.image) ?? ""),
    attributes
  };
}

const options = parseArgs();
const mappingPath = resolve(options.mapping ?? "config/feed-mapping.example.json");
const mapping = JSON.parse(readFileSync(mappingPath, "utf8"));
const inputRows = parseInput(resolve(options.input));
const normalized = inputRows.map((row) => normalize(row, options.merchant, options.category ?? mapping.defaults?.category ?? "backup_power", mapping));
const outputPath = resolve(options.out ?? "data/products.imported.json");

let output = normalized;
if (options.merge) {
  const currentPath = resolve(rootDir, "data", "products.json");
  const current = existsSync(currentPath) ? JSON.parse(readFileSync(currentPath, "utf8")) : [];
  const byKey = new Map(current.map((product) => [`${product.merchant}:${product.sku}`, product]));
  for (const product of normalized) byKey.set(`${product.merchant}:${product.sku}`, product);
  output = [...byKey.values()];
}

writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Imported ${normalized.length} products to ${outputPath}`);
