"use strict";

const assert = require("node:assert");
const ProspectDiscoveryLive = require("./prospect-discovery-live");

async function run() {
  const originalFetch = global.fetch;
  const calls = [];
  let pollCount = 0;

  global.fetch = async (url, options = {}) => {
    calls.push({ url, options });
    if (url.includes("/acts/")) {
      return new Response(JSON.stringify({ data: { id: "run-1", defaultDatasetId: "dataset-1", status: "RUNNING" } }), { status: 201, headers: { "content-type": "application/json" } });
    }
    if (url.includes("/actor-runs/")) {
      pollCount += 1;
      return new Response(JSON.stringify({ data: { status: "SUCCEEDED" } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("/datasets/")) {
      return new Response(JSON.stringify([{ title: "Test Dubai Agency", address: "Dubai, UAE", phone: "+971500000000", website: "https://example.com", totalScore: 4.8, reviewsCount: 12, categoryName: "Real Estate Agency", placeId: "place-1" }]), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error(`unexpected URL: ${url}`);
  };

  try {
    const blocked = new ProspectDiscoveryLive({ token: "", limit: 1 });
    const blockedResult = await blocked.discover();
    assert.strictEqual(blockedResult.status, "BLOCKED");

    const live = new ProspectDiscoveryLive({ token: "TEST_TOKEN", limit: 1, query: "real estate agency Dubai" });
    const result = await live.discover();
    assert.strictEqual(result.executed, true);
    assert.strictEqual(result.status, "COMPLETE");
    assert.strictEqual(result.mode, "LIVE");
    assert.strictEqual(result.total_found, 1);
    assert.strictEqual(result.prospects[0].name, "Test Dubai Agency");
    assert.strictEqual(result.prospects[0].place_id, "place-1");
    assert.strictEqual(calls[0].options.headers.Authorization, "Bearer TEST_TOKEN");
    assert.strictEqual(pollCount, 1);
    assert.strictEqual(calls.length, 3);

    const invalid = new ProspectDiscoveryLive({ token: "TEST_TOKEN", limit: 101 });
    const invalidResult = await invalid.discover();
    assert.strictEqual(invalidResult.status, "BLOCKED");

    console.log("Live Prospect Discovery V1 contract tests: PASS");
  } finally {
    global.fetch = originalFetch;
  }
}

run().catch(error => {
  console.error("Live Prospect Discovery V1 contract tests: FAIL");
  console.error(error);
  process.exitCode = 1;
});
