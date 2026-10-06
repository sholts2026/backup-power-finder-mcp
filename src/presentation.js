import { loadSubmission } from "./submissions.js";

function formatPrice(product) {
  const suffix = product.priceUnit === "monthly_estimate" ? "/mo est." : product.priceUnit === "queen_estimate" ? " queen est." : product.priceUnit === "typical_sale" ? " typical sale" : "";
  return `$${product.price}${suffix}`;
}

function dogFoodSummary(intent, recommendations) {
  const top = recommendations[0];
  if (!top) return "I could not find a strong fit from the current catalog.";

  const allergy = intent.avoidProteins.length ? ` while avoiding ${intent.avoidProteins.join(", ")}` : "";
  const goals = intent.goals.length ? ` for ${intent.goals.map((goal) => goal.replaceAll("_", " ")).join(", ")}` : "";
  return `${top.name} is the best current fit for a ${intent.lifeStage} ${intent.breedSize}-breed dog${allergy}${goals} under about $${intent.budget}/month.`;
}

function mattressSummary(intent, recommendations) {
  const top = recommendations[0];
  if (!top) return "I could not find a strong fit from the current catalog.";

  const heat = intent.hotSleeper ? " hot" : "";
  return `${top.name} is the best current fit for a${heat} ${intent.sleepPosition} sleeper shopping around $${intent.budget}.`;
}

function backupPowerSummary(intent, recommendations) {
  const top = recommendations[0];
  if (!top) return `I need a little more information before ranking backup power stations: ${(intent.missingInfo ?? []).join(", ") || "devices, runtime, budget, or market"}.`;

  const runtime = top.runtime?.estimatedHours ? ` with an estimated ${top.runtime.estimatedHours} hours at the modeled load` : "";
  const budget = intent.budget ? ` around $${intent.budget}` : "";
  const confidence = intent.confidence === "high" ? "best current fit" : "tentative current fit";
  return `${top.name} is the ${confidence} for ${intent.useCase.replaceAll("_", " ")}${budget}${runtime}. Runtime is modeled, not guaranteed.`;
}

export function buildPresentation(appId, result) {
  const submission = loadSubmission(appId);
  const summary = appId === "pet-food-finder"
    ? dogFoodSummary(result.intent, result.recommendations)
    : appId === "backup-power-finder"
      ? backupPowerSummary(result.intent, result.recommendations)
      : mattressSummary(result.intent, result.recommendations);

  return {
    appId,
    title: submission?.proposedName ?? result.displayName,
    summary,
    cards: result.recommendations.map((product, index) => ({
      rank: index + 1,
      title: product.name,
      merchant: product.merchant,
      price: formatPrice(product),
      fitScore: product.score,
      confidence: product.confidence,
      bullets: product.reasons,
      runtime: product.runtime,
      callToAction: {
        label: "View offer",
        href: product.redirectPath
      },
      disclosure: product.affiliateDisclosure
    })),
    comparisonTable: result.recommendations.map((product, index) => ({
      rank: index + 1,
      product: product.name,
      merchant: product.merchant,
      price: formatPrice(product),
      fitScore: product.score,
      confidence: product.confidence,
      estimatedRuntime: product.runtime?.estimatedHours ?? null,
      bestFor: product.reasons.slice(0, 2).join(", ")
    })),
    followUpQuestions: result.nextQuestions,
    unknowns: result.unknowns,
    beforeBuying: appId === "backup-power-finder" ? [
      "Confirm current price, availability, and included accessories.",
      "Verify continuous watts, surge watts, battery capacity, and solar input on the merchant page.",
      "Check that the product supports your exact devices and runtime needs.",
      "Use battery power stations indoors only as directed; never use fuel-burning generators indoors."
    ] : [],
    disclosure: submission?.affiliateDisclosure,
    safety: submission?.safetyPolicy
  };
}
