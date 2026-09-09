"use strict";

const assert = require("assert");
const QualityAssurance = require("./qa");
const DashboardReadModel = require("./dashboard-read-model");

const qa = new QualityAssurance();
const serviceManager = { listServices: () => [], getSummary: () => ({ by_status: {} }) };
const taskManager = { listTasks: () => [] };
const dashboard = new DashboardReadModel({ serviceManager, taskManager });

const qaResult = qa.evaluate({
    service_id: "SERVICE-QA-1",
    task_id: "TASK-QA-1",
    request_id: "REQ-QA-1",
    expected_output: { type: "booking_record" },
    actual_output: { type: "booking_record" },
    acceptance_criteria: [{ name: "output_type", passed: true }],
    execution_status: "COMPLETED"
});

test("Dashboard QA is read-only", () => {
    const result = dashboard.getQA({ results: [qaResult] });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.control_surface, "READ_ONLY");
    assert.strictEqual(result.actions_mutable, false);
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.items[0].decision, "PASS");
});

test("Dashboard QA reflects PASS, FAIL and REVIEW decisions", () => {
    const fail = { ...qaResult, task_id: "TASK-QA-FAIL", decision: "FAIL", rework_required: true };
    const review = { ...qaResult, task_id: "TASK-QA-REVIEW", decision: "REVIEW" };
    const result = dashboard.getQA({ results: [qaResult, fail, review] });
    assert.deepStrictEqual(result.by_decision, { PASS: 1, FAIL: 1, REVIEW: 1 });
    assert.strictEqual(result.items[1].decision, "FAIL");
    assert.strictEqual(result.items[2].decision, "REVIEW");
});

test("Dashboard QA does not execute or mutate QA state", () => {
    const before = JSON.stringify(qaResult);
    dashboard.getQA({ results: [qaResult] });
    assert.strictEqual(JSON.stringify(qaResult), before);
});

function test(name, fn) {
    fn();
    console.log(`PASS  ${name}`);
}

console.log("DASHBOARD QA CONTRACT TEST: PASS");
