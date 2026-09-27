"use strict";

const assert = require("assert");
const { GoalEngineV1 } = require("./goal-engine-v1");
const OutcomeMeasurementV1 = require("./outcome-measurement-v1");

function buildGoalEngine() {
    const goalEngine = new GoalEngineV1();
    const goal = goalEngine.create({
        request_id: "REQ-MEASURE-001",
        goal: "Close 15 Dubai real-estate clients today",
        target: { metric: "clients_closed", value: 15 }
    });
    return { goalEngine, goal };
}

async function run() {
    // 1. Contract: required input.
    {
        const { goalEngine, goal } = buildGoalEngine();
        const measurement = new OutcomeMeasurementV1({ goalEngine });
        await assert.rejects(
            () => measurement.measure({ goal_id: goal.goal_id, execution_results: [] }),
            /request_id is required/
        );
    }

    // 2. Only completed execution evidence for the target metric counts.
    {
        const { goalEngine, goal } = buildGoalEngine();
        const measurement = new OutcomeMeasurementV1({ goalEngine });
        const result = await measurement.measure({
            goal_id: goal.goal_id,
            request_id: "REQ-MEASURE-001",
            execution_results: [
                {
                    request_id: "REQ-STEP-1",
                    status: "COMPLETED",
                    outcome_metrics: [
                        { metric: "clients_closed", value: 2, evidence_id: "EVIDENCE-CLOSE-2" },
                        { metric: "replies", value: 8, evidence_id: "EVIDENCE-REPLIES-8" }
                    ]
                },
                {
                    request_id: "REQ-STEP-2",
                    status: "FAILED",
                    outcome_metrics: [
                        { metric: "clients_closed", value: 99, evidence_id: "EVIDENCE-IGNORED" }
                    ]
                }
            ]
        });

        assert.strictEqual(result.metric, "clients_closed");
        assert.strictEqual(result.delta, 2);
        assert.strictEqual(result.current, 2);
        assert.strictEqual(result.target, 15);
        assert.strictEqual(result.remaining, 13);
        assert.strictEqual(result.status, "ACTIVE");
        assert.deepStrictEqual(result.evidence, [{
            evidence_id: "EVIDENCE-CLOSE-2",
            source_request_id: "REQ-STEP-1",
            metric: "clients_closed",
            value: 2
        }]);
    }

    // 3. Multiple completed results accumulate as deltas and can achieve the goal.
    {
        const { goalEngine, goal } = buildGoalEngine();
        const measurement = new OutcomeMeasurementV1({ goalEngine });
        const result = await measurement.measure({
            goal_id: goal.goal_id,
            request_id: "REQ-MEASURE-002",
            execution_results: [
                {
                    request_id: "REQ-STEP-A",
                    status: "COMPLETED",
                    outcome_metrics: [{ metric: "clients_closed", value: 7 }]
                },
                {
                    request_id: "REQ-STEP-B",
                    status: "COMPLETED",
                    outcome_metrics: [{ metric: "clients_closed", value: 8 }]
                }
            ]
        });

        assert.strictEqual(result.delta, 15);
        assert.strictEqual(result.current, 15);
        assert.strictEqual(result.remaining, 0);
        assert.strictEqual(result.percent, 100);
        assert.strictEqual(result.status, "ACHIEVED");
        assert.strictEqual(goalEngine.get(goal.goal_id).status, "ACHIEVED");
    }

    // 4. Target metric mismatch is ignored, not converted into false progress.
    {
        const { goalEngine, goal } = buildGoalEngine();
        const measurement = new OutcomeMeasurementV1({ goalEngine });
        const result = await measurement.measure({
            goal_id: goal.goal_id,
            request_id: "REQ-MEASURE-003",
            execution_results: [
                {
                    request_id: "REQ-STEP-C",
                    status: "COMPLETED",
                    outcome_metrics: [{ metric: "meetings_booked", value: 5 }]
                }
            ]
        });

        assert.strictEqual(result.delta, 0);
        assert.strictEqual(result.current, 0);
        assert.strictEqual(result.remaining, 15);
        assert.strictEqual(result.status, "ACTIVE");
        assert.deepStrictEqual(result.evidence, []);
    }

    // 5. Invalid metric values are rejected.
    {
        const { goalEngine, goal } = buildGoalEngine();
        const measurement = new OutcomeMeasurementV1({ goalEngine });
        await assert.rejects(
            () => measurement.measure({
                goal_id: goal.goal_id,
                request_id: "REQ-MEASURE-004",
                execution_results: [{
                    request_id: "REQ-STEP-D",
                    status: "COMPLETED",
                    outcome_metrics: [{ metric: "clients_closed", value: -1 }]
                }]
            }),
            /MEASUREMENT_VALUE_INVALID/
        );
    }

    // 6. No execution results means no fabricated progress.
    {
        const { goalEngine, goal } = buildGoalEngine();
        const measurement = new OutcomeMeasurementV1({ goalEngine });
        const result = await measurement.measure({
            goal_id: goal.goal_id,
            request_id: "REQ-MEASURE-005",
            execution_results: []
        });

        assert.strictEqual(result.delta, 0);
        assert.strictEqual(result.current, 0);
        assert.strictEqual(result.remaining, 15);
        assert.strictEqual(result.status, "ACTIVE");
    }

    console.log("Outcome Measurement V1 contract tests: PASS");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
