"use strict";

const assert = require("assert");
const ServiceManagerIntegration = require("./service-manager-integration");
const Orchestrator = require("./orchestrator");
const RiskApprovalPolicy = require("./risk-approval-policy");

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

async function asyncTest(name, fn) {
    try {
        await fn();
        console.log(`PASS: ${name}`);
    } catch (error) {
        console.error(`FAILED: ${name}`);
        console.error(error.message);
        process.exitCode = 1;
    }
}

(async () => {
    const integration = new ServiceManagerIntegration();
    const plan = integration.createServicePlan({
        service_id: `ORCH_TEST_${Date.now()}`,
        client: "Orchestrator Test Client",
        requirement: "Automate appointment booking"
    });

    const riskPolicy = new RiskApprovalPolicy();
    const orchestrator = new Orchestrator({
        serviceManager: integration.serviceManager,
        taskManager: integration.taskManager,
        riskPolicy,
        executor: async ({ task }) => ({ executed: task.action })
    });

    test("Orchestrator exposes component contract", () => {
        assert.strictEqual(orchestrator.getInfo().id, "ORCHESTRATOR");
        assert.strictEqual(orchestrator.healthCheck().healthy, true);
    });

    await asyncTest("First task executes when dependencies are complete", async () => {
        const taskId = plan.task_ids[0];
        const result = await orchestrator.execute({ service_id: plan.service_id, task_id: taskId, action: "LEAD_INTAKE", request_id: "req-001" });
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.status, "COMPLETED");
        assert.strictEqual(result.trace.request_id, "req-001");
        assert.deepStrictEqual(result.trace.events.map(event => event.status), ["STARTED", "RUNNING", "COMPLETED"]);
        assert.ok(result.trace.ended_at);
    });

    await asyncTest("Dependency gate blocks task and records trace", async () => {
        const result = await orchestrator.execute({ service_id: plan.service_id, task_id: plan.task_ids[2], action: "APPOINTMENT_REQUEST", request_id: "req-002" });
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.status, "BLOCKED");
        assert.deepStrictEqual(result.trace.events.map(event => event.status), ["STARTED", "BLOCKED"]);
        assert.strictEqual(result.trace.events[1].reason, "DEPENDENCIES_NOT_COMPLETE");
    });

    await asyncTest("Approval gate records WAITING_FOR_APPROVAL trace", async () => {
        const approvalTask = plan.task_ids[3];
        const bookingTask = plan.task_ids[4];
        integration.taskManager.markReady(plan.task_ids[1]);
        integration.taskManager.updateTaskStatus(plan.task_ids[1], "RUNNING");
        integration.taskManager.completeTask(plan.task_ids[1], { simulated: true });
        integration.taskManager.markReady(plan.task_ids[2]);
        integration.taskManager.updateTaskStatus(plan.task_ids[2], "RUNNING");
        integration.taskManager.completeTask(plan.task_ids[2], { simulated: true });
        integration.taskManager.markReady(approvalTask);
        integration.taskManager.updateTaskStatus(approvalTask, "RUNNING");
        integration.taskManager.completeTask(approvalTask, { approved: false });
        integration.taskManager.markReady(bookingTask);
        const result = await orchestrator.execute({ service_id: plan.service_id, task_id: bookingTask, action: "BOOKING_EXECUTION", request_id: "req-003" });
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.status, "WAITING_FOR_APPROVAL");
        assert.deepStrictEqual(result.trace.events.map(event => event.status), ["STARTED", "WAITING_FOR_APPROVAL"]);
        assert.strictEqual(result.trace.ended_at, null);
    });

    await asyncTest("Approved booking executes with complete trace", async () => {
        const result = await orchestrator.execute({ service_id: plan.service_id, task_id: plan.task_ids[4], action: "BOOKING_EXECUTION", request_id: "req-004", approval_context: { approved: true } });
        assert.strictEqual(result.success, true);
        assert.strictEqual(result.status, "COMPLETED");
        assert.deepStrictEqual(result.trace.events.map(event => event.status), ["STARTED", "RUNNING", "COMPLETED"]);
    });

    await asyncTest("Executor failure records FAILED trace", async () => {
        const failingIntegration = new ServiceManagerIntegration();
        const failingPlan = failingIntegration.createServicePlan({ service_id: `ORCH_FAIL_${Date.now()}`, client: "Failure Test Client", requirement: "Test execution failure" });
        const failingOrchestrator = new Orchestrator({ serviceManager: failingIntegration.serviceManager, taskManager: failingIntegration.taskManager, riskPolicy: new RiskApprovalPolicy(), executor: async () => { throw new Error("provider failure"); } });
        const result = await failingOrchestrator.execute({ service_id: failingPlan.service_id, task_id: failingPlan.task_ids[0], action: "LEAD_INTAKE", request_id: "req-005" });
        assert.strictEqual(result.success, false);
        assert.strictEqual(result.status, "FAILED");
        assert.strictEqual(result.task.status, "FAILED");
        assert.deepStrictEqual(result.trace.events.map(event => event.status), ["STARTED", "RUNNING", "FAILED"]);
        assert.ok(result.trace.ended_at);
    });

    await asyncTest("Orchestrator rejects reuse of request_id for a different task", async () => {
        await assert.rejects(
            orchestrator.execute({ service_id: plan.service_id, task_id: plan.task_ids[1], action: "LEAD_QUALIFICATION", request_id: "req-001" }),
            /request_id already bound/
        );
    });

    if (process.exitCode) process.exit(1);
})();
