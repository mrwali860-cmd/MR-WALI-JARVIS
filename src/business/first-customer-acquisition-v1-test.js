"use strict";

const assert = require("node:assert/strict");
const { FirstCustomerAcquisitionV1 } = require("./first-customer-acquisition-v1");

const engine = new FirstCustomerAcquisitionV1({
  targetMarket: "Pakistan small businesses",
  offer: "a customer enquiry follow-up pilot",
  senderName: "MR WALI"
});

const result = engine.build([
  {
    company: "Example Traders",
    category: "Retail",
    city: "Hangu",
    website: "https://example.test",
    source_url: "https://example.test/about",
    observed_problem: "",
    verified_by_human: true
  },
  {
    company: "Example Traders duplicate",
    website: "https://example.test"
  },
  {
    company: "No Contact Shop",
    city: "Hangu"
  },
  null
]);

assert.equal(result.status, "COMPLETE");
assert.equal(result.mode, "DRAFT_ONLY");
assert.equal(result.summary.input_count, 4);
assert.equal(result.summary.accepted_count, 2);
assert.equal(result.summary.rejected_or_duplicate_count, 2);
assert.equal(result.summary.contact_available, 1);
assert.equal(result.summary.contact_required, 1);
assert.equal(result.summary.messages_sent, 0);
assert.equal(result.summary.sales_won, 0);
assert.equal(result.prospects[0].stage, "DRAFT_READY_FOR_REVIEW");
assert.equal(result.prospects[0].approval_required, true);
assert.equal(result.prospects[0].send_status, "NOT_SENT");
assert.match(result.prospects[0].outreach_draft, /I do not want to assume/);
assert.doesNotMatch(result.prospects[0].outreach_draft, /I noticed your real estate work/);
assert.equal(result.prospects[1].stage, "NEEDS_CONTACT_RESEARCH");
assert.equal(result.controls.automatic_send, false);

const invalid = engine.build({});
assert.equal(invalid.status, "REJECTED");
assert.equal(invalid.reason, "PROSPECTS_MUST_BE_AN_ARRAY");

console.log("First customer acquisition engine V1 tests: PASS");
