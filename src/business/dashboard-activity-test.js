"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ServiceManager = require("./service-manager");
const TaskManager = require("./task-manager");
const DashboardReadModel = require("./dashboard-read-model");

let passed = 0;
let failed = 0;

function test(name, fn) {
    try { fn(); console.log(`PASS  ${name}`); passed++; }
    catch (error) { console.error(`FAIL  ${name}`); console.error(`      ${error.message}`); failed++; }
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mr-wali-dashboard-activity-"));
const taskStorePath = path.join(tempDir, "tasks.json");

try {
    const serviceManager = new ServiceManager();
    const taskManager = new TaskManager({ storagePath: taskStorePath });
    const dashboard = new DashboardReadModel({ serviceManager, taskManager });

    taskManager.createTask({ task_id: "ACTIVITY_TASK_1", intent: "Activity contract", action: "TEST_ACTION" });
    taskManager.updateTaskStatus("ACTIVITY_TASK_1", "RUNNING", { request_id: "REQ-ACTIVITY-1" });
    taskManager.completeTask("ACTIVITY_TASK_1", { ok: true });

    test("Dashboard activity is normalized and read-only", () => {
        const result = dashboard.getActivity();
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.control_surface, "READ_ONLY");
        assert.strictEqual(result.actions_mutable, false);
        assert.ok(Array.isArray(result.items));
        assert.ok(result.total >= 3);
    });

    test("Dashboard activity reflects Task Manager audit history", () => {
        const result = dashboard.getActivity();
        const created = result.items.find(item => item.task_id === "ACTIVITY_TASK_1" && item.to === "CREATED");
        const running = result.items.find(item => item.task_id === "ACTIVITY_TASK_1" && item.to === "RUNNING");
        const completed = result.items.find(item => item.task_id === "ACTIVITY_TASK_1" && item.to === "COMPLETED");
        assert.ok(created);
        assert.ok(running);
        assert.ok(completed);
        assert.strictEqual(running.request_id, "REQ-ACTIVITY-1");
    });

    test("Dashboard activity does not create a second persistence source", () => {
        const before = fs.readFileSync(taskStorePath, "utf8");
        dashboard.getActivity();
        assert.strictEqual(fs.readFileSync(taskStorePath, "utf8"), before);
    });
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("\n========================================");
console.log(" DASHBOARD V1 ACTIVITY READ CONTRACT TEST");
console.log("========================================");
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed > 0) process.exit(1);
console.log("RESULT: ALL TESTS PASSED");
console.log("========================================");
