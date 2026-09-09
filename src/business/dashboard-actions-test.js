"use strict";

const assert = require("assert");
const DashboardActionBoundary = require("./dashboard-actions");

function test(name, fn) {
    try {
        fn();
        console.log(`PASS  ${name}`);
    } catch (error) {
        console.error(`FAIL  ${name}`);
        console.error(`      ${error.message}`);
        process.exitCode = 1;
    }
}

test("Dashboard action boundary exposes component contract", () => {
    const boundary = new DashboardActionBoundary({ orchestrator: {} });
    assert.strictEqual(boundary.getInfo().id, "DASHBOARD_ACTION_BOUNDARY");
    assert.strictEqual(boundary.healthCheck().status, "HEALTHY");
});

test("Invalid dashboard action is rejected", () => {
    const boundary = new DashboardActionBoundary({ orchestrator: {} });
    assert.throws(() => boundary.validateRequest({
        action: "DELETE_DATABASE",
        target: { service_id: "S1", task_id: "T1" },
        request_id: "req-1"
    }), /Unsupported dashboard action/);
});

test("Action request requires target and request identity", () => {
    const boundary = new DashboardActionBoundary({ orchestrator: {} });
    assert.throws(() => boundary.validateRequest({ action: "EXECUTE_TASK", request_id: "req-1" }), /target is required/);
    assert.throws(() => boundary.validateRequest({ action: "EXECUTE_TASK", target: {} }), /request_id is required/);
    assert.throws(() => boundary.validateRequest({ action: "EXECUTE_TASK", target: {}, request_id: "req-1" }), /target.service_id is required/);
});

test("Valid action request is normalized without owning persistence", () => {
    const boundary = new DashboardActionBoundary({ orchestrator: {} });
    const request = boundary.validateRequest({
        action: "EXECUTE_TASK",
        target: { service_id: "S1", task_id: "T1" },
        request_id: "req-42",
        reason: "operator request",
        input: { example: true }
    });
    assert.deepStrictEqual(request, {
        action: "EXECUTE_TASK",
        service_id: "S1",
        task_id: "T1",
        request_id: "req-42",
        approval_context: {},
        input: { example: true }
    });
});

(async () => {
    const calls = [];
    const boundary = new DashboardActionBoundary({
        orchestrator: {
            executeTask: async request => {
                calls.push(request);
                return { success: false, status: "BLOCKED", reason: "DEPENDENCIES_NOT_COMPLETE" };
            }
        }
    });
    const result = await boundary.execute({
        action: "EXECUTE_TASK",
        target: { service_id: "S1", task_id: "T1" },
        request_id: "req-99"
    });
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, "BLOCKED");
    assert.strictEqual(result.request_id, "req-99");
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].request_id, "req-99");
    console.log("PASS  Dashboard action boundary preserves core blocked result and request ID");
    console.log("Dashboard action boundary implementation tests: " + (process.exitCode ? "FAILED" : "PASS"));
})();
