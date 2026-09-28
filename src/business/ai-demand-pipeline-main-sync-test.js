"use strict";

const assert = require("node:assert/strict");
const { normalizeItem } = require("./ai-demand-prospect-discovery");
const { EmailOutreachProviderV1 } = require("./email-outreach-provider-v1");

const prospect = normalizeItem({
  title: "AI Automation Developer at Example Realty",
  url: "https://example.com/jobs/ai",
  snippet: "Dubai AI automation role",
  source: "Google Search"
}, 0, "Dubai AI Automation hiring");

assert.equal(prospect.company, "Example Realty");
assert.equal(prospect.demand_signal, "ACTIVE_AI_HIRING");

(async () => {
  const provider = new EmailOutreachProviderV1({ enabled: false });
  const blocked = await provider.sendApproved([{
    id: "TEST-1",
    status: "APPROVED",
    email: "test@example.com",
    subject: "Test",
    body: "Test"
  }]);
  assert.equal(blocked.status, "BLOCKED");
  console.log("AI demand pipeline main-sync contract: PASS");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
