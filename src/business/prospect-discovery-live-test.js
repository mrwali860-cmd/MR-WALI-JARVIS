"use strict";

const assert = require("node:assert");
const ProspectDiscoveryLive = require("./prospect-discovery-live");

async function run() {
  const originalApifyToken = process.env.APIFY_TOKEN;
  delete process.env.APIFY_TOKEN;

  try {
    const blocked = new ProspectDiscoveryLive({ token: null, limit: 1 });
    const blockedResult = await blocked.discover();
    assert.strictEqual(blockedResult.status, "BLOCKED");
    assert.strictEqual(blockedResult.executed, false);

    const invalidLimit = new ProspectDiscoveryLive({ token: "TEST_TOKEN", limit: 101 });
    const invalidResult = await invalidLimit.discover();
    assert.strictEqual(invalidResult.status, "BLOCKED");

    console.log("Live Prospect Discovery V1 contract tests: PASS");
  } finally {
    if (originalApifyToken === undefined) {
      delete process.env.APIFY_TOKEN;
    } else {
      process.env.APIFY_TOKEN = originalApifyToken;
    }
  }
}

run().catch((error) => {
  console.error("Live Prospect Discovery V1 contract tests: FAIL");
  console.error(error);
  process.exitCode = 1;
});
