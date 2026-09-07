"use strict";

const assert = require("assert");
const ServiceManagerIntegration = require("./service-manager-integration");

const integration = new ServiceManagerIntegration();
const serviceId = `TEST_APPOINTMENT_${Date.now()}`;

function test(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
    } catch (error) {
        console.error(`FAILED: ${name}`);
        console.error(error.message);
        process.exitCode = 1;
    }
}

test("creates selected service and materializes all tasks", () => {
    const result = integration.createServicePlan({
        service_id: serviceId,
        client: "TEST_CLIENT",
        requirement: "Automate appointment booking"
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.task_count, 10);
    assert.strictEqual(result.execution_ready, true);
});

test("task dependency chain is deterministic", () => {
    const plan = integration.getExecutionPlan(serviceId);
    assert.strictEqual(plan.tasks.length, 10);

    for (let i = 0; i < plan.tasks.length; i += 1) {
        const dependencies = plan.tasks[i].dependencies;
        if (i === 0) {
            assert.deepStrictEqual(dependencies, []);
        } else {
            assert.deepStrictEqual(dependencies, [plan.tasks[i - 1].task_id]);
        }
    }
});

test("service owns the task IDs", () => {
    const service = integration.serviceManager.getService(serviceId);
    const tasks = integration.taskManager.listTasks();
    assert.strictEqual(service.tasks.length, 10);
    assert(service.tasks.every((id) => tasks.some((task) => task.task_id === id)));
});

test("execution plan is blocked when service is not READY", () => {
    integration.serviceManager.startService(serviceId);
    const plan = integration.getExecutionPlan(serviceId);
    assert.strictEqual(plan.execution_ready, false);
});

if (process.exitCode) process.exit(1);
