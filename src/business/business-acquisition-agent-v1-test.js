"use strict";

const assert = require("assert");
const { BusinessAcquisitionAgentV1 } = require("./business-acquisition-agent-v1");

const agent = new BusinessAcquisitionAgentV1();

const baseInput = {
    request_id: "req-acq-001",
    prospect: {
        opportunity_id: "opp-001",
        company: "Demo Realty",
        contact: "demo@example.com",
        market: "REAL_ESTATE",
        problem: "Slow lead response"
    }
};

const qualified = agent.evaluate(baseInput);
assert.equal(qualified.request_id, "req-acq-001");
assert.equal(qualified.opportunity_id, "opp-001");
assert.equal(qualified.qualification, "QUALIFIED");
assert.equal(qualified.service_id, "AI_APPOINTMENT_BOOKING_AUTOMATION");
assert.equal(qualified.outreach.status, "DRAFT");
assert.ok(qualified.outreach.message);
assert.equal(qualified.next_action, "REQUEST_OUTREACH_APPROVAL");

assert.deepEqual(agent.evaluate(baseInput), qualified);

const unsupported = agent.evaluate({
    ...baseInput,
    prospect: { ...baseInput.prospect, market: "UNSUPPORTED_MARKET" }
});
assert.equal(unsupported.qualification, "DISQUALIFIED");
assert.equal(unsupported.service_id, null);
assert.equal(unsupported.outreach.status, "NOT_READY");
assert.equal(unsupported.outreach.message, null);

const incomplete = agent.evaluate({
    request_id: "req-acq-002",
    prospect: { ...baseInput.prospect, problem: "" }
});
assert.equal(incomplete.qualification, "DISQUALIFIED");
assert.equal(incomplete.service_id, null);
assert.equal(incomplete.outreach.status, "NOT_READY");

assert.equal(qualified.evidence.external_execution, false);

console.log("Business Acquisition Agent V1: PASS");
