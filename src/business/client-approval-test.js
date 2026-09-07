"use strict";

const assert = require("assert");
const ClientApproval = require("./client-approval");

const qa = new ClientApproval();

assert.deepStrictEqual(Object.keys(qa.getInfo()).sort(), ["id", "name", "status", "version"]);
assert.strictEqual(qa.getInfo().id, "CLIENT_APPROVAL");
assert.strictEqual(qa.getInfo().name, "Client Approval");
assert.strictEqual(qa.getInfo().status, "AVAILABLE");
assert.strictEqual(qa.healthCheck().healthy, true);

for (const field of ["service_id", "request_id", "qa_decision", "approval_context"]) {
    const input = {
        service_id: "S1",
        request_id: "R1",
        qa_decision: "PASS",
        approval_context: { status: "PENDING" }
    };
    delete input[field];
    assert.throws(() => qa.execute(input), /missing required fields/);
}

const base = {
    service_id: "S1",
    request_id: "R1",
    qa_decision: "PASS"
};

assert.strictEqual(qa.execute({ ...base, approval_context: { status: "PENDING" } }).decision, "PENDING");
assert.strictEqual(qa.execute({ ...base, approval_context: { status: "APPROVED", approver: "client" } }).decision, "APPROVED");
assert.strictEqual(qa.execute({ ...base, approval_context: { approved: true, source: "client" } }).decision, "APPROVED");
assert.strictEqual(qa.execute({ ...base, approval_context: { status: "REJECTED", source: "client" } }).decision, "REJECTED");
assert.strictEqual(qa.execute({ ...base, approval_context: { approved: false, source: "client" } }).decision, "REJECTED");

for (const qaDecision of ["FAIL", "REVIEW", "PENDING"]) {
    const result = qa.execute({ ...base, qa_decision: qaDecision, approval_context: { status: "APPROVED" } });
    assert.strictEqual(result.decision, "PENDING");
}

const pending = qa.execute({ ...base, approval_context: { status: "PENDING" } });
assert.ok(pending.reason);
assert.ok(pending.timestamp);
assert.strictEqual(pending.service_id, "S1");
assert.strictEqual(pending.request_id, "R1");
assert.deepStrictEqual(pending.approval_context, { status: "PENDING" });

const approved = qa.execute({ ...base, approval_context: { status: "APPROVED", approver: "client" } });
assert.strictEqual(approved.decision, "APPROVED");
assert.strictEqual(approved.approval_context.approver, "client");

assert.throws(() => qa.execute({ ...base, action: "DELIVER" }), /unsupported action/);

console.log("CLIENT APPROVAL TESTS PASSED");
