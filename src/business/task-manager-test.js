"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const TaskManager = require("./task-manager");

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
    if (!condition) throw new Error(message);
}

function tempStorage(name) {
    return path.join(os.tmpdir(), `jarvis-task-manager-${name}-${process.pid}.json`);
}

test("Task Manager component contract", () => {
    const manager = new TaskManager({ storagePath: tempStorage("contract") });
    assert(manager.getInfo().id === "TASK_MANAGER", "Incorrect component ID");
    assert(manager.getInfo().status === "AVAILABLE", "Component should be AVAILABLE");
    assert(manager.healthCheck().healthy === true, "Component should be healthy");
});

test("Task can be created and retrieved", () => {
    const storagePath = tempStorage("create");
    const manager = new TaskManager({ storagePath });
    const result = manager.execute({
        action: "CREATE_TASK",
        task_id: "TASK_TEST_A",
        intent: "TEST",
        action_name: "EXECUTE",
        data: { service_id: "WHATSAPP_LEAD_AUTOMATION" }
    });
    assert(result.success === true, "Task creation failed");
    assert(manager.getTask("TASK_TEST_A").status === "CREATED", "Initial status incorrect");
    assert(manager.getTask("TASK_TEST_A").audit.length === 1, "Creation audit missing");
    assert(fs.existsSync(storagePath), "Task storage file was not created");
});

test("Dependencies gate task readiness", () => {
    const manager = new TaskManager({ storagePath: tempStorage("dependency") });
    manager.createTask({ task_id: "TASK_PARENT" });
    manager.createTask({ task_id: "TASK_CHILD", dependencies: ["TASK_PARENT"] });
    assert(manager.markReady("TASK_CHILD").status === "BLOCKED", "Incomplete dependency should block task");
    assert(manager.getTask("TASK_CHILD").audit.at(-1).reason === "DEPENDENCIES_NOT_COMPLETE", "Block reason missing");
    manager.markReady("TASK_PARENT");
    manager.updateTaskStatus("TASK_PARENT", "RUNNING");
    manager.completeTask("TASK_PARENT", { ok: true });
    assert(manager.markReady("TASK_CHILD").status === "READY", "Completed dependency should release task");
});

test("Canonical lifecycle transitions work", () => {
    const manager = new TaskManager({ storagePath: tempStorage("lifecycle") });
    manager.createTask({ task_id: "TASK_LIFECYCLE" });
    manager.updateTaskStatus("TASK_LIFECYCLE", "RUNNING");
    manager.updateTaskStatus("TASK_LIFECYCLE", "WAITING_FOR_APPROVAL");
    manager.updateTaskStatus("TASK_LIFECYCLE", "READY");
    manager.updateTaskStatus("TASK_LIFECYCLE", "RUNNING");
    manager.completeTask("TASK_LIFECYCLE", { delivered: true });
    assert(manager.getTask("TASK_LIFECYCLE").status === "COMPLETED", "Task should complete");
});

test("Invalid state transition is rejected", () => {
    const manager = new TaskManager({ storagePath: tempStorage("invalid-transition") });
    manager.createTask({ task_id: "TASK_INVALID" });
    let blocked = false;
    try {
        manager.updateTaskStatus("TASK_INVALID", "COMPLETED");
    } catch {
        blocked = true;
    }
    assert(blocked, "Invalid transition should be rejected");
    assert(manager.getTask("TASK_INVALID").status === "CREATED", "Rejected transition must not mutate state");
});

test("Unknown task is rejected", () => {
    const manager = new TaskManager({ storagePath: tempStorage("unknown") });
    let blocked = false;
    try { manager.execute({ action: "COMPLETE_TASK", task_id: "UNKNOWN" }); } catch { blocked = true; }
    assert(blocked, "Unknown task should be rejected");
});

test("Task persists and reloads with audit history", () => {
    const storagePath = tempStorage("persistence");
    const first = new TaskManager({ storagePath });
    first.createTask({ task_id: "TASK_PERSISTED" });
    first.updateTaskStatus("TASK_PERSISTED", "READY");
    first.updateTaskStatus("TASK_PERSISTED", "RUNNING", { request_id: "REQ-1" });

    const second = new TaskManager({ storagePath });
    const task = second.getTask("TASK_PERSISTED");
    assert(task !== null, "Persisted task was not reloaded");
    assert(task.status === "RUNNING", "Persisted task status incorrect");
    assert(task.audit.length === 3, "Audit history did not persist");
    assert(task.audit.at(-1).to === "RUNNING", "Latest audit transition incorrect");
});

test("Summary works", () => {
    const manager = new TaskManager({ storagePath: tempStorage("summary") });
    manager.createTask({ task_id: "TASK_SUMMARY" });
    const summary = manager.execute({ action: "GET_SUMMARY" });
    assert(summary.success === true, "Summary failed");
    assert(summary.total === 1, "Summary total incorrect");
});

console.log("");
console.log("========================================");
console.log(" TASK MANAGER V1 CONTRACT TEST");
console.log("========================================");
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed > 0) process.exit(1);
console.log("RESULT: ALL TESTS PASSED");
console.log("========================================");
