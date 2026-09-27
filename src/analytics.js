import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const eventLog = join(process.cwd(), "analytics.jsonl");
const retentionMs = 90 * 24 * 60 * 60 * 1000;

function readEvents() {
  if (!existsSync(eventLog)) return [];
  return readFileSync(eventLog, "utf8").split("\n").filter(Boolean).flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });
}

function prune() {
  const cutoff = Date.now() - retentionMs;
  const events = readEvents().filter((event) => Date.parse(event.ts) >= cutoff);
  writeFileSync(eventLog, events.length ? `${events.map(JSON.stringify).join("\n")}\n` : "");
}

export function trackEvent(type, fields = {}) {
  prune();
  const event = { ts: new Date().toISOString(), type, ...fields };
  appendFileSync(eventLog, `${JSON.stringify(event)}\n`);
  return event;
}

function emptyMetric() {
  return { invocations: 0, recommendations: 0, clicks: 0, conversions: 0, approvedCommission: 0, pendingCommission: 0 };
}

export function getMetrics({ days = 30 } = {}) {
  const periodDays = Math.min(Math.max(Number(days) || 30, 1), 90);
  const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
  const events = readEvents().filter((event) => Date.parse(event.ts) >= cutoff);
  const byApp = {};
  const byMerchant = {};
  const daily = {};
  const totals = emptyMetric();
  const bucket = (record, key) => (record[key] ??= emptyMetric());

  for (const event of events) {
    const targets = [
      bucket(byApp, event.appId ?? "unknown"),
      bucket(byMerchant, event.merchant ?? "unknown"),
      bucket(daily, event.ts.slice(0, 10)),
      totals
    ];
    if (event.type === "mcp_invocation") targets.forEach((x) => x.invocations++);
    if (event.type === "recommendations_shown") targets.forEach((x) => x.recommendations += Number(event.count ?? 0));
    if (event.type === "affiliate_click") targets.forEach((x) => x.clicks++);
    if (event.type === "conversion") {
      targets.forEach((x) => x.conversions++);
      const amount = Number(event.commission ?? 0);
      const field = event.status === "approved" ? "approvedCommission" : "pendingCommission";
      targets.forEach((x) => x[field] += Number.isFinite(amount) ? amount : 0);
    }
  }

  return { generatedAt: new Date().toISOString(), periodDays, totals, byApp, byMerchant, daily };
}

export function recordAffiliateClickFromLog(record) {
  return trackEvent("affiliate_click", {
    appId: record.appId,
    merchant: record.merchant,
    sku: record.sku,
    rank: record.rank
  });
}
