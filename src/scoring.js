function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function budgetScore(price, budget) {
  if (!budget) return 12;
  if (price <= budget) return 20;
  const overage = (price - budget) / budget;
  return Math.max(0, 20 - overage * 40);
}

export function scorePetFood(product, intent) {
  const attributes = product.attributes;
  let score = 0;
  const reasons = [];

  if (attributes.lifeStages.includes(intent.lifeStage)) {
    score += 14;
    reasons.push(`fits ${intent.lifeStage} life stage`);
  }

  if (attributes.breedSizes.includes(intent.breedSize)) {
    score += 10;
    reasons.push(`works for ${intent.breedSize} breed size`);
  }

  const avoidsConflict = intent.avoidProteins.every((protein) => attributes.avoids.includes(protein) || !attributes.proteins.includes(protein));
  if (avoidsConflict) {
    score += 18;
    if (intent.avoidProteins.length) reasons.push(`avoids ${intent.avoidProteins.join(", ")}`);
  } else {
    score -= 35;
    reasons.push("protein conflict with stated allergy");
  }

  for (const goal of intent.goals) {
    if (goal === "fresh" && attributes.format === "fresh") {
      score += 10;
      reasons.push("fresh subscription format");
    } else if (attributes.goodFor.includes(goal)) {
      score += 12;
      reasons.push(goal.replaceAll("_", " "));
    }
  }

  if (attributes.customizedPlan) {
    score += 8;
    reasons.push("customized portions");
  }

  if (attributes.vetFormulated) {
    score += 6;
    reasons.push("vet-formulated positioning");
  }

  score += budgetScore(product.price, intent.budget);
  score += product.commissionWeight * 4;

  return {
    score: clampScore(score),
    reasons: reasons.slice(0, 5)
  };
}

export function scoreMattress(product, intent) {
  const attributes = product.attributes;
  let score = 0;
  const reasons = [];

  if (attributes.sleepPositions.includes(intent.sleepPosition) || attributes.sleepPositions.includes("combo")) {
    score += 22;
    reasons.push(`good fit for ${intent.sleepPosition} sleeping`);
  }

  if (intent.hotSleeper && attributes.cooling) {
    score += 16;
    reasons.push("cooling features for hot sleepers");
  } else if (!intent.hotSleeper) {
    score += 6;
  }

  if (intent.couple && attributes.support.includes("couples")) {
    score += 10;
    reasons.push("couples-friendly support");
  }

  if (intent.backPainContext && attributes.support.includes("back_pain_context")) {
    score += 12;
    reasons.push("supportive design for back-pain context");
  }

  if (intent.firmness && attributes.firmness.includes(intent.firmness)) {
    score += 10;
    reasons.push(`matches ${intent.firmness} preference`);
  } else if (!intent.firmness && ["medium", "medium_firm", "luxury_firm"].includes(attributes.firmness)) {
    score += 8;
    reasons.push("mainstream firmness profile");
  }

  if (attributes.sizes.includes(intent.size)) {
    score += 5;
  }

  if (attributes.trialNights >= 365) {
    score += 8;
    reasons.push(`${attributes.trialNights}-night trial`);
  } else if (attributes.trialNights >= 100) {
    score += 5;
    reasons.push(`${attributes.trialNights}-night trial`);
  }

  score += budgetScore(product.price, intent.budget);
  score += product.commissionWeight * 3;

  return {
    score: clampScore(score),
    reasons: reasons.slice(0, 5)
  };
}

const DEVICE_WATTS = {
  fridge: 150,
  cpap: 60,
  router: 20,
  microwave: 1000
};

function estimateRequiredWh(intent) {
  if (intent.loadWatts) return intent.loadWatts * intent.desiredHours;
  const deviceWatts = intent.devices?.length
    ? intent.devices.reduce((sum, device) => sum + (DEVICE_WATTS[device] ?? 0), 0)
    : 250;
  return deviceWatts * intent.desiredHours;
}

export function estimateBackupRuntime(product, intent) {
  const attributes = product.attributes;
  const loadWatts = intent.loadWatts ?? (intent.devices?.length
    ? intent.devices.reduce((sum, device) => sum + (DEVICE_WATTS[device] ?? 0), 0)
    : 250);
  const usableWh = attributes.capacityWh * 0.85;
  return {
    loadWatts,
    estimatedHours: Math.round((usableWh / Math.max(loadWatts, 1)) * 10) / 10,
    requiredWh: estimateRequiredWh(intent)
  };
}

export function scoreBackupPower(product, intent) {
  const attributes = product.attributes;
  const runtime = estimateBackupRuntime(product, intent);
  let score = 0;
  const reasons = [];

  if (attributes.continuousWatts >= runtime.loadWatts) {
    score += 18;
    reasons.push(`supports about ${runtime.loadWatts}W continuous load`);
  } else {
    score -= 30;
    reasons.push("continuous wattage may be too low for the stated load");
  }

  if (runtime.estimatedHours >= intent.desiredHours) {
    score += 22;
    reasons.push(`estimated ${runtime.estimatedHours} hours at the modeled load`);
  } else if (runtime.estimatedHours >= intent.desiredHours * 0.65) {
    score += 12;
    reasons.push(`estimated ${runtime.estimatedHours} hours; close to target runtime`);
  } else {
    score += 3;
    reasons.push(`estimated ${runtime.estimatedHours} hours; below target runtime`);
  }

  if (intent.wantsSolar && attributes.solarInputWatts >= 400) {
    score += 12;
    reasons.push(`${attributes.solarInputWatts}W solar input for faster recharging`);
  } else if (!intent.wantsSolar) {
    score += 4;
  }

  if (intent.portabilityPriority && attributes.weightLb <= 40) {
    score += 10;
    reasons.push(`${attributes.weightLb} lb portable design`);
  } else if (!intent.portabilityPriority && attributes.useCases.includes(intent.useCase)) {
    score += 8;
    reasons.push(`good fit for ${intent.useCase.replaceAll("_", " ")}`);
  }

  if (intent.quietIndoorPriority && attributes.indoorSafeBattery) {
    score += 10;
    reasons.push("battery-only indoor-safe operation when used as directed");
  }

  if (attributes.batteryChemistry === "LFP") {
    score += 7;
    reasons.push("LFP battery chemistry");
  }

  if (attributes.expandable) {
    score += 5;
    reasons.push("expandable capacity path");
  }

  score += budgetScore(product.price, intent.budget);
  score += product.commissionWeight * 4;

  return {
    score: clampScore(score),
    reasons: reasons.slice(0, 5),
    runtime
  };
}
