import http from "node:http";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { loadProducts } from "./catalogs.js";
import { buildAffiliateUrl, trackClick } from "./affiliate.js";
import { recommend, appProfiles } from "./apps.js";
import { handleMcpRequest } from "./mcp.js";
import { loadSubmission } from "./submissions.js";

const port = Number(process.env.PORT ?? 8790);
const publishedApp = process.env.PUBLISHED_APP;
const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? `http://localhost:${port}`;

function visibleAppEntries() {
  const entries = Object.entries(appProfiles);
  if (!publishedApp) return entries;
  return entries.filter(([appId]) => appId === publishedApp);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(body, null, 2));
}

function sendText(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*"
  });
  res.end(body);
}

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#172033;background:#f7f8fb;line-height:1.55}
    header,main,footer{max-width:960px;margin:0 auto;padding:28px}
    header{padding-top:44px}
    .eyebrow{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#2d6cdf}
    h1{font-size:42px;line-height:1.08;margin:8px 0 14px}
    h2{font-size:24px;margin-top:32px}
    .lead{font-size:19px;color:#3f4d63;max-width:760px}
    .panel{background:#fff;border:1px solid #dfe4ee;border-radius:8px;padding:22px;margin:18px 0}
    a{color:#1f5fbf}
    code{background:#eef2f8;border-radius:4px;padding:2px 5px}
    ul{padding-left:22px}
  </style>
</head>
<body>${body}</body>
</html>`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function demoPage() {
  const query = "Find portable backup power for a fridge and router during a 12-hour outage under $1,500";
  const result = recommend("backup-power-finder", { query, limit: 3 });
  const cards = result.recommendations.map((product, index) => {
    const runtime = product.runtime?.estimatedHours
      ? `${product.runtime.estimatedHours} modeled hours at ${product.runtime.loadWatts}W`
      : "Runtime depends on the connected load";
    const reasons = product.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
    return `<article class="result">
      <p class="rank">${index + 1}</p>
      <div>
        <h2>${escapeHtml(product.name)}</h2>
        <p class="meta">${escapeHtml(product.merchant)} &middot; $${escapeHtml(product.price)} &middot; Fit score ${escapeHtml(product.score)}/100</p>
        <p><strong>Estimated runtime:</strong> ${escapeHtml(runtime)}</p>
        <ul>${reasons}</ul>
        <p><a href="${escapeHtml(product.redirectPath)}">View merchant offer</a></p>
      </div>
    </article>`;
  }).join("");

  return page("Backup Power Finder Demo", `
<header>
  <p class="eyebrow">Interactive app demo</p>
  <h1>Backup Power Finder</h1>
  <p class="lead">A shopper asks one practical question. The app models the load, enforces the budget, and explains three purchase-ready options.</p>
</header>
<main>
  <section class="panel query">
    <p class="label">Shopper request</p>
    <p>${escapeHtml(query)}</p>
    <p class="answer">Three ranked recommendations</p>
  </section>
  <section class="panel">${cards}</section>
  <section class="panel">
    <h2>Important safety note</h2>
    <p>${escapeHtml(result.intent.disclaimers[0])}</p>
    <p class="disclosure">We may earn a commission if you buy through a merchant link. Rankings are based on shopper fit first.</p>
  </section>
</main>`);
}

function homePage() {
  const isMattress = publishedApp === "mattress-finder";
  const isBackupPower = publishedApp === "backup-power-finder";
  const name = isBackupPower ? "Backup Power Finder" : isMattress ? "Mattress Finder" : "Dog Food Finder";
  const lead = isBackupPower
    ? "A ChatGPT shopping app that helps people compare portable power stations and solar generators by outage runtime, device load, solar charging, portability, and budget."
    : isMattress
    ? "A ChatGPT shopping app that helps people compare mattresses by sleep position, cooling, firmness, partner needs, trial length, and budget."
    : "A ChatGPT shopping app that helps dog owners compare dog food by allergies, life stage, breed size, sensitive stomach needs, picky eating, and budget.";
  const endpoint = `${publicBaseUrl}/mcp`;
  return page(name, `
<header>
  <p class="eyebrow">ChatGPT commerce app</p>
  <h1>${name}</h1>
  <p class="lead">${lead}</p>
</header>
<main>
  <section class="panel">
    <h2>What the app does</h2>
    <p>${name} ranks products by shopper fit first, explains tradeoffs in plain language, and includes a clear affiliate disclosure before outbound shopping links.</p>
  </section>
  <section class="panel">
    <h2>Reviewer information</h2>
    <ul>
      <li>MCP endpoint: <code>${endpoint}</code></li>
      <li>Privacy: <a href="/privacy">/privacy</a></li>
      <li>Terms: <a href="/terms">/terms</a></li>
      <li>Support: <a href="/support">/support</a></li>
      <li>Partners: <a href="/partners">/partners</a></li>
    </ul>
  </section>
</main>
<footer>
  <p>Independent affiliate publisher. Not affiliated with or endorsed by OpenAI.</p>
</footer>`);
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

export function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === "GET" && url.pathname === "/health") {
        sendJson(res, 200, { ok: true, name: "commerce-finder", appCount: visibleAppEntries().length, publishedApp: publishedApp ?? "portfolio" });
        return;
      }

      if (req.method === "GET" && url.pathname === "/") {
        sendText(res, 200, homePage(), "text/html; charset=utf-8");
        return;
      }

      if (req.method === "GET" && url.pathname === "/demo") {
        sendText(res, 200, demoPage(), "text/html; charset=utf-8");
        return;
      }

      if (req.method === "GET" && url.pathname === "/demo-recording.mp4") {
        const recording = await readFile(new URL("../assets/backup-power-finder-demo.mp4", import.meta.url));
        res.writeHead(200, {
          "Content-Type": "video/mp4",
          "Content-Length": recording.length,
          "Cache-Control": "public, max-age=86400"
        });
        res.end(recording);
        return;
      }

      if (req.method === "GET" && url.pathname === "/privacy") {
        sendText(res, 200, `Privacy Policy

Commerce Finder apps are shopping assistants for ChatGPT. We process only the shopping criteria a user chooses to provide, such as budget, product preferences, household use case, device load, or fit constraints. We do not ask for payment information, account passwords, government IDs, precise home address, medical records, or veterinary records.

Data categories and purposes: Request criteria are used in memory to generate and explain recommendations. App-level click records contain time, app, merchant, product SKU, result rank, broad intent tags, destination, and a random click reference. They are used for attribution, aggregate performance measurement, debugging, and abuse prevention. We do not place the conversation text in click records.

Recipients: Product and request criteria are processed by OpenAI and our hosting provider as needed to operate the app. When a user chooses an outbound offer, the destination merchant and approved affiliate network receive the click URL and attribution reference under their own privacy policies. We do not sell personal data.

Retention: App-level click records are retained for no more than 30 days. Hosting providers may retain security and operational logs under their published retention policies. Product recommendation inputs are not stored by this application after the request completes.

Controls: Using an outbound merchant link is optional. Users may avoid sharing identifying details in shopping requests and may contact us to ask about access, deletion, or privacy concerns. Because app-level analytics use random references and do not store conversation text or account identifiers, we may be unable to associate a record with a particular person.

We may earn commissions when users buy through partner links. Recommendations are ranked by user fit first. Product guidance is shopping guidance only and is not medical, veterinary, electrical, or emergency-preparedness professional advice.

Support and privacy contact: sholtsman29@gmail.com
`);
        return;
      }

      if (req.method === "GET" && url.pathname === "/terms") {
        sendText(res, 200, `Terms of Use

Commerce Finder apps provide shopping guidance and product comparison support inside ChatGPT. The apps do not sell products directly, process payments, or guarantee pricing, availability, discounts, delivery, specifications, ingredients, or merchant claims.

Outbound links may be affiliate links. If a user purchases through those links, we may earn a commission. Product information can change, so users should verify final price, specifications, subscription terms, returns, and merchant policies on the merchant website before purchasing.

Backup power recommendations are limited to battery power stations and solar generator products. Never operate fuel-burning generators indoors. Users should verify electrical compatibility, manufacturer safety instructions, and requirements for medical devices before relying on any backup-power product.

Support contact: sholtsman29@gmail.com
`);
        return;
      }

      if (req.method === "GET" && url.pathname === "/support") {
        sendText(res, 200, page("Support", `
<header><h1>Support</h1><p class="lead">For support, privacy, legal, or partnership questions, contact <a href="mailto:sholtsman29@gmail.com">sholtsman29@gmail.com</a>.</p></header>
<main><p><a href="/">Home</a> · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></p></main>`), "text/html; charset=utf-8");
        return;
      }

      if (req.method === "GET" && url.pathname === "/partners") {
        sendText(res, 200, page("Partner Information", `
<header><h1>Partner Information</h1><p class="lead">This app is an independent affiliate publisher focused on high-intent ChatGPT shopping conversations.</p></header>
<main>
  <section class="panel"><h2>Promotion methods</h2><p>ChatGPT app recommendations, supporting SEO pages, comparison content, and contextual affiliate links shown after a user requests product options.</p></section>
  <section class="panel"><h2>Compliance posture</h2><p>Affiliate disclosure is shown with outbound links. The app avoids veterinary diagnosis, medical treatment claims, trademark bidding, false coupons, and unauthorized brand claims.</p></section>
</main>`), "text/html; charset=utf-8");
        return;
      }

      if (req.method === "GET" && url.pathname === "/.well-known/openai-apps-challenge") {
        sendText(res, 200, process.env.OPENAI_APPS_CHALLENGE_TOKEN ?? "");
        return;
      }

      if (req.method === "GET" && url.pathname === "/apps") {
        sendJson(res, 200, { apps: visibleAppEntries().map(([, { parser, scorer, ...profile }]) => profile) });
        return;
      }

      const recommendMatch = url.pathname.match(/^\/apps\/([^/]+)\/recommend$/);
      if (req.method === "POST" && recommendMatch) {
        const appId = decodeURIComponent(recommendMatch[1]);
        if (publishedApp && appId !== publishedApp) {
          sendJson(res, 404, { error: "App is not available in this published deployment" });
          return;
        }
        const payload = await readJson(req);
        sendJson(res, 200, recommend(appId, payload));
        return;
      }

      const submissionMatch = url.pathname.match(/^\/apps\/([^/]+)\/submission$/);
      if (req.method === "GET" && submissionMatch) {
        const submission = loadSubmission(decodeURIComponent(submissionMatch[1]));
        if (!submission) {
          sendJson(res, 404, { error: "Unknown app submission" });
          return;
        }
        sendJson(res, 200, submission);
        return;
      }

      if (req.method === "POST" && url.pathname === "/mcp") {
        const message = await readJson(req);
        sendJson(res, 200, handleMcpRequest(message));
        return;
      }

      const redirectMatch = url.pathname.match(/^\/r\/([^/]+)\/([^/]+)$/);
      if (req.method === "GET" && redirectMatch) {
        const merchant = decodeURIComponent(redirectMatch[1]);
        const sku = decodeURIComponent(redirectMatch[2]);
        const appId = url.searchParams.get("app") ?? "unknown";
        const product = loadProducts().find((item) => item.merchant === merchant && item.sku === sku);

        if (!product) {
          sendJson(res, 404, { error: "Unknown affiliate target" });
          return;
        }

        const queryId = url.searchParams.get("qid");
        const destination = buildAffiliateUrl(product, appId, queryId ?? undefined);
        const rank = url.searchParams.get("rank");
        trackClick({
          appId,
          merchant,
          sku,
          destination,
          queryId,
          rank: rank ? Number(rank) : null,
          intentTags: url.searchParams.get("tags")?.split(",").filter(Boolean) ?? []
        });
        res.writeHead(302, { Location: destination });
        res.end();
        return;
      }

      sendJson(res, 404, { error: "Not found" });
    } catch (error) {
      sendJson(res, 500, { error: error.message });
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  createServer().listen(port, () => {
    console.log(`Commerce Finder listening on http://localhost:${port}`);
  });
}
