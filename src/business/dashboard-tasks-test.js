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

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mr-wali-dashboard-tasks-"));
const serviceStorePath = path.join(tempDir, "services.json");
const taskStorePath = path.join(tempDir, "tasks.json");

try {
    const serviceManager = new ServiceManager();
    serviceManager.storePath = serviceStorePath;
    serviceManager.services = new Map();

    const taskManager = new TaskManager({ storagePath: taskStorePath });
    const dashboard = new DashboardReadModel({ serviceManager, taskManager });

    taskManager.createTask({
        task_id: "DASHBOARD_TASK_1",
        intent: "Dashboard task contract",
        action: "TEST_ACTION",
        target: "DASHBOARD_SERVICE_1"
    });

    taskManager.createTask({
        task_id: "DASHBOARD_TASK_2",
        intent: "Dashboard blocked task",
        action: "TEST_ACTION",
        target: "DASHBOARD_SERVICE_1"
    });
    taskManager.addDependency("DASHBOARD_TASK_2", "DASHBOARD_TASK_1");
    taskManager.markReady("DASHBOARD_TASK_2");

    test("Dashboard tasks are a normalized read model", () => {
        const result = dashboard.getTasks();
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.control_surface, "READ_ONLY");
        assert.strictEqual(result.total, 2);
        assert.ok(result.by_status);
        assert.ok(Array.isArray(result.items));
        assert.strictEqual(result.items[0].task_id, "DASHBOARD_TASK_1");
    });

    test("Dashboard tasks reflect core task state and blockers", () => {
        const result = dashboard.getTasks();
        assert.strictEqual(result.by_status.CREATED, 1);
        assert.strictEqual(result.by_status.BLOCKED, 1);
        const blocked = result.items.find(task => task.task_id === "DASHBOARD_TASK_2");
        assert.strictEqual(blocked.status, "BLOCKED");
        assert.strictEqual(blocked.reason, "DEPENDENCIES_NOT_COMPLETE");
    });

    test("Dashboard task reads do not mutate core persistence", () => {
        const before = fs.readFileSync(taskStorePath, "utf8");
        dashboard.getTasks();
        assert.strictEqual(fs.readFileSync(taskStorePath, "utf8"), before);
        assert.strictEqual(taskManager.getTask("DASHBOARD_TASK_1").status, "CREATED");
        assert.strictEqual(taskManager.getTask("DASHBOARD_TASK_2").status, "BLOCKED");
    });

    test("Dashboard task surface does not redefine task lifecycle", () => {
        const result = dashboard.getTasks();
        const statuses = new Set(result.items.map(task => task.status));
        for (const status of statuses) assert.ok(taskManager.allowedStatuses.has(status));
        assert.strictEqual(result.actions_mutable, false);
    });
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("\n========================================");
console.log(" DASHBOARD V1 TASKS READ CONTRACT TEST");
console.log("========================================");
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed > 0) { console.log("RESULT: FAILED"); process.exit(1); }
console.log("RESULT: ALL TESTS PASSED");
console.log("========================================");
