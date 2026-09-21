"use strict";
const assert = require("assert");
const { RevenueMissionV1 } = require("./revenue-mission-v1");
const mission = new RevenueMissionV1();
const result = mission.run({
  request_id: "REV_TEST_001",
  target_market: "REAL_ESTATE",
  search_context: { query: "Dubai real estate agencies" },
  provider_results: [
    { provider: "test", provider_record_id: "1", company: "Alpha Realty", website: "https://alpha.example", email: "sales@alpha.example", city: "Dubai", country: "UAE", category: "real_estate" },
    { provider: "test", provider_record_id: "1", company: "Alpha Realty", website: "https://alpha.example", email: "sales@alpha.example", city: "Dubai", country: "UAE", category: "real_estate" },
    { provider: "test", provider_record_id: "2", company: "Beta Realty", website: "https://beta.example", email: "hello@beta.example", city: "Dubai", country: "UAE", category: "real_estate" }
  ]
});
assert.equal(result.status, "READY");
assert.equal(result.metrics.prospects, 2);
assert.equal(result.metrics.qualified, 2);
assert.equal(result.metrics.drafts, 2);
assert.equal(result.next_action, "REQUEST_OUTREACH_APPROVAL");
assert.equal(result.evidence.sending_performed, false);
console.log("REVENUE_MISSION_V1_TEST_PASS");
