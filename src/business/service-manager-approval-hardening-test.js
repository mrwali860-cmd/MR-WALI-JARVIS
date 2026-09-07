"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const ServiceManager = require("./service-manager");

const storePath = path.join(process.cwd(), "data", "services.json");
const backupPath = `${storePath}.approval-hardening-test-backup`;

const hadStore = fs.existsSync(storePath);
if (hadStore) fs.copyFileSync(storePath, backupPath);

try {
    const manager = new ServiceManager();
    const serviceId = `APPROVAL_HARDENING_${Date.now()}`;

    manager.createService({
        service_id: serviceId,
        client: "Contract Test Client",
        requirement: "Approval hardening contract test"
    });

    let service = manager.getService(serviceId);
    assert.strictEqual(service.status, "DRAFT");

    // Missing QA must not approve or make delivery-ready.
    let blocked = manager.approveService(serviceId, {
        status: "APPROVED",
        source: "client"
    });
    assert.strictEqual(blocked.success, false);
    service = manager.getService(serviceId);
    assert.notStrictEqual(service.approval.status, "APPROVED");
    assert.notStrictEqual(service.status, "DELIVERED");

    // QA PASS alone must not approve.
    manager.completeQA(serviceId, true, { decision: "PASS" });
    blocked = manager.approveService(serviceId, {});
    assert.strictEqual(blocked.success, false);
    service = manager.getService(serviceId);
    assert.strictEqual(service.approval.status, "PENDING");
    assert.notStrictEqual(service.status, "DELIVERED");

    // Explicit rejection must remain blocked.
    blocked = manager.approveService(serviceId, {
        status: "REJECTED",
        source: "client"
    });
    assert.strictEqual(blocked.success, false);
    service = manager.getService(serviceId);
    assert.strictEqual(service.approval.status, "PENDING");
    assert.notStrictEqual(service.status, "DELIVERED");

    // Explicit approval with QA PASS is the only successful path.
    const approved = manager.approveService(serviceId, {
        status: "APPROVED",
        source: "client",
        request_id: "approval-hardening-test"
    });
    assert.strictEqual(approved.success, true);
    assert.strictEqual(approved.service.approval.status, "APPROVED");
    assert.strictEqual(approved.service.status, "DELIVERED");
    assert.ok(approved.service.approval.context);
    assert.strictEqual(approved.service.approval.context.source, "client");

    // execute() must use the same protected contract.
    const secondId = `APPROVAL_HARDENING_EXECUTE_${Date.now()}`;
    manager.createService({
        service_id: secondId,
        client: "Execute Contract Client",
        requirement: "Execute approval hardening test"
    });
    const executeBlocked = manager.execute({
        action: "APPROVE_SERVICE",
        service_id: secondId
    });
    assert.strictEqual(executeBlocked.success, false);
    assert.notStrictEqual(manager.getService(secondId).status, "DELIVERED");

    console.log("Service Manager approval hardening tests: PASS");
} finally {
    try {
        if (hadStore) {
            fs.copyFileSync(backupPath, storePath);
            fs.unlinkSync(backupPath);
        } else if (fs.existsSync(storePath)) {
            fs.unlinkSync(storePath);
        }
    } catch (error) {
        console.error("Approval hardening test cleanup failed:", error.message);
        process.exitCode = 1;
    }
}
