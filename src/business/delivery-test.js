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

assert.throws(
    () => delivery.execute({ ...base, delivery_payload: undefined }),
    /DELIVERY: missing required fields: delivery_payload/
);

for (const qaDecision of ["FAIL", "REVIEW", "PENDING"]) {
    const result = delivery.execute({ ...base, qa_decision: qaDecision });
    assert.strictEqual(result.decision, "BLOCKED");
    assert.strictEqual(result.delivery_status, "BLOCKED");
}

for (const approvalDecision of ["PENDING", "REJECTED"]) {
    const result = delivery.execute({ ...base, client_approval_decision: approvalDecision });
    assert.strictEqual(result.decision, "BLOCKED");
    assert.strictEqual(result.delivery_status, "BLOCKED");
}

const delivered = delivery.execute(base);
assert.strictEqual(delivered.decision, "DELIVERED");
assert.strictEqual(delivered.delivery_status, "DELIVERED");
assert.deepStrictEqual(delivered.delivery_payload, base.delivery_payload);
assert.strictEqual(delivered.service_id, base.service_id);
assert.strictEqual(delivered.request_id, base.request_id);
assert.strictEqual(typeof delivered.timestamp, "string");
assert.ok(delivered.timestamp.length > 0);

const failed = delivery.execute({
    ...base,
    delivery_context: { delivery_failed: true }
});
assert.strictEqual(failed.decision, "FAILED");
assert.strictEqual(failed.delivery_status, "FAILED");
assert.ok(failed.reason.includes("Delivery execution failed"));

assert.throws(
    () => delivery.execute({ ...base, action: "DELETE" }),
    /DELIVERY: unsupported action DELETE/
);

// Delivery must not turn QA PASS into approval.
const approvalPending = delivery.execute({
    ...base,
    client_approval_decision: "PENDING"
});
assert.strictEqual(approvalPending.decision, "BLOCKED");

console.log("Delivery V1 tests: PASS");
