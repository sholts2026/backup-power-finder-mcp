const PET_SYNONYMS = {
  chicken_allergy: ["chicken allergy", "allergic to chicken", "no chicken", "avoid chicken"],
  sensitive_stomach: ["sensitive stomach", "diarrhea", "upset stomach", "digestive", "digestion"],
  picky_eater: ["picky", "won't eat", "does not eat", "fussy"],
  puppy: ["puppy", "puppies"],
  senior: ["senior", "old dog", "older dog"],
  large: ["large breed", "golden retriever", "german shepherd", "lab", "labrador"],
  small: ["small breed", "chihuahua", "yorkie", "pomeranian"],
  fresh: ["fresh", "human grade", "subscription"],
  budget: ["cheap", "affordable", "budget", "under"]
};

const MATTRESS_SYNONYMS = {
  side: ["side sleeper", "sleep on my side"],
  back: ["back sleeper", "sleep on my back"],
  stomach: ["stomach sleeper", "sleep on my stomach"],
  hot: ["hot sleeper", "hot side sleeper", "hot back sleeper", "sleep hot", "cooling", "sweaty", "overheat"],
  couple: ["couple", "partner", "motion isolation", "sex"],
  backPain: ["back pain", "lower back", "sciatica"],
  soft: ["soft", "plush"],
  firm: ["firm", "extra firm"],
  queen: ["queen"],
  king: ["king"]
};

const BACKUP_POWER_SYNONYMS = {
  outage: ["outage", "blackout", "power cut", "power outage", "emergency", "hurricane", "storm", "winter storm"],
  camping: ["camping", "camp", "tent", "tailgate", "overlanding"],
  rv: ["rv", "camper", "van life", "vanlife"],
  apartment: ["apartment", "condo", "renter", "indoors", "indoor"],
  solar: ["solar", "panel", "off grid", "off-grid"],
  cpap: ["cpap"],
  fridge: ["fridge", "refrigerator", "freezer"],
  router: ["router", "wifi", "wi-fi", "modem"],
  microwave: ["microwave"],
  portable: ["portable", "lightweight", "carry", "car camping"],
  quiet: ["quiet", "silent", "no fumes", "fume free"]
};

function includesAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function extractBudget(text, fallback) {
  const underMatch = text.match(/(?:under|below|less than|max|budget)\s*\$?(\d{2,5})/i);
  if (underMatch) return Number(underMatch[1]);

  const dollarMatch = text.match(/\$(\d{2,5})/);
  return dollarMatch ? Number(dollarMatch[1]) : fallback;
}

function extractHours(text, fallback) {
  const hourMatch = text.match(/(\d{1,3})\s*(?:hours|hour|hrs|hr|h)\b/i);
  return hourMatch ? Number(hourMatch[1]) : fallback;
}

function extractWatts(text, fallback) {
  const wattMatch = text.match(/(\d{2,5})\s*(?:w|watts|watt)\b/i);
  return wattMatch ? Number(wattMatch[1]) : fallback;
}

export function parsePetFoodIntent(query = "", overrides = {}) {
  const text = query.toLowerCase();
  return {
    appId: "pet-food-finder",
    query,
    budget: overrides.budget ?? extractBudget(text, 120),
    lifeStage: overrides.lifeStage ?? (includesAny(text, PET_SYNONYMS.puppy) ? "puppy" : includesAny(text, PET_SYNONYMS.senior) ? "senior" : "adult"),
    breedSize: overrides.breedSize ?? (includesAny(text, PET_SYNONYMS.large) ? "large" : includesAny(text, PET_SYNONYMS.small) ? "small" : "medium"),
    avoidProteins: overrides.avoidProteins ?? (includesAny(text, PET_SYNONYMS.chicken_allergy) ? ["chicken"] : []),
    goals: overrides.goals ?? [
      ...(includesAny(text, PET_SYNONYMS.sensitive_stomach) ? ["sensitive_stomach"] : []),
      ...(includesAny(text, PET_SYNONYMS.picky_eater) ? ["picky_eater"] : []),
      ...(includesAny(text, PET_SYNONYMS.budget) ? ["budget"] : []),
      ...(includesAny(text, PET_SYNONYMS.fresh) ? ["fresh"] : [])
    ],
    disclaimers: [
      "Shopping guidance only. For diagnosed disease, symptoms, medication, or prescription diets, consult a veterinarian."
    ]
  };
}

export function parseMattressIntent(query = "", overrides = {}) {
  const text = query.toLowerCase();
  return {
    appId: "mattress-finder",
    query,
    budget: overrides.budget ?? extractBudget(text, 1400),
    sleepPosition: overrides.sleepPosition ?? (includesAny(text, MATTRESS_SYNONYMS.side) ? "side" : includesAny(text, MATTRESS_SYNONYMS.stomach) ? "stomach" : includesAny(text, MATTRESS_SYNONYMS.back) ? "back" : "combo"),
    firmness: overrides.firmness ?? (includesAny(text, MATTRESS_SYNONYMS.soft) ? "soft" : includesAny(text, MATTRESS_SYNONYMS.firm) ? "firm" : null),
    hotSleeper: overrides.hotSleeper ?? includesAny(text, MATTRESS_SYNONYMS.hot),
    couple: overrides.couple ?? includesAny(text, MATTRESS_SYNONYMS.couple),
    backPainContext: overrides.backPainContext ?? includesAny(text, MATTRESS_SYNONYMS.backPain),
    size: overrides.size ?? (includesAny(text, MATTRESS_SYNONYMS.king) ? "king" : "queen"),
    disclaimers: [
      "Shopping guidance only. Mattress comfort is subjective; pain or medical sleep issues should be discussed with a clinician."
    ]
  };
}

export function parseBackupPowerIntent(query = "", overrides = {}) {
  const text = query.toLowerCase();
  const devices = overrides.devices ?? [
    ...(includesAny(text, BACKUP_POWER_SYNONYMS.fridge) ? ["fridge"] : []),
    ...(includesAny(text, BACKUP_POWER_SYNONYMS.cpap) ? ["cpap"] : []),
    ...(includesAny(text, BACKUP_POWER_SYNONYMS.router) ? ["router"] : []),
    ...(includesAny(text, BACKUP_POWER_SYNONYMS.microwave) ? ["microwave"] : [])
  ];

  return {
    appId: "backup-power-finder",
    query,
    budget: overrides.budget ?? extractBudget(text, 1500),
    useCase: overrides.useCase ?? (
      includesAny(text, BACKUP_POWER_SYNONYMS.rv) ? "rv" :
      includesAny(text, BACKUP_POWER_SYNONYMS.camping) ? "camping" :
      includesAny(text, BACKUP_POWER_SYNONYMS.apartment) ? "apartment" :
      "home_backup"
    ),
    desiredHours: overrides.desiredHours ?? extractHours(text, includesAny(text, BACKUP_POWER_SYNONYMS.outage) ? 12 : 8),
    loadWatts: overrides.loadWatts ?? extractWatts(text, null),
    devices,
    wantsSolar: overrides.wantsSolar ?? includesAny(text, BACKUP_POWER_SYNONYMS.solar),
    portabilityPriority: overrides.portabilityPriority ?? includesAny(text, BACKUP_POWER_SYNONYMS.portable),
    quietIndoorPriority: overrides.quietIndoorPriority ?? (includesAny(text, BACKUP_POWER_SYNONYMS.quiet) || includesAny(text, BACKUP_POWER_SYNONYMS.apartment)),
    disclaimers: [
      "Shopping guidance only. Use battery power stations indoors, never fuel-burning generators. Verify final specs, pricing, and safe operation with the merchant before purchase.",
      "For medical devices such as CPAP machines, confirm backup requirements with the device manufacturer or clinician."
    ]
  };
}
