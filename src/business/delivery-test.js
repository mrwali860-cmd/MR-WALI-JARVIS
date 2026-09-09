"use strict";

const assert = require("assert");
const Delivery = require("./delivery");

const delivery = new Delivery();
const base = {
    service_id: "SERVICE-001",
    request_id: "REQ-001",
    qa_decision: "PASS",
    client_approval_decision: "APPROVED",
    delivery_payload: { artifact: "approved-output" }
};

assert.deepStrictEqual(delivery.getInfo(), {
    id: "DELIVERY",
    name: "Delivery",
    version: "1.0.0",
    status: "AVAILABLE"
});
assert.strictEqual(delivery.healthCheck().healthy, true);

// Required-field contract.
for (const field of ["service_id", "request_id", "qa_decision", "client_approval_decision", "delivery_payload"]) {
    assert.throws(
        () => delivery.execute({ ...base, [field]: undefined }),
        /DELIVERY: missing required fields:/
    );
}

// Both upstream gates are mandatory.
for (const qaDecision of ["FAIL", "REVIEW", "PENDING", "UNKNOWN"]) {
    const result = delivery.execute({ ...base, qa_decision: qaDecision });
    assert.strictEqual(result.decision, "BLOCKED");
    assert.strictEqual(result.delivery_status, "BLOCKED");
    assert.match(result.reason, /QA PASS/);
}

for (const approvalDecision of ["PENDING", "REJECTED", "UNKNOWN"]) {
    const result = delivery.execute({ ...base, client_approval_decision: approvalDecision });
    assert.strictEqual(result.decision, "BLOCKED");
    assert.strictEqual(result.delivery_status, "BLOCKED");
    assert.match(result.reason, /client approval/);
}

// Only the canonical delivery action is executable.
assert.throws(
    () => delivery.execute({ ...base, action: "DELETE" }),
    /DELIVERY: unsupported action DELETE/
);
for (const action of ["QA", "CLIENT_APPROVAL", "REVENUE", "BOOKING_EXECUTION"]) {
    assert.throws(() => delivery.execute({ ...base, action }), /DELIVERY: unsupported action/);
}

// Successful delivery preserves execution identity and payload.
const delivered = delivery.execute(base);
assert.strictEqual(delivered.decision, "DELIVERED");
assert.strictEqual(delivered.delivery_status, "DELIVERED");
assert.deepStrictEqual(delivered.delivery_payload, base.delivery_payload);
assert.strictEqual(delivered.service_id, base.service_id);
assert.strictEqual(delivered.request_id, base.request_id);
assert.match(delivered.reason, /QA PASS and client approval/);
assert.ok(typeof delivered.timestamp === "string" && delivered.timestamp.length > 0);

// Delivery failure is terminal for this execution and must not become DELIVERED.
const failed = delivery.execute({
    ...base,
    delivery_context: { delivery_failed: true }
});
assert.strictEqual(failed.decision, "FAILED");
assert.strictEqual(failed.delivery_status, "FAILED");
assert.match(failed.reason, /Delivery execution failed/);
assert.strictEqual(failed.request_id, base.request_id);

// QA PASS alone can never authorize delivery.
const approvalPending = delivery.execute({ ...base, client_approval_decision: "PENDING" });
assert.strictEqual(approvalPending.decision, "BLOCKED");

// Explicit client approval is the only accepted approval state.
const approvedCaseInsensitive = delivery.execute({ ...base, client_approval_decision: "approved" });
assert.strictEqual(approvedCaseInsensitive.decision, "DELIVERED");
const qaCaseInsensitive = delivery.execute({ ...base, qa_decision: "pass" });
assert.strictEqual(qaCaseInsensitive.decision, "DELIVERED");

// Delivery owns delivery output only; it does not expose downstream revenue APIs.
assert.strictEqual(typeof delivery.deliver, "function");
assert.strictEqual(typeof delivery.execute, "function");
assert.notStrictEqual(typeof delivery.recordRevenue, "function");
assert.notStrictEqual(typeof delivery.approve, "function");

console.log("Delivery V1 tests: PASS");
