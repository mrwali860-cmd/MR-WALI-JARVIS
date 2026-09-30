"use strict";

const assert = require("node:assert/strict");
const { getServiceContract } = require("./service-catalog");

const service = getServiceContract("ECOMMERCE_OPERATIONS_AUTOMATION");

assert.ok(service);
assert.equal(service.category, "ECOMMERCE_AUTOMATION");
assert.deepEqual(service.target_market, ["ECOMMERCE_STORES", "DTC_BRANDS", "ONLINE_SELLERS"]);
assert.equal(service.tasks.length, 11);
assert.equal(service.risk_controls.listing_publish, "APPROVAL_REQUIRED");
assert.equal(service.risk_controls.order_fulfillment, "APPROVAL_REQUIRED");
assert.equal(service.risk_controls.order_refund, "APPROVAL_REQUIRED");
assert.ok(service.success_metrics.includes("revenue"));
assert.ok(service.success_metrics.includes("contribution_margin"));

console.log("E-commerce service contract: PASS");
