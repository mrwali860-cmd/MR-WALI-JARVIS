"use strict";

const assert = require("assert");
const Revenue = require("./revenue");

const base = {
    service_id: "SERVICE-001",
    request_id: "REQ-001",
    delivery_status: "DELIVERED",
    payment_status: "CONFIRMED",
    amount: 1000,
    currency: "USD",
    transaction_reference: "TXN-001"
};

const revenue = new Revenue();

const paid = revenue.execute(base);
assert.strictEqual(paid.revenue_status, "PAID");
assert.strictEqual(paid.decision, "RECORDED");
assert.ok(paid.timestamp);
assert.strictEqual(paid.transaction_reference, "TXN-001");

assert.strictEqual(revenue.record({ ...base, transaction_reference: "TXN-002", delivery_status: "PENDING" }).revenue_status, "PENDING");
assert.strictEqual(revenue.record({ ...base, transaction_reference: "TXN-003", delivery_status: "FAILED" }).revenue_status, "PENDING");
assert.strictEqual(revenue.record({ ...base, transaction_reference: "TXN-004", payment_status: "PENDING" }).revenue_status, "PENDING");
assert.strictEqual(revenue.record({ ...base, transaction_reference: "TXN-005", payment_status: "FAILED" }).revenue_status, "FAILED");
assert.strictEqual(revenue.record({ ...base, transaction_reference: "TXN-006", payment_status: "REFUNDED" }).revenue_status, "REFUNDED");
assert.strictEqual(revenue.record({ ...base, transaction_reference: "TXN-007", delivery_status: "DELIVERED", payment_status: "CONFIRMED" }).revenue_status, "PAID");
assert.strictEqual(revenue.record({ ...base, transaction_reference: "TXN-007" }).revenue_status, "FAILED");

for (const field of ["service_id", "request_id", "delivery_status", "payment_status", "amount", "currency", "transaction_reference"]) {
    const input = { ...base, transaction_reference: `MISSING-${field}` };
    delete input[field];
    assert.throws(() => revenue.record(input), /REVENUE:/);
}

assert.throws(() => revenue.record({ ...base, transaction_reference: "ZERO", amount: 0 }), /positive number/);
assert.throws(() => revenue.record({ ...base, transaction_reference: "NEG", amount: -1 }), /positive number/);
assert.throws(() => revenue.record({ ...base, transaction_reference: "NAN", amount: Number.NaN }), /positive number/);
assert.throws(() => revenue.record({ ...base, transaction_reference: "CUR", currency: "   " }), /currency/);
assert.throws(() => revenue.record({ ...base, transaction_reference: "   " }), /transaction_reference/);
assert.throws(() => revenue.execute({ ...base, transaction_reference: "UNSUPPORTED", action: "REFUND" }), /unsupported action/);

console.log("Revenue V1 tests: PASS");
