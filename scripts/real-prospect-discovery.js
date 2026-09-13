"use strict";

require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { ProspectDiscoveryV1 } = require("../src/business/prospect-discovery-v1");

const APIFY_TOKEN = process.env.APIFY_TOKEN;
const ACTOR = "compass~crawler-google-places";
const SEARCH_QUERY = process.env.PROSPECT_SEARCH_QUERY || "real estate agency Dubai";
const MAX_RESULTS = Number(process.env.PROSPECT_MAX_RESULTS || 20);
const OUTPUT_FILE = path.resolve(process.env.PROSPECT_OUTPUT_FILE || "data/prospects.json");
const POLL_MS = Number(process.env.APIFY_POLL_MS || 3000);
const TIMEOUT_MS = Number(process.env.APIFY_TIMEOUT_MS || 10 * 60 * 1000);

function requireConfig() {
  if (!APIFY_TOKEN) throw new Error("APIFY_TOKEN is required in the local environment");
  if (!Number.isInteger(MAX_RESULTS) || MAX_RESULTS < 1 || MAX_RESULTS > 100) {
    throw new Error("PROSPECT_MAX_RESULTS must be an integer between 1 and 100");
  }
}

function headers() {
  return { Authorization: `Bearer ${APIFY_TOKEN}`, "Content-Type": "application/json" };
}

async function apify(pathname, options = {}) {
  const response = await fetch(`https://api.apify.com/v2${pathname}`, {
    ...options,
    headers: { ...headers(), ...(options.headers || {}) }
  });
  const body = await response.text();
  let data;
  try { data = JSON.parse(body); } catch { data = { raw: body }; }
  if (!response.ok) {
    throw new Error(`APIFY_${response.status}: ${data?.error?.message || data?.message || "request failed"}`);
  }
  return data;
}

function normalizeApifyItem(item, index) {
  const placeId = item.placeId || item.place_id || item.googlePlaceId || item.cid || `result-${index + 1}`;
  const website = item.website || item.webSite || "";
  return {
    provider: "APIFY_GOOGLE_MAPS",
    provider_record_id: String(placeId),
    company: item.title || item.name || item.businessName || "",
    website,
    phone: item.phone || item.phoneUnformatted || "",
    email: item.email || "",
    city: item.city || item.addressCity || "Dubai",
    country: item.country || item.addressCountry || "UAE",
    category: item.categoryName || item.category || "Real Estate Agency"
  };
}

async function startActor() {
  return apify(`/acts/${ACTOR}/runs?token=${encodeURIComponent(APIFY_TOKEN)}`, {
    method: "POST",
    body: JSON.stringify({
      searchStringsArray: [SEARCH_QUERY],
      maxCrawledPlacesPerSearch: MAX_RESULTS,
      language: "en",
      includeWebResults: false,
      scrapePlaceDetailPage: true
    })
  });
}

async function waitForRun(runId) {
  const started = Date.now();
  while (Date.now() - started < TIMEOUT_MS) {
    const result = await apify(`/actor-runs/${encodeURIComponent(runId)}`);
    const status = result?.data?.status;
    if (["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status)) return result.data;
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
  }
  throw new Error("APIFY_TIMEOUT: actor run did not finish within the configured timeout");
}

async function fetchDatasetItems(datasetId) {
  const result = await apify(`/datasets/${encodeURIComponent(datasetId)}/items?clean=true&format=json`);
  return Array.isArray(result) ? result : [];
}

async function run() {
  requireConfig();
  console.log("JARVIS REAL PROSPECT DISCOVERY V1");
  console.log(`Search: ${SEARCH_QUERY}`);
  console.log(`Requested prospects: ${MAX_RESULTS}`);

  const run = await startActor();
  const runId = run?.data?.id;
  const datasetId = run?.data?.defaultDatasetId;
  if (!runId || !datasetId) throw new Error("APIFY_INVALID_RUN_RESPONSE");

  console.log(`Apify run: ${runId}`);
  const completed = await waitForRun(runId);
  if (completed.status !== "SUCCEEDED") throw new Error(`APIFY_RUN_${completed.status}`);

  const rawItems = await fetchDatasetItems(datasetId);
  const providerResults = rawItems.map(normalizeApifyItem);
  const requestId = `PROSPECT-DISCOVERY-${Date.now()}`;
  const discovery = new ProspectDiscoveryV1().discover({
    request_id: requestId,
    target_market: "REAL_ESTATE",
    search_context: { city: "Dubai", category: "real_estate", query: SEARCH_QUERY },
    provider_results: providerResults
  });

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
    request_id: requestId,
    search_query: SEARCH_QUERY,
    source: "Apify Google Maps",
    discovered_at: new Date().toISOString(),
    ...discovery
  }, null, 2));

  console.log(`Accepted: ${discovery.prospects.length}`);
  console.log(`Rejected/deduplicated: ${discovery.rejected_count}`);
  console.log(`Saved: ${OUTPUT_FILE}`);
  console.log("\n========== APPROVAL LIST ==========");
  discovery.prospects.forEach((prospect, index) => {
    console.log(`\n${index + 1}. ${prospect.company}`);
    console.log(`   Phone: ${prospect.phone || "N/A"}`);
    console.log(`   Website: ${prospect.website || "N/A"}`);
    console.log(`   Location: ${prospect.city || ""}${prospect.country ? `, ${prospect.country}` : ""}`);
    console.log(`   Category: ${prospect.category || "N/A"}`);
  });
  console.log("\nApproval status: DISCOVERED_ONLY — no outreach was sent.");
}

run().catch(error => {
  console.error(`REAL PROSPECT DISCOVERY FAILED: ${error.message}`);
  process.exitCode = 1;
});
