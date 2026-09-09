"use strict";

const assert = require("assert");
const DashboardActionBoundary = require("./dashboard-actions");
const ServiceManagerIntegration = require("./service-manager-integration");
const Orchestrator = require("./orchestrator");
const RiskApprovalPolicy = require("./risk-approval-policy");

function test(name, fn) {
    try {
        fn();
        console.log(`PASS  ${name}`);
    } catch (error) {
        console.error(`FAIL  ${name}`);
        console.error(`      ${error.message}`);
        process.exitCode = 1;
    }
}

test("Dashboard action boundary exposes component contract", () => {
    const boundary = new DashboardActionBoundary({ orchestrator: {} });
    assert.strictEqual(boundary.getInfo().id, "DASHBOARD_ACTION_BOUNDARY");
    assert.strictEqual(boundary.healthCheck().status, "HEALTHY");
});

test("Invalid dashboard action is rejected", () => {
    const boundary = new DashboardActionBoundary({ orchestrator: {} });
    assert.throws(() => boundary.validateRequest({
        action: "DELETE_DATABASE",
        target: { service_id: "S1", task_id: "T1" },
        request_id: "req-1"
    }), /Unsupported dashboard action/);
});

test("Action request requires target and request identity", () => {
    const boundary = new DashboardActionBoundary({ orchestrator: {} });
    assert.throws(() => boundary.validateRequest({ action: "EXECUTE_TASK", request_id: "req-1" }), /target is required/);
    assert.throws(() => boundary.validateRequest({ action: "EXECUTE_TASK", target: {} }), /request_id is required/);
    assert.throws(() => boundary.validateRequest({ action: "EXECUTE_TASK", target: {}, request_id: "req-1" }), /target.service_id is required/);
});

test("Valid action request is normalized without owning persistence", () => {
    const boundary = new DashboardActionBoundary({ orchestrator: {} });
    const request = boundary.validateRequest({
        action: "EXECUTE_TASK",
        target: { service_id: "S1", task_id: "T1" },
        request_id: "req-42",
        reason: "operator request",
        input: { example: true }
    });
    assert.deepStrictEqual(request, {
        action: "EXECUTE_TASK",
        service_id: "S1",
        task_id: "T1",
        request_id: "req-42",
        approval_context: {},
        input: { example: true }
    });
});

(async () => {
    const calls = [];
    const boundary = new DashboardActionBoundary({
        orchestrator: {
            executeTask: async request => {
                calls.push(request);
                return { success: false, status: "BLOCKED", reason: "DEPENDENCIES_NOT_COMPLETE", trace: { request_id: request.request_id } };
            }
        }
    });
    const result = await boundary.execute({
        action: "EXECUTE_TASK",
        target: { service_id: "S1", task_id: "T1" },
        request_id: "req-99"
    });
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, "BLOCKED");
    assert.strictEqual(result.request_id, "req-99");
    assert.strictEqual(result.result.trace.request_id, "req-99");
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].request_id, "req-99");

    // Real boundary -> Orchestrator -> Task Manager -> Execution Trace integration.
    const integration = new ServiceManagerIntegration();
    const plan = integration.createServicePlan({ service_id: `DASH_E2E_${Date.now()}`, client: "Dashboard E2E", requirement: "Appointment automation" });
    const executorCalls = [];
    const orchestrator = new Orchestrator({
        serviceManager: integration.serviceManager,
        taskManager: integration.taskManager,
        riskPolicy: new RiskApprovalPolicy(),
        executor: async payload => {
            executorCalls.push(payload);
            return { executed_action: payload.action, request_id: payload.request_id };
        }
    });
    const realBoundary = new DashboardActionBoundary({ orchestrator });
    const requestId = `dashboard-trace-${Date.now()}`;
    const realResult = await realBoundary.execute({
        action: "EXECUTE_TASK",
        target: { service_id: plan.service_id, task_id: plan.task_ids[0] },
        request_id: requestId,
        input: { source: "dashboard" }
    });
    assert.strictEqual(realResult.success, true);
    assert.strictEqual(realResult.status, "COMPLETED");
    assert.strictEqual(realResult.request_id, requestId);
    assert.strictEqual(realResult.target.service_id, plan.service_id);
    assert.strictEqual(realResult.target.task_id, plan.task_ids[0]);
    assert.strictEqual(realResult.result.trace.request_id, requestId);
    assert.strictEqual(realResult.result.trace.service_id, plan.service_id);
    assert.strictEqual(realResult.result.trace.task_id, plan.task_ids[0]);
    assert.strictEqual(realResult.result.trace.action, "LEAD_INTAKE");
    assert.strictEqual(realResult.result.task.status, "COMPLETED");
    assert.deepStrictEqual(realResult.result.trace.events.map(event => event.status), ["STARTED", "RUNNING", "COMPLETED"]);
    assert.strictEqual(executorCalls.length, 1);
    assert.strictEqual(executorCalls[0].action, "LEAD_INTAKE");
    assert.strictEqual(executorCalls[0].request_id, requestId);

    const blockedRequestId = `dashboard-blocked-${Date.now()}`;
    const blockedResult = await realBoundary.execute({
        action: "EXECUTE_TASK",
        target: { service_id: plan.service_id, task_id: plan.task_ids[2] },
        request_id: blockedRequestId
    });
    assert.strictEqual(blockedResult.success, false);
    assert.strictEqual(blockedResult.status, "BLOCKED");
    assert.strictEqual(blockedResult.request_id, blockedRequestId);
    assert.strictEqual(blockedResult.result.trace.request_id, blockedRequestId);
    assert.strictEqual(blockedResult.result.trace.service_id, plan.service_id);
    assert.strictEqual(blockedResult.result.trace.task_id, plan.task_ids[2]);
    assert.deepStrictEqual(blockedResult.result.trace.events.map(event => event.status), ["STARTED", "BLOCKED"]);
    assert.strictEqual(integration.taskManager.getTask(plan.task_ids[2]).status, "BLOCKED");

    // Approval gate is also traceable through the Dashboard boundary.
    const approvalIntegration = new ServiceManagerIntegration();
    const approvalPlan = approvalIntegration.createServicePlan({ service_id: `DASH_APPROVAL_${Date.now()}`, client: "Dashboard Approval", requirement: "Booking approval trace" });
    // Complete prerequisite tasks in dependency order; task 4 is the approval-gated booking task.
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
        executor: async payload => ({ executed_action: payload.action })
    });
    const approvalBoundary = new DashboardActionBoundary({ orchestrator: approvalOrchestrator });
    const approvalRequestId = `dashboard-approval-${Date.now()}`;
    const approvalResult = await approvalBoundary.execute({
        action: "EXECUTE_TASK",
        target: { service_id: approvalPlan.service_id, task_id: approvalPlan.task_ids[4] },
        request_id: approvalRequestId
    });
    assert.strictEqual(approvalResult.success, false);
    assert.strictEqual(approvalResult.status, "WAITING_FOR_APPROVAL");
    assert.strictEqual(approvalResult.request_id, approvalRequestId);
    assert.strictEqual(approvalResult.result.trace.request_id, approvalRequestId);
    assert.strictEqual(approvalResult.result.trace.service_id, approvalPlan.service_id);
    assert.strictEqual(approvalResult.result.trace.task_id, approvalPlan.task_ids[4]);
    assert.deepStrictEqual(approvalResult.result.trace.events.map(event => event.status), ["STARTED", "WAITING_FOR_APPROVAL"]);
    assert.strictEqual(approvalIntegration.taskManager.getTask(approvalPlan.task_ids[4]).status, "WAITING_FOR_APPROVAL");

    // Dashboard cannot override the canonical action because it sends only EXECUTE_TASK.
    const directMismatch = await orchestrator.execute({
        service_id: plan.service_id,
        task_id: plan.task_ids[1],
        action: "WRONG_ACTION",
        request_id: `mismatch-${Date.now()}`
    }).catch(error => error);
    assert.match(directMismatch.message, /Action mismatch/);

    console.log("PASS  Dashboard → Orchestrator → Execution Trace end-to-end");
    console.log("Dashboard action boundary implementation tests: " + (process.exitCode ? "FAILED" : "PASS"));
})();
