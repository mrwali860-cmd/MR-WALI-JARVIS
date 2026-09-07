"use strict";

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

test("Task Manager component contract", () => {
    const manager = new TaskManager();
    assert(manager.getInfo().id === "TASK_MANAGER", "Incorrect component ID");
    assert(manager.getInfo().status === "AVAILABLE", "Component should be AVAILABLE");
    assert(manager.healthCheck().healthy === true, "Component should be healthy");
});

test("Task can be created and retrieved", () => {
    const manager = new TaskManager();
    const result = manager.execute({
        action: "CREATE_TASK",
        task_id: "TASK_TEST_A",
        intent: "TEST",
        action_name: "EXECUTE",
        data: { service_id: "WHATSAPP_LEAD_AUTOMATION" }
    });
    assert(result.success === true, "Task creation failed");
    assert(manager.getTask("TASK_TEST_A").status === "CREATED", "Initial status incorrect");
});

test("Dependencies gate task readiness", () => {
    const manager = new TaskManager();
    manager.createTask({ task_id: "TASK_PARENT" });
    manager.createTask({ task_id: "TASK_CHILD", dependencies: ["TASK_PARENT"] });
    assert(manager.markReady("TASK_CHILD").status === "BLOCKED", "Incomplete dependency should block task");
    manager.completeTask("TASK_PARENT", { ok: true });
    assert(manager.markReady("TASK_CHILD").status === "READY", "Completed dependency should release task");
});

test("Lifecycle status transitions work", () => {
    const manager = new TaskManager();
    manager.createTask({ task_id: "TASK_LIFECYCLE" });
    manager.updateTaskStatus("TASK_LIFECYCLE", "RUNNING");
    manager.updateTaskStatus("TASK_LIFECYCLE", "WAITING_FOR_APPROVAL");
    manager.completeTask("TASK_LIFECYCLE", { delivered: true });
    assert(manager.getTask("TASK_LIFECYCLE").status === "COMPLETED", "Task should complete");
});

test("Unknown task is rejected", () => {
    const manager = new TaskManager();
    let blocked = false;
    try { manager.execute({ action: "COMPLETE_TASK", task_id: "UNKNOWN" }); } catch { blocked = true; }
    assert(blocked, "Unknown task should be rejected");
});

test("Summary works", () => {
    const manager = new TaskManager();
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
