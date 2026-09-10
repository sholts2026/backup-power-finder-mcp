import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyAffiliateTemplate } from "./affiliateConfig.js";

const clickLog = join(process.cwd(), "clicks.jsonl");
const CLICK_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function pruneExpiredClicks(now = Date.now()) {
  if (!existsSync(clickLog)) return;

  const retained = readFileSync(clickLog, "utf8")
    .split("\n")
    .filter(Boolean)
    .filter((line) => {
      try {
        return now - Date.parse(JSON.parse(line).ts) <= CLICK_RETENTION_MS;
      } catch {
        return false;
      }
    });

  writeFileSync(clickLog, retained.length ? `${retained.join("\n")}\n` : "");
}

export function createClickId({ appId, merchant, sku }) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${appId}_${merchant}_${sku}_${Date.now()}_${random}`.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function buildAffiliateUrl(product, appId, clickId = createClickId({ appId, merchant: product.merchant, sku: product.sku })) {
  const configuredUrl = applyAffiliateTemplate(product, appId, clickId);
  if (configuredUrl) return configuredUrl;

  const url = new URL(product.url);
  url.searchParams.set("utm_source", "chatgpt");
  url.searchParams.set("utm_medium", "app");
  url.searchParams.set("utm_campaign", appId);
  url.searchParams.set("utm_content", product.sku);
  url.searchParams.set("click_id", clickId);
  return url.toString();
}

export function buildRedirectPath(product, appId, { rank = null, intentTags = [] } = {}) {
  const clickId = createClickId({ appId, merchant: product.merchant, sku: product.sku });
  const params = new URLSearchParams({ app: appId, qid: clickId });
  if (rank !== null) params.set("rank", String(rank));
  if (intentTags.length) params.set("tags", intentTags.join(","));
  return `/r/${encodeURIComponent(product.merchant)}/${encodeURIComponent(product.sku)}?${params.toString()}`;
}

export function trackClick({ appId, merchant, sku, destination, queryId = null, rank = null, intentTags = [] }) {
  pruneExpiredClicks();
  const record = {
    ts: new Date().toISOString(),
    appId,
    merchant,
    sku,
    destination,
    queryId,
    rank,
    intentTags
  };
  appendFileSync(clickLog, `${JSON.stringify(record)}\n`);
  return record;
}
