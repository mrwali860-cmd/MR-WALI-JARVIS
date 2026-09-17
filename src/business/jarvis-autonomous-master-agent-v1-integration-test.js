"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ServiceManager = require("./service-manager");
const TaskManager = require("./task-manager");
const ServiceManagerIntegration = require("./service-manager-integration");
const Orchestrator = require("./orchestrator");
const RealTaskExecutor = require("./real-task-executor");
const JarvisAutonomousMasterAgentV1 = require("./jarvis-autonomous-master-agent-v1");

(async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "jarvis-auto-v1-"));
    const serviceManager = new ServiceManager({ storePath: path.join(root, "services.json") });
    const taskManager = new TaskManager({ storagePath: path.join(root, "tasks.json") });
    const serviceIntegration = new ServiceManagerIntegration({ serviceManager, taskManager });

    const executor = new RealTaskExecutor({
        taskManager,
        prospectDiscovery: {
            async discover() {
                return {
                    executed: true,
                    status: "COMPLETE",
                    prospects: [{ id: "P1", name: "Dubai Test Agency", phone: "+971500000000", website: "https://example.com" }]
                };
            }
        }
    });

    const orchestrator = new Orchestrator({ serviceManager, taskManager, executor });
    const agent = new JarvisAutonomousMasterAgentV1({ serviceManager, taskManager, orchestrator, executor, serviceIntegration, maxRetries: 3 });

    const report = await agent.executeGoal({
        goal: "Run the real autonomous lead pipeline",
        client: "INTERNAL_TEST",
        request_id: "AUTO_REAL_PIPELINE_TEST",
        task_input: { LEAD_INTAKE: { query: "Dubai real estate", limit: 1 }, LEAD_QUALIFICATION: { required_contact: "phone_or_website" } }
    });

    assert.strictEqual(report.status, "FAILED");
    assert.strictEqual(report.total_tasks, 10);
    assert.strictEqual(report.completed_tasks, 4);
    assert.strictEqual(report.results.length, 5);
    assert.strictEqual(report.results[0].action, "LEAD_INTAKE");
    assert.strictEqual(report.results[0].status, "COMPLETED");
    assert.strictEqual(report.results[1].action, "LEAD_QUALIFICATION");
    assert.strictEqual(report.results[1].status, "COMPLETED");
    assert.strictEqual(report.results[2].action, "APPOINTMENT_REQUEST");
    assert.strictEqual(report.results[2].status, "COMPLETED");
    assert.strictEqual(report.results[3].action, "APPROVAL_GATE");
    assert.strictEqual(report.results[3].status, "COMPLETED");
    assert.strictEqual(report.results[4].action, "BOOKING_EXECUTION");
    assert.strictEqual(report.results[4].status, "FAILED");
    assert.match(report.results[4].error || "", /CALENDAR_PROVIDER_NOT_CONFIGURED|BOOKING_EXECUTION_APPROVAL_REQUIRED/);
    assert.strictEqual(report.recovery.length, 3);

    const bookingTask = taskManager.getTask(report.plan.task_ids[4]);
    assert.strictEqual(bookingTask.status, "FAILED");
    assert.strictEqual(Number(bookingTask.retry_count), 3);

    fs.rmSync(root, { recursive: true, force: true });
    console.log("JARVIS AUTONOMOUS MASTER AGENT V1 REAL PIPELINE TEST: PASS");
})().catch((error) => {
    console.error("JARVIS AUTONOMOUS MASTER AGENT V1 REAL PIPELINE TEST: FAIL");
    console.error(error);
    process.exit(1);
});
