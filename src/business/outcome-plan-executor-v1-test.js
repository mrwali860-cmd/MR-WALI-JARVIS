"use strict";

const assert = require("assert");
const OutcomePlanExecutorV1 = require("./outcome-plan-executor-v1");

const calls = [];
const orchestrator = {
    async executeTask(input) {
        calls.push(input);
        if (input.task_id === "TASK_APPROVAL") {
            return {
                success: false,
                status: "WAITING_FOR_APPROVAL",
                reason: "APPROVAL_REQUIRED",
                trace: { request_id: input.request_id, status: "WAITING_FOR_APPROVAL" }
            };
        }
        return {
            success: true,
            status: "COMPLETED",
            result: { ok: true },
            trace: { request_id: input.request_id, status: "COMPLETED" }
        };
    }
};

const executor = new OutcomePlanExecutorV1({ orchestrator });

const plan = {
    plan_id: "PLAN_GOAL_001",
    goal_id: "GOAL_001",
    steps: [
        { step_id: "PLAN_STEP_1", action: "DISCOVER_PROSPECTS" },
        { step_id: "PLAN_STEP_2", action: "REQUEST_APPROVAL" },
        { step_id: "PLAN_STEP_3", action: "EXECUTE_APPROVED_OUTREACH" }
    ]
};

(async () => {
    const first = await executor.execute({
        plan,
        request_id: "EXEC_001",
        step_mappings: {
            PLAN_STEP_1: { service_id: "SERVICE_PROSPECTS", task_id: "TASK_DISCOVERY" },
            PLAN_STEP_2: { service_id: "SERVICE_OUTREACH", task_id: "TASK_APPROVAL" }
        }
    });

    assert.strictEqual(first.success, false);
    assert.strictEqual(first.status, "WAITING_FOR_APPROVAL");
    assert.strictEqual(first.stopped_at_step, "PLAN_STEP_2");
    assert.strictEqual(first.results.length, 2);
    assert.strictEqual(calls.length, 2);
    assert.strictEqual(calls[0].action, "EXECUTE_TASK");
    assert.strictEqual(calls[0].request_id, "EXEC_001_PLAN_STEP_1");
    assert.strictEqual(calls[1].request_id, "EXEC_001_PLAN_STEP_2");

    const unsupported = await executor.execute({
        plan: {
            ...plan,
            steps: [{ step_id: "PLAN_STEP_X", action: "UNKNOWN_PLANNER_ACTION" }]
        },
        request_id: "EXEC_002",
        step_mappings: {}
    });

    assert.strictEqual(unsupported.success, false);
    assert.strictEqual(unsupported.status, "UNSUPPORTED");
    assert.strictEqual(unsupported.results[0].reason, "PLAN_STEP_UNSUPPORTED");
    assert.strictEqual(calls.length, 2);

    await assert.rejects(
        () => executor.execute({ plan, step_mappings: {} }),
        /request_id is required/
    );

    console.log("OUTCOME PLAN EXECUTOR V1 CONTRACT TEST: PASS");
})();
