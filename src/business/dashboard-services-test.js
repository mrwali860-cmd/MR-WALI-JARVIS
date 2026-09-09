"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ServiceManager = require("./service-manager");
const TaskManager = require("./task-manager");
const DashboardReadModel = require("./dashboard-read-model");

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mr-wali-dashboard-services-"));
try {
    const serviceManager = new ServiceManager();
    serviceManager.storePath = path.join(tempDir, "services.json");
    serviceManager.services = new Map();
    const taskManager = new TaskManager({ storagePath: path.join(tempDir, "tasks.json") });
    const dashboard = new DashboardReadModel({ serviceManager, taskManager });

    const created = serviceManager.createService({
        service_id: "DASHBOARD_SERVICE_1",
        client: "Dashboard Test Client",
        requirement: "Dashboard services endpoint",
        revenue_amount: 5000,
        currency: "USD"
    });
    assert.strictEqual(created.success, true);

    const before = fs.readFileSync(serviceManager.storePath, "utf8");
    const result = dashboard.getServices();

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.control_surface, "READ_ONLY");
    assert.strictEqual(result.total, 1);
    assert.strictEqual(result.items[0].service_id, "DASHBOARD_SERVICE_1");
    assert.strictEqual(result.items[0].status, "DRAFT");
    assert.strictEqual(fs.readFileSync(serviceManager.storePath, "utf8"), before);

    console.log("PASS  Dashboard services read endpoint model");
    console.log("PASS  Dashboard services is read-only");
    console.log("RESULT: ALL TESTS PASSED");
} finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
