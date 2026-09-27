"use strict";

const assert = require("assert");
const OutcomePlannerV1 = require("./outcome-planner-v1");
const OutcomeReplanLoopV1 = require("./outcome-replan-loop-v1");

function buildGoal(current = 3) {
    return {
        goal_id: "GOAL_REPLAN_001",
        status: "ACTIVE",
        target: { metric: "clients_closed", value: 15 },
        progress: { current, target: 15, remaining: Math.max(0, 15 - current), percent: (current / 15) * 100 }
    };
}

function run() {
    const planner = new OutcomePlannerV1();
    const loop = new OutcomeReplanLoopV1({ planner });

    // 1. Remaining target creates a new planner-owned plan.
    {
        const goal = buildGoal(3);
        const result = loop.replan({
            goal,
            measurement: {
                goal_id: goal.goal_id,
                metric: "clients_closed",
                delta: 2,
                current: 5,
                target: 15,
                remaining: 10,
                percent: 33.3333333333,
                status: "ACTIVE"
            },
            execution_results: [
                { status: "COMPLETED" },
                { status: "BLOCKED" }
            ],
            next_stages: [
                { step_id: "REPLAN_DISCOVER", action: "DISCOVER_PROSPECTS", purpose: "Find additional prospects" },
                { step_id: "REPLAN_OUTREACH", action: "PREPARE_OUTREACH", purpose: "Prepare approved outreach" }
            ]
        });

        assert.strictEqual(result.replan_required, true);
        assert.strictEqual(result.reason, "TARGET_REMAINS");
        assert.strictEqual(result.plan.baseline.current, 3);
        assert.strictEqual(result.plan.baseline.remaining, 12);
        assert.strictEqual(result.plan.execution_policy.human_approval_required, true);
        assert.strictEqual(result.execution_summary.total, 2);
        assert.strictEqual(result.execution_summary.completed, 1);
        assert.strictEqual(result.execution_summary.blocked, 1);
    }

    // 2. Achieved goals stop the loop; no new plan is created.
    {
        const goal = buildGoal(15);
        goal.status = "ACHIEVED";
        const result = loop.replan({
            goal,
            measurement: {
                goal_id: goal.goal_id,
                metric: "clients_closed",
                delta: 15,
                current: 15,
                target: 15,
                remaining: 0,
                percent: 100,
                status: "ACHIEVED"
            },
            execution_results: [{ status: "COMPLETED" }],
            next_stages: [{ action: "SHOULD_NOT_BE_PLANNED" }]
        });

        assert.strictEqual(result.replan_required, false);
        assert.strictEqual(result.reason, "GOAL_ACHIEVED");
        assert.strictEqual(result.plan, null);
    }

    // 3. The loop rejects mismatched goal/measurement identity.
    {
        const goal = buildGoal(3);
        assert.throws(
            () => loop.replan({
                goal,
                measurement: { goal_id: "OTHER_GOAL", status: "ACTIVE" },
                execution_results: [],
                next_stages: [{ action: "DISCOVER_PROSPECTS" }]
            }),
            /REPLAN_GOAL_MISMATCH/
        );
    }

    // 4. The loop does not execute actions itself.
    assert.strictEqual(typeof loop.orchestrator, "undefined");

    console.log("Outcome Re-plan Loop V1 contract tests: PASS");
}

run();
