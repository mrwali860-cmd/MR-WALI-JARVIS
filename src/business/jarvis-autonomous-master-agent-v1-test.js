"use strict";

const assert = require("assert");
const JarvisAutonomousMasterAgentV1 = require("./jarvis-autonomous-master-agent-v1");

(async () => {
    const tasks = new Map();
    const calls = [];
    const failures = new Set(["T1"]);

    const taskManager = {
        getTask(id) { return tasks.get(id) || null; },
        areDependenciesComplete(id) { return (tasks.get(id)?.dependencies || []).every(dep => tasks.get(dep)?.status === "COMPLETED"); },
        markReady(id) { const task = tasks.get(id); task.status = "READY"; return task; },
        retryTask(id, metadata) { const task = tasks.get(id); task.status = "READY"; task.retry_count = (task.retry_count || 0) + 1; Object.assign(task, metadata); return task; }
    };

    tasks.set("T1", { task_id: "T1", action: "LEAD_INTAKE", dependencies: [], status: "CREATED" });
    tasks.set("T2", { task_id: "T2", action: "LEAD_QUALIFICATION", dependencies: ["T1"], status: "CREATED" });

    const serviceIntegration = {
        createServicePlan() {
            return {
                success: true,
                service_id: "AUTO_SERVICE",
                task_ids: ["T1", "T2"],
                task_count: 2,
                approval_gates: {},
                execution_ready: true
            };
        }
    };

    const orchestrator = {
        async executeTask(input) {
            calls.push(input);
            const task = tasks.get(input.task_id);
            if (input.task_id === "T1" && failures.has("T1")) {
                failures.delete("T1");
                task.status = "FAILED";
                return { success: false, status: "FAILED", error: "TRANSIENT_TEST_FAILURE" };
            }
            task.status = "COMPLETED";
            task.result = { ok: true, action: task.action };
            return { success: true, status: "COMPLETED", result: task.result };
        }
    };

    const agent = new JarvisAutonomousMasterAgentV1({ taskManager, orchestrator, serviceIntegration, maxRetries: 3 });
    const report = await agent.executeGoal({ goal: "Run autonomous benchmark", request_id: "AUTO_TEST" });

    assert.strictEqual(report.status, "COMPLETED");
    assert.strictEqual(report.completed_tasks, 2);
    assert.strictEqual(report.total_tasks, 2);
    assert.strictEqual(report.recovery.length, 1);
    assert.strictEqual(tasks.get("T1").retry_count, 1);
    assert.strictEqual(calls.length, 3);
    assert.strictEqual(agent.getRun("AUTO_TEST").status, "COMPLETED");

    const intelligenceProvider = {
        async plan(input) {
            assert.strictEqual(input.goal, "Intelligent benchmark");
            assert.ok(input.available_actions.includes("LEAD_INTAKE"));
            return {
                goal: input.goal,
                summary: "validated intelligent plan",
                steps: [{ action: "LEAD_INTAKE", purpose: "start pipeline", input: {}, requires_approval: false }]
            };
        }
    };
    const intelligentAgent = new JarvisAutonomousMasterAgentV1({
        taskManager: {
            getTask(id) { return tasks.get(id) || null; },
            areDependenciesComplete() { return true; },
            markReady(id) { tasks.get(id).status = "READY"; return tasks.get(id); },
            retryTask(id) { tasks.get(id).status = "READY"; return tasks.get(id); }
        },
        orchestrator,
        serviceIntegration: {
            createServicePlan() {
                return { service_id: "AUTO_SERVICE_2", task_ids: ["T1"], task_count: 1, approval_gates: {}, execution_ready: true };
            }
        },
        intelligenceProvider
    });
    tasks.get("T1").status = "CREATED";
    const intelligentPlan = await intelligentAgent.createIntelligentPlan({ goal: "Intelligent benchmark" });
    assert.strictEqual(intelligentPlan.intelligence.steps[0].action, "LEAD_INTAKE");
    assert.deepStrictEqual(intelligentPlan.task_ids, ["T1"]);

    const invalidProvider = {
        async plan() {
            return {
                goal: "Invalid benchmark",
                summary: "invalid",
                steps: [{ action: "NOT_ALLOWED", purpose: "bypass", input: {}, requires_approval: false }]
            };
        }
    };
    const invalidAgent = new JarvisAutonomousMasterAgentV1({
        taskManager: {
            getTask(id) { return tasks.get(id) || null; }
        },
        orchestrator,
        serviceIntegration,
        intelligenceProvider: invalidProvider
    });
    await assert.rejects(
        () => invalidAgent.createIntelligentPlan({ goal: "Invalid benchmark" }),
        /INTELLIGENCE_ACTION_NOT_ALLOWED/
    );

    console.log("JARVIS AUTONOMOUS MASTER AGENT V1 TEST: PASS");
})();
