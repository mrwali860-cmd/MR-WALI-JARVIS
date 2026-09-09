"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ServiceManager = require("./service-manager");
const TaskManager = require("./task-manager");
const ServiceManagerIntegration = require("./service-manager-integration");
const Orchestrator = require("./orchestrator");
const RiskApprovalPolicy = require("./risk-approval-policy");
const QualityAssurance = require("./qa");
const ClientApproval = require("./client-approval");
const Delivery = require("./delivery");
const Revenue = require("./revenue");

(async () => {
    // E2E must never read or mutate repository-level persistent state.
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mr-wali-e2e-"));
    const serviceStorePath = path.join(tempDir, "services.json");
    const taskStorePath = path.join(tempDir, "tasks.json");

    try {
        const serviceManager = new ServiceManager();
        serviceManager.storePath = serviceStorePath;
        serviceManager.services = new Map();

        const taskManager = new TaskManager({ storagePath: taskStorePath });
        const integration = new ServiceManagerIntegration({ serviceManager, taskManager });
        const riskPolicy = new RiskApprovalPolicy();
        const qa = new QualityAssurance();
        const clientApproval = new ClientApproval();
        const delivery = new Delivery();
        const revenue = new Revenue();

        const serviceId = `E2E_${Date.now()}`;
        const requestId = `${serviceId}_REQUEST`;

        // SERVICE -> PLAN -> TASKS
        const plan = integration.createServicePlan({
            service_id: serviceId,
            client: "E2E Test Client",
            requirement: "AI appointment booking automation",
            revenue_amount: 5000,
            currency: "USD"
        });
        assert.strictEqual(plan.success, true);
        assert.strictEqual(plan.task_count, 10);

        const service = serviceManager.getService(serviceId);
        assert.strictEqual(service.status, "READY");
        assert.strictEqual(service.tasks.length, 10);

        const tasks = service.tasks.map((id) => taskManager.getTask(id));
        assert.ok(tasks.every(Boolean));
        for (let i = 1; i < tasks.length; i += 1) {
            assert.deepStrictEqual(tasks[i].dependencies, [tasks[i - 1].task_id]);
        }

        // ORCHESTRATOR -> RISK -> EXECUTION
        const orchestrator = new Orchestrator({
            serviceManager,
            taskManager,
            riskPolicy,
            executor: async ({ action, task_id }) => ({
                action,
                task_id,
                output: `completed:${action}`
            })
        });

        const riskWait = riskPolicy.evaluate({
            action: "BOOKING_EXECUTION",
            approval_context: {}
        });
        assert.strictEqual(riskWait.decision, "WAIT");

        for (const task of tasks.slice(0, 5)) {
            const result = await orchestrator.execute({
                service_id: serviceId,
                task_id: task.task_id,
                action: task.action,
                request_id: requestId,
                approval_context: task.action === "BOOKING_EXECUTION"
                    ? { status: "APPROVED", source: "E2E_TEST" }
                    : {}
            });
            assert.strictEqual(result.status, "COMPLETED");
        }
        assert.ok(tasks.slice(0, 5).every((task) => taskManager.getTask(task.task_id).status === "COMPLETED"));

        // QA -> CLIENT APPROVAL
        serviceManager.startQA(serviceId);
        const qaResult = qa.execute({
            action: "EVALUATE",
            service_id: serviceId,
            task_id: tasks[4].task_id,
            request_id: requestId,
            expected_output: { booking: "confirmed" },
            actual_output: { booking: "confirmed" },
            acceptance_criteria: [{ name: "booking-confirmed", passed: true }],
            execution_status: "COMPLETED"
        });
        assert.strictEqual(qaResult.decision, "PASS");
        serviceManager.completeQA(serviceId, true, qaResult);
        assert.strictEqual(serviceManager.getService(serviceId).qa.status, "PASSED");
        assert.strictEqual(serviceManager.getService(serviceId).status, "WAITING_FOR_APPROVAL");

        const approval = clientApproval.execute({
            action: "DECIDE",
            service_id: serviceId,
            request_id: requestId,
            qa_decision: qaResult.decision,
            approval_context: { status: "APPROVED", source: "E2E_TEST_CLIENT" }
        });
        assert.strictEqual(approval.decision, "APPROVED");

        // DELIVERY -> REVENUE
        const deliveryResult = delivery.execute({
            action: "DELIVER",
            service_id: serviceId,
            request_id: requestId,
            qa_decision: qaResult.decision,
            client_approval_decision: approval.decision,
            delivery_payload: { booking: "confirmed", crm_recorded: true }
        });
        assert.strictEqual(deliveryResult.delivery_status, "DELIVERED");

        // The service-level state is advanced only after the dedicated delivery gate passes.
        serviceManager.approveService(serviceId, { status: "APPROVED", source: "E2E_TEST_CLIENT" });
        serviceManager.completeDelivery(serviceId);
        assert.strictEqual(serviceManager.getService(serviceId).status, "COMPLETED");
        assert.strictEqual(serviceManager.getService(serviceId).delivery.status, "DELIVERED");

        const revenueResult = revenue.execute({
            action: "RECORD",
            service_id: serviceId,
            request_id: requestId,
            delivery_status: deliveryResult.delivery_status,
            payment_status: "CONFIRMED",
            amount: 5000,
            currency: "USD",
            transaction_reference: `${serviceId}_TXN`
        });
        assert.strictEqual(revenueResult.revenue_status, "PAID");
        assert.strictEqual(revenueResult.decision, "RECORDED");

        serviceManager.recordRevenue(serviceId, revenueResult.amount, revenueResult.currency);
        assert.strictEqual(serviceManager.getService(serviceId).revenue.status, "RECORDED");

        // Complete the remaining lifecycle tasks through the canonical state machine.
        for (let i = 5; i < tasks.length; i += 1) {
            taskManager.markReady(tasks[i].task_id);
            taskManager.updateTaskStatus(tasks[i].task_id, "RUNNING");
            taskManager.completeTask(tasks[i].task_id, {
                lifecycle_stage: tasks[i].action,
                ...(i === 6 ? qaResult : {}),
                ...(i === 7 ? approval : {}),
                ...(i === 8 ? deliveryResult : {}),
                ...(i === 9 ? revenueResult : {})
            });
        }
        assert.strictEqual(taskManager.getSummary().by_status.COMPLETED, 10);

        // Revenue must never be inferred from delivery alone.
        const unpaid = revenue.execute({
            action: "RECORD",
            service_id: serviceId,
            request_id: `${requestId}_UNPAID`,
            delivery_status: "DELIVERED",
            payment_status: "PENDING",
            amount: 5000,
            currency: "USD",
            transaction_reference: `${serviceId}_PENDING_TXN`
        });
        assert.strictEqual(unpaid.revenue_status, "PENDING");
        assert.strictEqual(unpaid.decision, "PENDING");

        console.log("End-to-end lifecycle tests: PASS");
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
})();
