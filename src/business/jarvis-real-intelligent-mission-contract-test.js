"use strict";

const assert = require("assert");
const JarvisAutonomousMasterAgentV1 = require("./jarvis-autonomous-master-agent-v1");

(async () => {
    const tasks = new Map([
        ["T1", { task_id: "T1", action: "LEAD_INTAKE", dependencies: [], status: "CREATED" }],
        ["T2", { task_id: "T2", action: "LEAD_QUALIFICATION", dependencies: ["T1"], status: "CREATED" }]
    ]);

    const taskManager = {
        getTask(id) { return tasks.get(id) || null; },
        areDependenciesComplete(id) {
            return (tasks.get(id)?.dependencies || []).every(dep => tasks.get(dep)?.status === "COMPLETED");
        },
        markReady(id) { tasks.get(id).status = "READY"; return tasks.get(id); }
    };

    const serviceIntegration = {
        createServicePlan() {
            return {
                service_id: "INTELLIGENT_CONTRACT_SERVICE",
                task_ids: ["T1", "T2"],
                task_count: 2,
                approval_gates: {},
                execution_ready: true
            };
        }
    };

    const provider = {
        async plan(input) {
            assert.strictEqual(input.goal, "Discover and qualify Dubai prospects");
            assert.deepStrictEqual(input.available_actions, ["LEAD_INTAKE", "LEAD_QUALIFICATION"]);
            return {
                goal: input.goal,
                summary: "Discover first, then qualify.",
                steps: [
                    { action: "LEAD_INTAKE", purpose: "Discover prospects", input: { data: { value: "real estate agency Dubai" } }, requires_approval: false },
                    { action: "LEAD_QUALIFICATION", purpose: "Qualify discovered prospects", input: { data: { value: "phone_or_website" } }, requires_approval: false }
                ]
            };
        }
    };

    const agent = new JarvisAutonomousMasterAgentV1({
        taskManager,
        serviceIntegration,
        intelligenceProvider: provider,
        orchestrator: { executeTask: async () => ({ status: "COMPLETED", result: { ok: true } }) }
    });

    const plan = await agent.createIntelligentPlan({ goal: "Discover and qualify Dubai prospects" });

    assert.strictEqual(plan.task_ids[0], "T1");
    assert.strictEqual(plan.task_ids[1], "T2");
    assert.strictEqual(plan.intelligence.steps.length, 2);
    assert.strictEqual(plan.intelligence.steps[0].action, "LEAD_INTAKE");
    assert.strictEqual(plan.intelligence.steps[1].action, "LEAD_QUALIFICATION");

    console.log("REAL INTELLIGENT MISSION CONTRACT TEST: PASS");
})();
