"use strict";

const assert = require("assert");
const { GoalEngineV1 } = require("./goal-engine-v1");
const OutcomePlannerV1 = require("./outcome-planner-v1");
const OutcomePlanExecutorV1 = require("./outcome-plan-executor-v1");
const OutcomeMeasurementV1 = require("./outcome-measurement-v1");
const OutcomeReplanLoopV1 = require("./outcome-replan-loop-v1");

/**
 * Real Outcome Test V1.
 *
 * Runs the complete outcome loop against real in-repository components:
 * Goal -> Plan -> Authorized Execution Boundary -> Measurement -> Re-plan.
 *
 * The execution provider is a deterministic test double. No external
 * service is contacted and no real-world action is performed.
 */
async function run() {
    const goalEngine = new GoalEngineV1();
    const planner = new OutcomePlannerV1();
    const calls = [];

    const orchestrator = {
        async executeTask(input) {
            calls.push(input);

            if (input.approval_context?.approved !== true) {
                return {
                    success: false,
                    status: "WAITING_FOR_APPROVAL",
                    reason: "APPROVAL_REQUIRED",
                    request_id: input.request_id
                };
            }

            return {
                success: true,
                status: "COMPLETED",
                request_id: input.request_id,
                outcome_metrics: [
                    {
                        metric: "clients_closed",
                        value: input.input?.clients_closed ?? 2,
                        evidence_id: "EVIDENCE_" + input.request_id
                    }
                ],
                trace: {
                    request_id: input.request_id,
                    status: "COMPLETED"
                }
            };
        }
    };

    const executor = new OutcomePlanExecutorV1({ orchestrator });
    const measurement = new OutcomeMeasurementV1({ goalEngine });
    const replan = new OutcomeReplanLoopV1({ planner });

    // 1. Create a real Goal Engine state.
    const goal = goalEngine.create({
        request_id: "REAL-OUTCOME-001",
        goal: "Close 5 Dubai real-estate clients today",
        target: { metric: "clients_closed", value: 5 },
        constraints: { human_approval_required: true }
    });

    // 2. Planner produces the first plan from the real goal state.
    const stages = [
        {
            step_id: "DISCOVER",
            action: "DISCOVER_PROSPECTS",
            purpose: "Find qualified prospects"
        },
        {
            step_id: "OUTREACH",
            action: "EXECUTE_APPROVED_OUTREACH",
            purpose: "Execute approved outreach"
        }
    ];

    const plan = planner.plan({ goal, stages });
    assert.strictEqual(plan.baseline.current, 0);
    assert.strictEqual(plan.baseline.remaining, 5);
    assert.strictEqual(plan.execution_policy.human_approval_required, true);

    // 3. Approval boundary blocks execution until explicit approval is supplied.
    const blocked = await executor.execute({
        plan,
        request_id: "REAL-EXEC-BLOCKED",
        step_mappings: {
            DISCOVER: {
                service_id: "SERVICE_PROSPECTS",
                task_id: "TASK_DISCOVERY"
            }
        }
    });

    assert.strictEqual(blocked.success, false);
    assert.strictEqual(blocked.status, "WAITING_FOR_APPROVAL");
    assert.strictEqual(blocked.stopped_at_step, "DISCOVER");

    // 4. Approved execution produces structured outcome evidence.
    const executed = await executor.execute({
        plan: {
            ...plan,
            steps: [plan.steps[1]]
        },
        request_id: "REAL-EXEC-001",
        step_mappings: {
            OUTREACH: {
                service_id: "SERVICE_OUTREACH",
                task_id: "TASK_APPROVED_OUTREACH"
            }
        },
        approval_context: {
            OUTREACH: { approved: true }
        },
        input_by_step: {
            OUTREACH: { clients_closed: 2 }
        }
    });

    assert.strictEqual(executed.success, true);
    assert.strictEqual(executed.status, "COMPLETED");
    assert.strictEqual(executed.results.length, 1);
    assert.strictEqual(executed.results[0].status, "COMPLETED");

    // 5. Measurement records only the explicit target KPI.
    const measured = await measurement.measure({
        goal_id: goal.goal_id,
        request_id: "REAL-MEASURE-001",
        execution_results: executed.results
    });

    assert.strictEqual(measured.metric, "clients_closed");
    assert.strictEqual(measured.delta, 2);
    assert.strictEqual(measured.current, 2);
    assert.strictEqual(measured.remaining, 3);
    assert.strictEqual(measured.status, "ACTIVE");
    assert.strictEqual(measured.evidence.length, 1);

    // 6. Re-plan uses the updated goal state and never executes work itself.
    const updatedGoal = goalEngine.get(goal.goal_id);
    const replanned = replan.replan({
        goal: updatedGoal,
        measurement: measured,
        execution_results: executed.results,
        next_stages: [
            {
                step_id: "REPLAN_OUTREACH",
                action: "EXECUTE_APPROVED_OUTREACH",
                purpose: "Continue approved outreach toward the remaining target"
            }
        ]
    });

    assert.strictEqual(replanned.replan_required, true);
    assert.strictEqual(replanned.reason, "TARGET_REMAINS");
    assert.strictEqual(replanned.plan.baseline.current, 2);
    assert.strictEqual(replanned.plan.baseline.remaining, 3);
    assert.strictEqual(replanned.plan.execution_policy.human_approval_required, true);

    // 7. A second approved execution can achieve the remaining target.
    const secondExecution = await executor.execute({
        plan: replanned.plan,
        request_id: "REAL-EXEC-002",
        step_mappings: {
            REPLAN_OUTREACH: {
                service_id: "SERVICE_OUTREACH",
                task_id: "TASK_APPROVED_OUTREACH"
            }
        },
        approval_context: {
            REPLAN_OUTREACH: { approved: true }
        },
        input_by_step: {
            REPLAN_OUTREACH: { clients_closed: 3 }
        }
    });

    const finalMeasurement = await measurement.measure({
        goal_id: goal.goal_id,
        request_id: "REAL-MEASURE-002",
        execution_results: secondExecution.results
    });

    const finalGoal = goalEngine.get(goal.goal_id);

    assert.strictEqual(secondExecution.status, "COMPLETED");
    assert.strictEqual(finalMeasurement.delta, 3);
    assert.strictEqual(finalMeasurement.current, 5);
    assert.strictEqual(finalMeasurement.remaining, 0);
    assert.strictEqual(finalMeasurement.percent, 100);
    assert.strictEqual(finalMeasurement.status, "ACHIEVED");
    assert.strictEqual(finalGoal.status, "ACHIEVED");
    assert.strictEqual(finalGoal.progress.current, 5);

    // 8. Verify the test exercised the real execution boundary and did not
    // call the external world directly.
    assert.strictEqual(calls.length, 3);
    assert.ok(calls.every(call => call.action === "EXECUTE_TASK"));
    assert.strictEqual(typeof replan.orchestrator, "undefined");

    console.log("REAL OUTCOME TEST V1: PASS");
    console.log("REAL_OUTCOME_PIPELINE_PASS");
}

run().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
