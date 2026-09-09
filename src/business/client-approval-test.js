"use strict";

const assert = require("assert");
const ClientApproval = require("./client-approval");

const approval = new ClientApproval();

assert.deepStrictEqual(Object.keys(approval.getInfo()).sort(), ["id", "name", "status", "version"]);
assert.strictEqual(approval.getInfo().id, "CLIENT_APPROVAL");
assert.strictEqual(approval.getInfo().name, "Client Approval");
assert.strictEqual(approval.getInfo().status, "AVAILABLE");
assert.strictEqual(approval.healthCheck().healthy, true);

const base = {
    service_id: "S1",
    request_id: "R1",
    qa_decision: "PASS"
};

for (const field of ["service_id", "request_id", "qa_decision", "approval_context"]) {
    const input = { ...base, approval_context: { status: "PENDING", source: "client" } };
    delete input[field];
    assert.throws(() => approval.execute(input), /CLIENT_APPROVAL: missing required fields/);
}

// Only DECIDE is supported; Client Approval cannot execute downstream actions.
assert.strictEqual(approval.execute({ ...base, approval_context: { status: "PENDING" } }).decision, "PENDING");
assert.strictEqual(approval.execute({ ...base, approval_context: { status: "APPROVED", approver: "client" } }).decision, "APPROVED");
assert.strictEqual(approval.execute({ ...base, approval_context: { approved: true, source: "client" } }).decision, "APPROVED");
assert.strictEqual(approval.execute({ ...base, approval_context: { status: "REJECTED", source: "client" } }).decision, "REJECTED");
assert.strictEqual(approval.execute({ ...base, approval_context: { approved: false, source: "client" } }).decision, "REJECTED");

// QA is a hard prerequisite: PASS is the only state eligible for approval.
for (const qaDecision of ["FAIL", "REVIEW", "PENDING", "UNKNOWN", ""]) {
    const result = approval.execute({ ...base, qa_decision: qaDecision, approval_context: { status: "APPROVED", source: "client" } });
    assert.strictEqual(result.decision, "PENDING");
}

const pending = approval.execute({ ...base, approval_context: { status: "PENDING", source: "client" } });
assert.ok(pending.reason);
assert.ok(pending.timestamp);
assert.strictEqual(pending.service_id, "S1");
assert.strictEqual(pending.request_id, "R1");
assert.deepStrictEqual(pending.approval_context, { status: "PENDING", source: "client" });

const approved = approval.execute({ ...base, approval_context: { status: "APPROVED", approver: "client", source: "client" } });
assert.strictEqual(approved.decision, "APPROVED");
assert.strictEqual(approved.approval_context.approver, "client");

const rejected = approval.execute({ ...base, approval_context: { status: "REJECTED", source: "client" } });
assert.strictEqual(rejected.decision, "REJECTED");

// QA PASS alone never grants approval.
const noSignal = approval.execute({ ...base, approval_context: {} });
assert.strictEqual(noSignal.decision, "PENDING");
assert.notStrictEqual(noSignal.decision, "APPROVED");

// Explicit approval signal is required; arbitrary context cannot approve.
const arbitraryContext = approval.execute({ ...base, approval_context: { source: "client", note: "looks good" } });
assert.strictEqual(arbitraryContext.decision, "PENDING");

// Boundary: no delivery/revenue/external execution is owned here.
for (const action of ["DELIVER", "DELIVERY", "REVENUE_RECORD", "BOOKING_EXECUTION", "EXTERNAL_EXECUTION"]) {
    assert.throws(() => approval.execute({ ...base, action, approval_context: { status: "APPROVED" } }), /unsupported action/);
}
assert.strictEqual(typeof approval.decide, "function");
assert.notStrictEqual(typeof approval.deliver, "function");
assert.notStrictEqual(typeof approval.recordRevenue, "function");

console.log("CLIENT APPROVAL V1 TESTS: PASS");
