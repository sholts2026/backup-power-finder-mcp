import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const configPath = join(process.cwd(), "config", "affiliate.json");

export function loadAffiliateConfig() {
  if (process.env.AFFILIATE_CONFIG_JSON) {
    return JSON.parse(process.env.AFFILIATE_CONFIG_JSON);
  }

  if (!existsSync(configPath)) return {};
  return JSON.parse(readFileSync(configPath, "utf8"));
}

export function applyAffiliateTemplate(product, appId, clickId) {
  const merchantConfig = loadAffiliateConfig()[product.merchant];
  if (!merchantConfig?.enabled || !merchantConfig.affiliateUrlTemplate) return null;

  const destinationUrl = product.url ?? "";

  return merchantConfig.affiliateUrlTemplate
    .replaceAll("{appId}", encodeURIComponent(appId))
    .replaceAll("{sku}", encodeURIComponent(product.sku))
    .replaceAll("{merchant}", encodeURIComponent(product.merchant))
    .replaceAll("{clickId}", encodeURIComponent(clickId))
    .replaceAll("{partnerId}", encodeURIComponent(merchantConfig.partnerId ?? ""))
    .replaceAll("{destinationUrl}", destinationUrl)
    .replaceAll("{encodedDestinationUrl}", encodeURIComponent(destinationUrl));
}
