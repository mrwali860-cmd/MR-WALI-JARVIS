"use strict";

const assert = require("assert");
const os = require("os");
const path = require("path");
const fs = require("fs");

const ServiceManager = require("./service-manager");
const TaskManager = require("./task-manager");
const Orchestrator = require("./orchestrator");
const RiskApprovalPolicy = require("./risk-approval-policy");
const { EcommerceOperationsAdapterV1 } = require("./ecommerce-operations-adapter-v1");

async function run() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "mrwali-ecommerce-orchestrator-"));
    const serviceManager = new ServiceManager({ storePath: path.join(root, "services.json") });
    const taskManager = new TaskManager({ storagePath: path.join(root, "tasks.json") });

    const calls = [];
    const provider = {
        async execute(payload) {
            calls.push(payload);
            return { provider: "mock-ecommerce", received: payload.input, executed: true };
        }
    };

    const adapter = new EcommerceOperationsAdapterV1({ provider });
    const orchestrator = new Orchestrator({
        serviceManager,
        taskManager,
        riskPolicy: new RiskApprovalPolicy(),
        executor: ({ action, request_id, service, task, input }) =>
            adapter.execute({
                action,
                request_id,
                service_id: service.service_id,
                task_id: task.task_id,
                input
            })
    });

    serviceManager.createService({
        service_id: "ECOMMERCE_TEST_SERVICE",
        client: "MR_WALI",
        requirement: "Controlled e-commerce operations"
    });

    taskManager.createTask({
        task_id: "ECOMMERCE_PRODUCT_RESEARCH_001",
        intent: "Research a product opportunity",
        action: "PRODUCT_RESEARCH",
        data: { marketplace: "SHOPIFY" }
    });

    taskManager.createTask({
        task_id: "ECOMMERCE_LISTING_PUBLISH_001",
        intent: "Publish an approved listing",
        action: "LISTING_PUBLISH"
    });

    serviceManager.createServicePlan({
        service_id: "ECOMMERCE_TEST_SERVICE",
        tasks: ["ECOMMERCE_PRODUCT_RESEARCH_001", "ECOMMERCE_LISTING_PUBLISH_001"]
    });

    const research = await orchestrator.executeTask({
        service_id: "ECOMMERCE_TEST_SERVICE",
        task_id: "ECOMMERCE_PRODUCT_RESEARCH_001",
        action: "EXECUTE_TASK",
        request_id: "ecom-test-research-001",
        input: { keyword: "test-product" }
    });

    assert.strictEqual(research.success, true);
    assert.strictEqual(research.status, "COMPLETED");
    assert.strictEqual(research.task.status, "COMPLETED");
    assert.strictEqual(calls[0].action, "PRODUCT_RESEARCH");
    assert.deepStrictEqual(calls[0].input, { keyword: "test-product" });
    assert.strictEqual(calls[0].service_id, "ECOMMERCE_TEST_SERVICE");
    assert.strictEqual(calls[0].task_id, "ECOMMERCE_PRODUCT_RESEARCH_001");

    const publish = await orchestrator.executeTask({
        service_id: "ECOMMERCE_TEST_SERVICE",
        task_id: "ECOMMERCE_LISTING_PUBLISH_001",
        action: "EXECUTE_TASK",
        request_id: "ecom-test-publish-001",
        input: { product_id: "TEST-001" }
    });

    assert.strictEqual(publish.success, false);
    assert.strictEqual(publish.status, "WAITING_FOR_APPROVAL");
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(publish.trace.events[publish.trace.events.length - 1].status, "WAITING_FOR_APPROVAL");

    const approvedPublish = await orchestrator.executeTask({
        service_id: "ECOMMERCE_TEST_SERVICE",
        task_id: "ECOMMERCE_LISTING_PUBLISH_001",
        action: "EXECUTE_TASK",
        request_id: "ecom-test-publish-002",
        approval_context: { approved: true, source: "TEST" },
        input: { product_id: "TEST-001" }
    });

    assert.strictEqual(approvedPublish.success, true);
    assert.strictEqual(approvedPublish.status, "COMPLETED");
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[1].action, "LISTING_PUBLISH");

    console.log("ecommerce orchestrator integration: PASS");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
