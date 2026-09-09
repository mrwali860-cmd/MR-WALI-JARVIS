"use strict";

const assert = require("assert");
const QualityAssurance = require("./qa");
const DashboardReadModel = require("./dashboard-read-model");

const qa = new QualityAssurance();
const serviceManager = { listServices: () => [], getSummary: () => ({ by_status: {} }) };
const taskManager = { listTasks: () => [] };
const dashboard = new DashboardReadModel({ serviceManager, taskManager, qa });

function test(name, fn) {
    fn();
    console.log(`PASS  ${name}`);
}

test("Dashboard QA exposes existing QA component state read-only", () => {
    const result = dashboard.getQA();
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.control_surface, "READ_ONLY");
    assert.strictEqual(result.actions_mutable, false);
    assert.strictEqual(result.component.id, "QA");
    assert.strictEqual(result.component.name, "QUALITY_ASSURANCE");
    assert.strictEqual(result.component.status, "AVAILABLE");
    assert.strictEqual(result.health.healthy, true);
});

test("Dashboard QA does not execute or mutate QA state", () => {
    const before = JSON.stringify(qa.getInfo());
    dashboard.getQA();
    assert.strictEqual(JSON.stringify(qa.getInfo()), before);
});

console.log("DASHBOARD QA CONTRACT TEST: PASS");
