"use strict";

const assert = require("assert");
const RiskApprovalPolicy = require("./risk-approval-policy");

const policy = new RiskApprovalPolicy();

assert.equal(policy.getInfo().id, "RISK_APPROVAL_POLICY");

const safe = policy.evaluate({ action: "LEAD_QUALIFICATION" });
assert.equal(safe.decision, "ALLOW");
assert.equal(safe.allowed, true);

const blockedBooking = policy.evaluate({ action: "BOOKING_EXECUTION" });
assert.equal(blockedBooking.decision, "WAIT");
assert.equal(blockedBooking.allowed, false);
assert.equal(blockedBooking.reason, "APPROVAL_REQUIRED");

const approvedBooking = policy.evaluate({
    action: "BOOKING_EXECUTION",
    approval_context: { approved: true }
});
assert.equal(approvedBooking.decision, "ALLOW");
assert.equal(approvedBooking.reason, "APPROVED");

const approvedByStatus = policy.evaluate({
    action: "BOOKING_EXECUTION",
    approval_context: { status: "APPROVED" }
});
assert.equal(approvedByStatus.decision, "ALLOW");

const unknownAction = policy.evaluate({ action: "SOME_UNCLASSIFIED_ACTION" });
assert.equal(unknownAction.decision, "DENY");
assert.equal(unknownAction.reason, "UNCLASSIFIED_ACTION");

const missingAction = policy.evaluate({});
assert.equal(missingAction.decision, "DENY");
assert.equal(missingAction.reason, "ACTION_REQUIRED");

assert.equal(policy.requiresApproval("BOOKING_EXECUTION"), true);
assert.equal(policy.requiresApproval("LEAD_INTAKE"), false);

console.log("Risk Approval Policy Engine V1 tests passed");
