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

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mr-wali-dashboard-"));
const serviceStorePath = path.join(tempDir, "services.json");
const taskStorePath = path.join(tempDir, "tasks.json");

try {
    const serviceManager = new ServiceManager();
    serviceManager.storePath = serviceStorePath;
    serviceManager.services = new Map();
    const taskManager = new TaskManager({ storagePath: taskStorePath });
    const dashboard = new DashboardReadModel({ serviceManager, taskManager });

    test("Dashboard status is a normalized read model", () => {
        const result = dashboard.getStatus();
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.name, "MR WALI JARVIS");
        assert.strictEqual(result.control_surface, "READ_ONLY");
        assert.ok(result.services);
        assert.ok(result.tasks);
    });

    test("Dashboard reads service and task state from core managers", () => {
        serviceManager.createService({ service_id: "DASHBOARD_SERVICE_1", client: "Dashboard Test Client", requirement: "Dashboard test requirement", revenue_amount: 5000, currency: "USD" });
        taskManager.createTask({ task_id: "DASHBOARD_TASK_1", intent: "Dashboard test task", action: "TEST_ACTION", target: "DASHBOARD_SERVICE_1" });
        const result = dashboard.getStatus();
        assert.strictEqual(result.services.total, 1);
        assert.strictEqual(result.tasks.total, 1);
        assert.strictEqual(result.services.items[0].service_id, "DASHBOARD_SERVICE_1");
        assert.strictEqual(result.tasks.items[0].task_id, "DASHBOARD_TASK_1");
    });

    test("Dashboard exposes lifecycle blockers without bypassing them", () => {
        const result = dashboard.getStatus();
        assert.ok(Array.isArray(result.blockers));
        assert.ok(result.tasks.by_status.CREATED >= 1);
        assert.strictEqual(result.actions_mutable, false);
    });

    test("Dashboard read model does not create a second persistence source", () => {
        const beforeServices = fs.readFileSync(serviceStorePath, "utf8");
        const beforeTasks = fs.readFileSync(taskStorePath, "utf8");
        dashboard.getStatus();
        assert.strictEqual(fs.readFileSync(serviceStorePath, "utf8"), beforeServices);
        assert.strictEqual(fs.readFileSync(taskStorePath, "utf8"), beforeTasks);
    });
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log("\n========================================");
console.log(" DASHBOARD V1 API READ MODEL TEST");
console.log("========================================");
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed > 0) { console.log("RESULT: FAILED"); process.exit(1); }
console.log("RESULT: ALL TESTS PASSED");
console.log("========================================");
