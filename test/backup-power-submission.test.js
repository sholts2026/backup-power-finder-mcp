import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { recommend } from "../src/apps.js";
import { handleMcpRequest } from "../src/mcp.js";
import { loadSubmission } from "../src/submissions.js";

test("submission metadata is complete and discovery-focused", () => {
  const metadata = JSON.parse(readFileSync(new URL("../submission/metadata.json", import.meta.url), "utf8"));
  const submission = loadSubmission("backup-power-finder");

  assert.equal(metadata.name, "Backup Power Finder");
  assert.equal(metadata.example_prompts.length, 5);
  assert.deepEqual(metadata.country_availability, ["US"]);
  assert.equal(submission.targetKeyword, "best portable power station for home backup");
  assert.match(submission.safetyPolicy, /fuel-burning generators/);
});

test("published app exposes one annotated backup-power tool", () => {
  const previous = process.env.PUBLISHED_APP;
  process.env.PUBLISHED_APP = "backup-power-finder";
  const response = handleMcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });
  const tools = response.result.tools;

  assert.deepEqual(tools.map((tool) => tool.name), ["recommend_backup_power"]);
  assert.deepEqual(tools[0].annotations, {
    readOnlyHint: true,
    openWorldHint: true,
    destructiveHint: false
  });
  assert.ok(tools[0].outputSchema);

  if (previous === undefined) delete process.env.PUBLISHED_APP;
  else process.env.PUBLISHED_APP = previous;
});

test("home-outage request returns structured runtime comparisons", () => {
  const response = handleMcpRequest({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "recommend_backup_power",
      arguments: {
        query: "portable power station for a fridge and router during a 12 hour outage under $1500",
        limit: 3
      }
    }
  });
  const result = response.result.structuredContent;

  assert.equal(result.appId, "backup-power-finder");
  assert.equal(result.recommendations.length, 3);
  assert.equal(result.intent.devices.includes("fridge"), true);
  assert.equal(result.intent.devices.includes("router"), true);
  assert.equal(typeof result.recommendations[0].runtime.estimatedHours, "number");
  assert.match(result.presentation.disclosure, /commission/);
});

test("apartment request prioritizes indoor battery guidance", () => {
  const result = recommend("backup-power-finder", {
    query: "quiet indoor apartment backup under $900"
  });

  assert.equal(result.intent.useCase, "apartment");
  assert.equal(result.intent.quietIndoorPriority, true);
  assert.match(result.recommendations[0].reasons.join(" "), /indoor-safe/);
  assert.match(result.intent.disclaimers.join(" "), /never fuel-burning generators/);
});

test("camping request recognizes portability and budget", () => {
  const result = recommend("backup-power-finder", {
    query: "lightweight portable power station for weekend camping under $700"
  });

  assert.equal(result.intent.useCase, "camping");
  assert.equal(result.intent.portabilityPriority, true);
  assert.ok(result.recommendations.every((item) => item.price <= 700));
});

test("solar RV request rewards solar input", () => {
  const result = recommend("backup-power-finder", {
    query: "compare solar-ready power stations for my RV under $1500"
  });

  assert.equal(result.intent.useCase, "rv");
  assert.equal(result.intent.wantsSolar, true);
  assert.match(result.recommendations[0].reasons.join(" "), /solar input/);
});

test("CPAP request includes medical-device verification guidance", () => {
  const result = recommend("backup-power-finder", {
    query: "battery backup for my CPAP for 8 hours"
  });

  assert.equal(result.intent.devices.includes("cpap"), true);
  assert.match(result.intent.disclaimers.join(" "), /device manufacturer or clinician/);
});

test("review cases include five positive and three negative prompts", () => {
  const cases = JSON.parse(readFileSync(new URL("../submission/test-cases.json", import.meta.url), "utf8"));
  assert.equal(cases.positive.length, 5);
  assert.equal(cases.negative.length, 3);
});

test("affiliate feed importer normalizes backup-power fields", () => {
  const dir = mkdtempSync(join(tmpdir(), "backup-power-feed-"));
  const input = join(dir, "feed.csv");
  const output = join(dir, "products.json");

  writeFileSync(input, [
    "product_id,brand,title,sale_price,product_url,image_url,capacity_wh,rated_output_w,peak_output_w,max_solar_input_w,battery_chemistry,weight_lb,expandable,battery_only,use_cases,ports",
    "TEST-100,EcoFlow,Test Power Station,$799,https://example.com/product,https://example.com/image.png,1024,1800,3600,500,LFP,28,true,true,apartment|camping,ac|usb-c"
  ].join("\n"));

  execFileSync("node", [
    "scripts/import-feed.js",
    "--input", input,
    "--merchant", "ecoflow",
    "--category", "backup_power",
    "--out", output
  ], { cwd: process.cwd(), stdio: "pipe" });

  const [product] = JSON.parse(readFileSync(output, "utf8"));
  assert.equal(product.category, "backup_power");
  assert.equal(product.attributes.capacityWh, 1024);
  assert.equal(product.attributes.continuousWatts, 1800);
  assert.equal(product.attributes.expandable, true);
  assert.deepEqual(product.attributes.useCases, ["apartment", "camping"]);
});
