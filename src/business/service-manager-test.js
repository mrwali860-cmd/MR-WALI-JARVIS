"use strict";

const fs = require("fs");
const path = require("path");
const ServiceManager = require("./service-manager");

const TEST_SERVICE_ID = `SM_TEST_${Date.now()}`;

const TEST_STORE = path.join(
    process.cwd(),
    "data",
    "services.json"
);

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`PASS  ${name}`);
        passed++;
    } catch (error) {
        console.error(`FAIL  ${name}`);
        console.error(`      ${error.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

/*
 * TEST 1
 * Component contract
 */

test("Service Manager component contract", () => {
    const manager = new ServiceManager();
    const info = manager.getInfo();

    assert(
        info.id === "SERVICE_MANAGER",
        "Incorrect component ID"
    );

    assert(
        info.status === "AVAILABLE",
        "Component should be AVAILABLE"
    );

    assert(
        typeof manager.execute === "function",
        "execute() must be implemented"
    );

    const health = manager.healthCheck();

    assert(
        health.healthy === true,
        "Component should be healthy"
    );
});

/*
 * TEST 2
 * Create service
 */

test("Service can be created", () => {
    const manager = new ServiceManager();

    const result = manager.execute({
        action: "CREATE_SERVICE",
        service_id: TEST_SERVICE_ID,
        client: "TEST_CLIENT",
        requirement: "AI Lead Automation"
    });

    assert(
        result.success === true,
        "Service creation failed"
    );

    assert(
        result.service.service_id === TEST_SERVICE_ID,
        "Incorrect service ID"
    );

    assert(
        result.service.status === "DRAFT",
        "Initial status should be DRAFT"
    );
});

/*
 * TEST 3
 * Service plan
 */

test("Service plan can be created", () => {
    const manager = new ServiceManager();

    const result = manager.execute({
        action: "CREATE_SERVICE_PLAN",
        service_id: TEST_SERVICE_ID,
        tasks: [
            "TASK_DISCOVERY",
            "TASK_AUTOMATION",
            "TASK_QA"
        ]
    });

    assert(
        result.success === true,
        "Service plan failed"
    );

    assert(
        result.task_count === 3,
        "Expected 3 service tasks"
    );

    assert(
        manager.getService(TEST_SERVICE_ID).status === "READY",
        "Service should become READY"
    );
});

/*
 * TEST 4
 * Full lifecycle
 */

test("Service lifecycle completes", () => {
    const manager = new ServiceManager();

    manager.execute({
        action: "START_SERVICE",
        service_id: TEST_SERVICE_ID
    });

    manager.execute({
        action: "START_QA",
        service_id: TEST_SERVICE_ID
    });

    const qa = manager.execute({
        action: "COMPLETE_QA",
        service_id: TEST_SERVICE_ID,
        passed: true,
        result: "PASS"
    });

    assert(
        qa.success === true,
        "QA should pass"
    );

    assert(
        qa.service.status === "WAITING_FOR_APPROVAL",
        "Service should wait for approval"
    );

    const approval = manager.execute({
        action: "APPROVE_SERVICE",
        service_id: TEST_SERVICE_ID,
        approval_context: {
            status: "APPROVED",
            approved: true,
            source: "SERVICE_MANAGER_TEST",
            request_id: `${TEST_SERVICE_ID}_APPROVAL`
        }
    });

    assert(
        approval.success === true,
        "Approval failed"
    );

    assert(
        approval.service.approval.status === "APPROVED",
        "Approval should be recorded as APPROVED"
    );

    assert(
        approval.service.status === "WAITING_FOR_APPROVAL",
        "Approval should not mark service DELIVERED"
    );

    assert(
        approval.service.delivery.status === "READY",
        "Delivery should become READY after approval"
    );

    const delivery = manager.execute({
        action: "COMPLETE_DELIVERY",
        service_id: TEST_SERVICE_ID
    });

    assert(
        delivery.success === true,
        "Delivery failed"
    );

    assert(
        delivery.service.status === "COMPLETED",
        "Service should be COMPLETED"
    );
});

/*
 * TEST 5
 * Revenue
 */

test("Revenue can be recorded", () => {
    const manager = new ServiceManager();

    const result = manager.execute({
        action: "RECORD_REVENUE",
        service_id: TEST_SERVICE_ID,
        amount: 5000,
        currency: "USD"
    });

    assert(
        result.success === true,
        "Revenue recording failed"
    );

    assert(
        result.revenue.amount === 5000,
        "Revenue amount incorrect"
    );

    assert(
        result.revenue.currency === "USD",
        "Revenue currency incorrect"
    );
});

/*
 * TEST 6
 * Persistence across instances
 */

test("Service persists across instances", () => {
    const manager = new ServiceManager();

    const service = manager.getService(
        TEST_SERVICE_ID
    );

    assert(
        service !== null,
        "Service missing from persistent store"
    );

    assert(
        service.status === "COMPLETED",
        "Persisted service status incorrect"
    );

    assert(
        service.revenue.status === "RECORDED",
        "Persisted revenue missing"
    );

    const secondManager = new ServiceManager();

    const restored =
        secondManager.getService(TEST_SERVICE_ID);

    assert(
        restored !== null,
        "Service was not restored"
    );

    assert(
        restored.service_id === TEST_SERVICE_ID,
        "Restored service ID incorrect"
    );
});

/*
 * TEST 7
 * Invalid service
 */

test("Unknown service is rejected", () => {
    const manager = new ServiceManager();

    let blocked = false;

    try {
        manager.execute({
            action: "START_SERVICE",
            service_id: "SM_UNKNOWN"
        });
    } catch {
        blocked = true;
    }

    assert(
        blocked,
        "Unknown service should be rejected"
    );
});

/*
 * TEST 8
 * Summary
 */

test("Service summary works", () => {
    const manager = new ServiceManager();

    const summary = manager.execute({
        action: "GET_SUMMARY"
    });

    assert(
        summary.success === true,
        "Summary failed"
    );

    assert(
        summary.total >= 1,
        "Summary should contain service"
    );
});

/*
 * FINAL RESULT
 */

console.log("");
console.log("========================================");
console.log(" SERVICE MANAGER V1 CONTRACT TEST");
console.log("========================================");

console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);

if (failed > 0) {
    console.log("RESULT: FAILED");
    process.exit(1);
}

console.log("RESULT: ALL TESTS PASSED");
console.log("========================================");

