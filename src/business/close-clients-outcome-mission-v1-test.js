"use strict";

const assert = require("assert");
const {
    STOP_CONDITIONS,
    createCloseClientsMission
} = require("./close-clients-outcome-mission-v1");

const mission = createCloseClientsMission({
    mission_id: "CLOSE_CLIENTS_TEST",
    goal: "Close 15 new clients today",
    target_clients: 15,
    market: "International",
    offer: "AI Appointment Booking Automation",
    max_outreach: 100,
    daily_limits: { outreach: 100 },
    stop_when: "15 verified paid clients OR daily limit reached"
});

assert.equal(mission.mission_id, "CLOSE_CLIENTS_TEST");
assert.equal(mission.mission_type, "CLOSE_CLIENTS");
assert.equal(mission.target_clients, 15);
assert.equal(mission.market, "International");
assert.equal(mission.offer, "AI Appointment Booking Automation");
assert.equal(mission.max_outreach, 100);
assert.equal(mission.success_metric, "verified_paid_clients");
assert.equal(mission.guarantee, false);
assert.equal(mission.execution_boundary.external_actions_require_approval, true);

for (const key of ["external_messages", "meetings", "contracts", "payments"]) {
    assert.equal(mission.approval_policy[key], "HUMAN_APPROVAL_REQUIRED");
}

for (const condition of [
    "VERIFIED_PAID_CLIENT_TARGET_REACHED",
    "DAILY_OUTREACH_LIMIT_REACHED",
    "HUMAN_APPROVAL_REQUIRED",
    "MISSION_BLOCKED"
]) {
    assert(STOP_CONDITIONS.includes(condition));
    assert(mission.stop_conditions.includes(condition));
}

for (const evidence of [
    "prospect_identity",
    "qualification_result",
    "outreach_status",
    "reply_classification",
    "meeting_status",
    "proposal_status",
    "approval_events",
    "payment_verification"
]) {
    assert(mission.required_evidence.includes(evidence));
}

assert.throws(
    () => createCloseClientsMission({ goal: "x", target_clients: 0, market: "x", offer: "x", max_outreach: 1 }),
    /TARGET_CLIENTS_MUST_BE_POSITIVE_INTEGER/
);
assert.throws(
    () => createCloseClientsMission({ goal: "x", target_clients: 1, market: "", offer: "x", max_outreach: 1 }),
    /CLOSE_CLIENTS_MARKET_REQUIRED/
);
assert.throws(
    () => createCloseClientsMission({ goal: "x", target_clients: 1, market: "x", offer: "", max_outreach: 1 }),
    /CLOSE_CLIENTS_OFFER_REQUIRED/
);
assert.throws(
    () => createCloseClientsMission({ goal: "x", target_clients: 5, market: "x", offer: "x", max_outreach: 4 }),
    /MAX_OUTREACH_MUST_BE_INTEGER_AND_AT_LEAST_TARGET/
);

console.log("close-clients-outcome-mission-v1-test: PASS");
