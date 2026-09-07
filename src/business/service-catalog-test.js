"use strict";

const assert = require("assert");
const {
    getServiceContract,
    listServiceContracts
} = require("./service-catalog");

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

test("WhatsApp Lead Automation contract exists", () => {
    const service = getServiceContract("WHATSAPP_LEAD_AUTOMATION");
    assert(service);
    assert.strictEqual(service.service_id, "WHATSAPP_LEAD_AUTOMATION");
    assert.strictEqual(service.category, "AI_AUTOMATION");
    assert.strictEqual(service.status, "READY");
});

test("Service contract contains revenue pipeline", () => {
    const service = getServiceContract("WHATSAPP_LEAD_AUTOMATION");
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

test("Service contract defines ten delivery tasks", () => {
    const service = getServiceContract("WHATSAPP_LEAD_AUTOMATION");
    assert.strictEqual(service.tasks.length, 10);
    assert.strictEqual(service.tasks.filter(task => task.required).length, 10);
    assert.strictEqual(service.tasks[0].task_type, "WHATSAPP_LEAD_INTAKE");
    assert.strictEqual(service.tasks[9].task_type, "REVENUE_RECORD");
});

test("Service contract defines safety gates", () => {
    const service = getServiceContract("WHATSAPP_LEAD_AUTOMATION");
    assert.strictEqual(service.risk_controls.external_message_send, "APPROVAL_REQUIRED");
    assert.strictEqual(service.risk_controls.appointment_booking, "APPROVAL_REQUIRED");
    assert.strictEqual(service.risk_controls.payment_or_money_movement, "APPROVAL_REQUIRED");
});

test("Unknown service contract is rejected cleanly", () => {
    assert.strictEqual(getServiceContract("UNKNOWN_SERVICE"), null);
});

test("Catalog lists the sellable service", () => {
    const services = listServiceContracts();
    assert(services.some(service => service.service_id === "WHATSAPP_LEAD_AUTOMATION"));
});

if (process.exitCode) {
    process.exit(1);
}
