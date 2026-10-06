import { getProductsByCategory, loadMerchants, loadProducts } from "./catalogs.js";
import { buildAffiliateUrl, buildRedirectPath } from "./affiliate.js";
import { hasAffiliateTemplate } from "./affiliateConfig.js";
import { parseBackupPowerIntent, parseMattressIntent, parsePetFoodIntent } from "./intent.js";
import { buildPresentation } from "./presentation.js";
import { scoreBackupPower, scoreMattress, scorePetFood } from "./scoring.js";

export const appProfiles = {
  "pet-food-finder": {
    appId: "pet-food-finder",
    displayName: "Dog Food Finder",
    targetKeyword: "dog food finder",
    category: "pet_food",
    parser: parsePetFoodIntent,
    scorer: scorePetFood
  },
  "mattress-finder": {
    appId: "mattress-finder",
    displayName: "Mattress Finder",
    targetKeyword: "mattress finder",
    category: "mattress",
    parser: parseMattressIntent,
    scorer: scoreMattress
  },
  "backup-power-finder": {
    appId: "backup-power-finder",
    displayName: "Backup Power Finder",
    targetKeyword: "best portable power station for home backup",
    category: "backup_power",
    parser: parseBackupPowerIntent,
    scorer: scoreBackupPower
  }
};

function publicProduct(product, appId, scoreResult, merchant, rank, tags) {
  return {
    sku: product.sku,
    name: product.name,
    merchant: merchant?.name ?? product.merchant,
    price: product.price,
    priceUnit: product.priceUnit,
    score: scoreResult.score,
    reasons: scoreResult.reasons,
    confidence: scoreResult.score >= 80 ? "high" : scoreResult.score >= 60 ? "medium" : "low",
    runtime: scoreResult.runtime,
    buyUrl: buildAffiliateUrl(product, appId),
    redirectPath: buildRedirectPath(product, appId, { rank, intentTags: tags }),
    affiliateDisclosure: "We may earn a commission if you buy through this link. Rankings are based on user fit first."
  };
}

export function recommend(appId, payload = {}) {
  const profile = appProfiles[appId];
  if (!profile) {
    const valid = Object.keys(appProfiles).join(", ");
    throw new Error(`Unknown appId "${appId}". Valid apps: ${valid}`);
  }

  const intent = profile.parser(payload.query ?? "", payload);
  const merchants = loadMerchants();
  const tags = intentTags(intent);
  const requireAffiliateProducts = process.env.REQUIRE_AFFILIATE_PRODUCTS !== "false" && Boolean(process.env.PUBLISHED_APP);
  const canRecommend = intent.readyToRecommend !== false;
  const recommendations = canRecommend ? getProductsByCategory(profile.category)
    .filter((product) => !intent.budget || product.price <= intent.budget)
    .filter((product) => !requireAffiliateProducts || hasAffiliateTemplate(product))
    .map((product) => {
      const scoreResult = profile.scorer(product, intent);
      return { product, scoreResult };
    })
    .filter(({ scoreResult }) => !scoreResult.excluded && scoreResult.score >= 35)
    .sort((a, b) => (b.scoreResult.score - a.scoreResult.score) || ((b.scoreResult.commercialTieBreaker ?? 0) - (a.scoreResult.commercialTieBreaker ?? 0)))
    .slice(0, payload.limit ?? 3)
    .map(({ product, scoreResult }, index) => publicProduct(product, appId, scoreResult, merchants[product.merchant], index + 1, tags)) : [];

  const result = {
    appId,
    displayName: profile.displayName,
    intent,
    recommendations,
    nextQuestions: buildNextQuestions(appId, intent),
    recommendationMode: recommendations.length ? (intent.confidence === "high" ? "ranked" : "tentative") : "needs_more_info",
    unknowns: intent.missingInfo ?? [],
    productCount: loadProducts().filter((product) => product.category === profile.category).length
  };

  if (payload.includePresentation ?? true) {
    result.presentation = buildPresentation(appId, result);
  }

  return result;
}

function intentTags(intent) {
  if (intent.appId === "pet-food-finder") {
    return [
      intent.lifeStage,
      intent.breedSize,
      ...intent.avoidProteins.map((protein) => `avoid_${protein}`),
      ...intent.goals
    ].filter(Boolean);
  }

  if (intent.appId === "backup-power-finder") {
    return [
      intent.useCase,
      intent.wantsSolar ? "solar" : null,
      intent.portabilityPriority ? "portable" : null,
      intent.quietIndoorPriority ? "quiet_indoor" : null,
      ...intent.devices
    ].filter(Boolean);
  }

  return [
    intent.sleepPosition,
    intent.hotSleeper ? "hot_sleeper" : null,
    intent.couple ? "couple" : null,
    intent.backPainContext ? "back_pain_context" : null,
    intent.size
  ].filter(Boolean);
}

function buildNextQuestions(appId, intent) {
  if (appId === "pet-food-finder") {
    return [
      intent.avoidProteins.length ? null : "Any known protein allergies, especially chicken or beef?",
      "Is this for a full fresh-food switch or a topper/mixed plan?",
      "What is the dog's current weight and target weight?"
    ].filter(Boolean);
  }

  if (appId === "backup-power-finder") {
    const questions = [];
    if (!intent.devices.length && !intent.loadWatts) questions.push("Which devices do you need to run, or what is the total watt load?");
    if (!intent.desiredHours) questions.push("How many hours of backup runtime do you want?");
    if (!intent.budget) questions.push("What budget should I stay under?");
    if (!intent.country) questions.push("What country or market are you shopping in?");
    if (!intent.wantsSolar) questions.push("Do you want solar-panel charging or battery-only backup?");
    return questions.slice(0, 3);
  }

  return [
    intent.hotSleeper ? null : "Do you sleep hot?",
    "Do you prefer soft, medium, or firm?",
    "Is motion isolation important for a partner?"
  ].filter(Boolean);
}
