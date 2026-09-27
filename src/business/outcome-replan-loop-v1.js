"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * Outcome Re-plan Loop V1.
 *
 * Converts measured outcome state and execution evidence into the next
 * planner-approved plan. It never executes work and never invents a
 * guaranteed outcome.
 */
class OutcomeReplanLoopV1 extends ComponentContract {
    constructor({ planner } = {}) {
        super({
            id: "OUTCOME_REPLAN_LOOP_V1",
            name: "Outcome Re-plan Loop",
            version: "1.0.0",
            status: "AVAILABLE"
        });
        if (!planner || typeof planner.plan !== "function") {
            throw new Error("planner is required");
        }
        this.planner = planner;
    }

    validateInput({ goal, measurement, execution_results, next_stages } = {}) {
        if (!goal || typeof goal !== "object" || !goal.goal_id) {
            throw new Error("REPLAN_GOAL_REQUIRED");
        }
        if (!measurement || typeof measurement !== "object") {
            throw new Error("REPLAN_MEASUREMENT_REQUIRED");
        }
        if (measurement.goal_id !== goal.goal_id) {
            throw new Error("REPLAN_GOAL_MISMATCH");
        }
        if (!Array.isArray(execution_results)) {
            throw new Error("REPLAN_EXECUTION_RESULTS_REQUIRED");
        }
        if (!Array.isArray(next_stages) || !next_stages.length) {
            throw new Error("REPLAN_STAGES_REQUIRED");
        }
    }

    summarizeExecution(execution_results) {
        return execution_results.reduce((summary, result) => {
            const status = String(result?.status || "UNKNOWN");
            summary.total += 1;
            if (status === "COMPLETED") summary.completed += 1;
            if (status === "BLOCKED") summary.blocked += 1;
            if (status === "WAITING_FOR_APPROVAL") summary.waiting_for_approval += 1;
            if (status === "FAILED") summary.failed += 1;
            if (status === "UNSUPPORTED") summary.unsupported += 1;
            return summary;
        }, {
            total: 0,
            completed: 0,
            blocked: 0,
            waiting_for_approval: 0,
            failed: 0,
            unsupported: 0
        });
    }

    replan({ goal, measurement, execution_results = [], next_stages } = {}) {
        this.validateInput({ goal, measurement, execution_results, next_stages });

        if (measurement.status === "ACHIEVED" || goal.status === "ACHIEVED") {
            return {
                replan_required: false,
                reason: "GOAL_ACHIEVED",
                goal_id: goal.goal_id,
                measurement,
                execution_summary: this.summarizeExecution(execution_results),
                plan: null
            };
        }

        const plan = this.planner.plan({
            goal,
            stages: next_stages,
            execution_policy: {
                human_approval_required: true
            }
        });

        return {
            replan_required: true,
            reason: "TARGET_REMAINS",
            goal_id: goal.goal_id,
            measurement,
            execution_summary: this.summarizeExecution(execution_results),
            plan
        };
    }

    execute(input = {}) {
        return this.replan(input);
    }
}

module.exports = OutcomeReplanLoopV1;
