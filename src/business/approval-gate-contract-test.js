"use strict";

const assert = require("assert");
const ServiceManagerIntegration = require("./service-manager-integration");
const Orchestrator = require("./orchestrator");
const RiskApprovalPolicy = require("./risk-approval-policy");

function completeTask(taskManager, taskId, result) {
    taskManager.markReady(taskId);
    taskManager.updateTaskStatus(taskId, "RUNNING");
    taskManager.completeTask(taskId, result);
}

(async () => {
    const integration = new ServiceManagerIntegration();
    const plan = integration.createServicePlan({
        service_id: `APPROVAL_GATE_TEST_${Date.now()}`,
        client: "Approval Gate Test Client",
        requirement: "Verify approval-gated booking progression"
    });

    const executorCalls = [];
    const orchestrator = new Orchestrator({
        serviceManager: integration.serviceManager,
        taskManager: integration.taskManager,
        riskPolicy: new RiskApprovalPolicy(),
        executor: async ({ action, task, approval_context: approvalContext }) => {
            executorCalls.push({ action, task_id: task.task_id, approval_context: approvalContext });
            return { executed: action, contract_test: true };
        }
    });

    // Establish the prerequisite chain up to the approval gate.
    completeTask(integration.taskManager, plan.task_ids[0], { prospects: [] });
    completeTask(integration.taskManager, plan.task_ids[1], { qualified_leads: [] });
    completeTask(integration.taskManager, plan.task_ids[2], { appointment_requests: [] });

    const approvalGate = await orchestrator.execute({
        service_id: plan.service_id,
        task_id: plan.task_ids[3],
        action: "APPROVAL_GATE",
        request_id: "approval-gate-001"
    });

    assert.strictEqual(approvalGate.success, true);
    assert.strictEqual(approvalGate.status, "COMPLETED");
    assert.strictEqual(approvalGate.result.executed, "APPROVAL_GATE");

    const bookingTaskId = plan.task_ids[4];
    integration.taskManager.markReady(bookingTaskId);

    const waiting = await orchestrator.execute({
        service_id: plan.service_id,
        task_id: bookingTaskId,
        action: "BOOKING_EXECUTION",
        request_id: "booking-approval-001"
    });

    assert.strictEqual(waiting.success, false);
    assert.strictEqual(waiting.status, "WAITING_FOR_APPROVAL");
    assert.strictEqual(waiting.reason, "APPROVAL_REQUIRED");
    assert.strictEqual(waiting.trace.events[1].status, "WAITING_FOR_APPROVAL");
    assert.strictEqual(executorCalls.filter(call => call.action === "BOOKING_EXECUTION").length, 0);

    const approved = await orchestrator.execute({
        service_id: plan.service_id,
        task_id: bookingTaskId,
        action: "BOOKING_EXECUTION",
        request_id: "booking-approval-002",
        approval_context: { approved: true }
    });

    assert.strictEqual(approved.success, true);
    assert.strictEqual(approved.status, "COMPLETED");
    assert.strictEqual(approved.result.executed, "BOOKING_EXECUTION");
    assert.deepStrictEqual(approved.trace.events.map(event => event.status), ["STARTED", "RUNNING", "COMPLETED"]);
    assert.strictEqual(executorCalls.filter(call => call.action === "BOOKING_EXECUTION").length, 1);

    console.log("approval gate progression contract tests: PASS");
})();
