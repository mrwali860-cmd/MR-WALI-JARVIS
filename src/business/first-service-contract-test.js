"use strict";

const assert = require("assert");
const { getFirstSellableService } = require("./first-service-contract");

function test(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
    } catch (error) {
        console.error(`FAILED: ${name}`);
        console.error(error.message);
        process.exitCode = 1;
    }
}

test("First sellable service is selected", () => {
    const service = getFirstSellableService();
    assert.strictEqual(service.service_id, "AI_APPOINTMENT_BOOKING_AUTOMATION");
    assert.strictEqual(service.status, "SELECTED");
});

test("Revenue score supports the selection", () => {
    const service = getFirstSellableService();
    assert.strictEqual(service.revenue_score.total, 32);
    assert(service.revenue_score.sellability >= 9);
    assert(service.revenue_score.roi_clarity >= 9);
    assert(service.revenue_score.delivery_speed >= 9);
});

test("Lifecycle is revenue complete", () => {
    const service = getFirstSellableService();
    assert.deepStrictEqual(service.lifecycle, [
        "CLIENT_REQUIREMENT",
        "SERVICE_CREATED",
        "SERVICE_PLAN",
        "TASKS_CREATED",
        "EXECUTION",
        "QA",
        "CLIENT_APPROVAL",
        "DELIVERY",
        "REVENUE"
    ]);
});

test("Risk gates protect external execution", () => {
    const service = getFirstSellableService();
    assert.strictEqual(service.risk_controls.external_message_send, "APPROVAL_REQUIRED");
    assert.strictEqual(service.risk_controls.appointment_booking, "APPROVAL_REQUIRED");
    assert.strictEqual(service.risk_controls.payment_or_money_movement, "APPROVAL_REQUIRED");
});

test("Delivery plan has ten required tasks", () => {
    const service = getFirstSellableService();
    assert.strictEqual(service.tasks.length, 10);
    assert.strictEqual(service.tasks.filter(task => task.required).length, 10);
});

if (process.exitCode) {
    process.exit(1);
}
