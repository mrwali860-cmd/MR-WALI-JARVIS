"use strict";

const assert = require("assert");
const DashboardActionBoundary = require("./dashboard-actions");
const ServiceManagerIntegration = require("./service-manager-integration");
const Orchestrator = require("./orchestrator");
const RiskApprovalPolicy = require("./risk-approval-policy");

async function run() {
    const integration = new ServiceManagerIntegration();
    const plan = integration.createServicePlan({
        service_id: `V5_CONTRACT_${Date.now()}`,
        client: "V5 Trace Contract",
        requirement: "End-to-end execution trace verification"
    });

    const executorCalls = [];
    const orchestrator = new Orchestrator({
        serviceManager: integration.serviceManager,
        taskManager: integration.taskManager,
        riskPolicy: new RiskApprovalPolicy(),
        executor: async payload => {
            executorCalls.push(payload);
            return { ok: true, action: payload.action };
        }
    });
    const boundary = new DashboardActionBoundary({ orchestrator });

    // 1. Valid Dashboard command delegates exactly once and preserves identity.
    const requestId = `v5-success-${Date.now()}`;
    const result = await boundary.execute({
        action: "EXECUTE_TASK",
        target: { service_id: plan.service_id, task_id: plan.task_ids[0] },
        request_id: requestId,
        input: { source: "v5-contract" }
    });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.status, "COMPLETED");
    assert.strictEqual(result.request_id, requestId);
    assert.strictEqual(result.result.trace.request_id, requestId);
    assert.strictEqual(result.result.trace.service_id, plan.service_id);
    assert.strictEqual(result.result.trace.task_id, plan.task_ids[0]);
    assert.strictEqual(result.result.trace.action, "LEAD_INTAKE");
    assert.strictEqual(result.result.task.status, "COMPLETED");
    assert.strictEqual(executorCalls.length, 1);
    assert.strictEqual(executorCalls[0].request_id, requestId);
    assert.strictEqual(executorCalls[0].action, "LEAD_INTAKE");

    // 2. Task Manager audit is part of the same request identity chain.
    const completedTask = integration.taskManager.getTask(plan.task_ids[0]);
    assert.ok(completedTask.audit.some(event => event.request_id === requestId));

    // 3. Dependency blocking preserves the same trace identity.
    const blockedRequestId = `v5-blocked-${Date.now()}`;
    const blocked = await boundary.execute({
        action: "EXECUTE_TASK",
        target: { service_id: plan.service_id, task_id: plan.task_ids[2] },
        request_id: blockedRequestId
    });
    assert.strictEqual(blocked.status, "BLOCKED");
    assert.strictEqual(blocked.request_id, blockedRequestId);
    assert.strictEqual(blocked.result.trace.request_id, blockedRequestId);
    assert.strictEqual(integration.taskManager.getTask(plan.task_ids[2]).status, "BLOCKED");

    // 4. Approval waiting preserves trace identity.
    const approvalIntegration = new ServiceManagerIntegration();
    const approvalPlan = approvalIntegration.createServicePlan({
        service_id: `V5_APPROVAL_${Date.now()}`,
        client: "V5 Approval Contract",
        requirement: "Approval trace verification"
    });
    for (const taskId of approvalPlan.task_ids.slice(0, 4)) {
        approvalIntegration.taskManager.markReady(taskId);
        approvalIntegration.taskManager.updateTaskStatus(taskId, "RUNNING");
        approvalIntegration.taskManager.completeTask(taskId, { simulated: true });
    }
    approvalIntegration.taskManager.markReady(approvalPlan.task_ids[4]);
    const approvalOrchestrator = new Orchestrator({
        serviceManager: approvalIntegration.serviceManager,
        taskManager: approvalIntegration.taskManager,
        riskPolicy: new RiskApprovalPolicy(),
        executor: async () => ({ ok: true })
    });
    const approvalBoundary = new DashboardActionBoundary({ orchestrator: approvalOrchestrator });
    const approvalRequestId = `v5-approval-${Date.now()}`;
    const waiting = await approvalBoundary.execute({
        action: "EXECUTE_TASK",
        target: { service_id: approvalPlan.service_id, task_id: approvalPlan.task_ids[4] },
        request_id: approvalRequestId
    });
    assert.strictEqual(waiting.status, "WAITING_FOR_APPROVAL");
    assert.strictEqual(waiting.request_id, approvalRequestId);
    assert.strictEqual(waiting.result.trace.request_id, approvalRequestId);
    assert.strictEqual(waiting.result.trace.ended_at, null);
    assert.strictEqual(approvalIntegration.taskManager.getTask(approvalPlan.task_ids[4]).status, "WAITING_FOR_APPROVAL");

    // 5. Executor failure preserves the same identity and authoritative FAILED task state.
    const failureIntegration = new ServiceManagerIntegration();
    const failurePlan = failureIntegration.createServicePlan({
        service_id: `V5_FAILURE_${Date.now()}`,
        client: "V5 Failure Contract",
        requirement: "Failure trace verification"
    });
    const failureOrchestrator = new Orchestrator({
        serviceManager: failureIntegration.serviceManager,
        taskManager: failureIntegration.taskManager,
        riskPolicy: new RiskApprovalPolicy(),
        executor: async () => { throw new Error("v5 provider failure"); }
    });
    const failureBoundary = new DashboardActionBoundary({ orchestrator: failureOrchestrator });
    const failureRequestId = `v5-failure-${Date.now()}`;
    const failed = await failureBoundary.execute({
        action: "EXECUTE_TASK",
        target: { service_id: failurePlan.service_id, task_id: failurePlan.task_ids[0] },
        request_id: failureRequestId
    });
    assert.strictEqual(failed.status, "FAILED");
    assert.strictEqual(failed.request_id, failureRequestId);
    assert.strictEqual(failed.result.trace.request_id, failureRequestId);
    assert.strictEqual(failed.result.task.status, "FAILED");
    assert.ok(failed.result.trace.ended_at);

    // 6. Dashboard cannot override the canonical task action.
    // The boundary deliberately normalizes EXECUTE_TASK and does not accept a
    // caller-supplied target.action; Orchestrator remains authoritative for the
    // canonical task action. A direct mismatched execution must still be rejected.
    const normalizedOverride = boundary.validateRequest({
        action: "EXECUTE_TASK",
        target: { service_id: plan.service_id, task_id: plan.task_ids[1], action: "WRONG_ACTION" },
        request_id: `v5-mismatch-${Date.now()}`
    });
    assert.strictEqual(normalizedOverride.action, "EXECUTE_TASK");
    assert.strictEqual(normalizedOverride.service_id, plan.service_id);
    assert.strictEqual(normalizedOverride.task_id, plan.task_ids[1]);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(normalizedOverride, "target"), false);

    assert.throws(
        () => orchestrator.validateRequest({
            service_id: plan.service_id,
            task_id: plan.task_ids[1],
            action: "WRONG_ACTION",
            request_id: `v5-direct-mismatch-${Date.now()}`
        }),
        /Action mismatch/
    );

    // 7. Trace retrieval uses the same request identity.
    const retrieved = orchestrator.getExecutionTrace(requestId);
    assert.strictEqual(retrieved.request_id, requestId);
    assert.strictEqual(retrieved.action, "LEAD_INTAKE");

    console.log("ACTION BOUNDARY → ORCHESTRATOR → EXECUTION TRACE V1 CONTRACT TEST: PASS");
}

run().catch(error => {
    console.error("ACTION BOUNDARY → ORCHESTRATOR → EXECUTION TRACE V1 CONTRACT TEST: FAIL");
    console.error(error.stack || error.message);
    process.exit(1);
});
