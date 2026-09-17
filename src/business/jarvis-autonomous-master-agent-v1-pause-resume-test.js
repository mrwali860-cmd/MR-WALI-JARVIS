"use strict";

const assert = require("assert");
const JarvisAutonomousMasterAgentV1 = require("./jarvis-autonomous-master-agent-v1");

(async () => {
    const tasks = new Map([
        ["T1", { task_id: "T1", action: "LEAD_INTAKE", status: "CREATED", result: null }],
        ["T2", { task_id: "T2", action: "BOOKING_EXECUTION", status: "CREATED", result: null }],
        ["T3", { task_id: "T3", action: "CRM_RECORD", status: "CREATED", result: null }]
    ]);

    const calls = [];
    const taskManager = {
        getTask(taskId) { return tasks.get(taskId) || null; },
        areDependenciesComplete() { return true; },
        markReady(taskId) {
            const task = tasks.get(taskId);
            if (task && task.status === "CREATED") task.status = "READY";
        },
        retryTask() {}
    };

    const orchestrator = {
        async executeTask(input) {
            calls.push(input);
            const task = tasks.get(input.task_id);
            if (input.task_id === "T2" && input.approval_context.approved !== true) {
                task.status = "WAITING_FOR_APPROVAL";
                return { status: "WAITING_FOR_APPROVAL", reason: "APPROVAL_REQUIRED" };
            }
            task.status = "COMPLETED";
            task.result = { executed: true, task_id: input.task_id };
            return { status: "COMPLETED", result: task.result };
        }
    };

    const serviceIntegration = {
        createServicePlan() {
            return {
                service_id: "SERVICE_TEST",
                task_ids: ["T1", "T2", "T3"],
                task_count: 3,
                approval_gates: ["BOOKING_EXECUTION"],
                execution_ready: true
            };
        }
    };

    const agent = new JarvisAutonomousMasterAgentV1({ taskManager, orchestrator, serviceIntegration, maxRetries: 3 });

    const paused = await agent.executeGoal({ goal: "Pause and resume test", request_id: "PAUSE_RESUME_TEST" });
    assert.strictEqual(paused.status, "WAITING_FOR_APPROVAL");
    assert.strictEqual(paused.completed_tasks, 1);
    assert.strictEqual(calls.length, 2);
    assert.deepStrictEqual(calls.map((call) => call.task_id), ["T1", "T2"]);

    const resumed = await agent.resumeRun("PAUSE_RESUME_TEST", { approval_context: { approved: true } });
    assert.strictEqual(resumed.status, "COMPLETED");
    assert.strictEqual(resumed.completed_tasks, 3);
    assert.strictEqual(resumed.total_tasks, 3);
    assert.strictEqual(resumed.results.length, 3);
    assert.strictEqual(resumed.results[0].task_id, "T1");
    assert.strictEqual(resumed.results[0].resumed, true);
    assert.strictEqual(resumed.results[0].attempts, 0);
    assert.strictEqual(resumed.results[1].task_id, "T2");
    assert.strictEqual(resumed.results[1].status, "COMPLETED");
    assert.strictEqual(resumed.results[2].task_id, "T3");
    assert.strictEqual(resumed.results[2].status, "COMPLETED");
    assert.strictEqual(calls.length, 4);
    assert.deepStrictEqual(calls.map((call) => call.task_id), ["T1", "T2", "T2", "T3"]);

    console.log("JARVIS AUTONOMOUS MASTER AGENT V1.1 PAUSE/RESUME TEST: PASS");
})().catch((error) => {
    console.error("JARVIS AUTONOMOUS MASTER AGENT V1.1 PAUSE/RESUME TEST: FAIL");
    console.error(error);
    process.exit(1);
});
