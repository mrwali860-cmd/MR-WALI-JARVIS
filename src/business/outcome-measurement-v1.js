"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * Outcome Measurement V1.
 *
 * Converts structured execution evidence into measured KPI progress.
 * It only counts explicit, positive metric deltas from COMPLETED execution
 * results and delegates goal state mutation to GoalEngineV1.
 */
class OutcomeMeasurementV1 extends ComponentContract {
    constructor({ goalEngine } = {}) {
        super({
            id: "OUTCOME_MEASUREMENT_V1",
            name: "Outcome Measurement Engine",
            version: "1.0.0",
            status: "AVAILABLE"
        });
        if (!goalEngine || typeof goalEngine.get !== "function" || typeof goalEngine.recordProgress !== "function") {
            throw new Error("goalEngine is required");
        }
        this.goalEngine = goalEngine;
    }

    validateInput({ goal_id, request_id, execution_results } = {}) {
        const goalId = String(goal_id || "").trim();
        const requestId = String(request_id || "").trim();

        if (!goalId) throw new Error("goal_id is required");
        if (!requestId) throw new Error("request_id is required");
        if (!Array.isArray(execution_results)) throw new Error("execution_results must be an array");

        const goal = this.goalEngine.get(goalId);
        if (!goal) throw new Error("GOAL_NOT_FOUND");

        return { goalId, requestId, goal };
    }

    collectMetricDeltas(goal, executionResults) {
        const targetMetric = goal.target.metric;
        let delta = 0;
        const evidence = [];

        executionResults.forEach((result, resultIndex) => {
            if (!result || result.status !== "COMPLETED") return;

            const sourceRequestId = String(result.request_id || "").trim() || null;
            const metrics = Array.isArray(result.outcome_metrics) ? result.outcome_metrics : [];

            metrics.forEach((entry, metricIndex) => {
                if (!entry || String(entry.metric || "").trim() !== targetMetric) return;

                const value = Number(entry.value);
                if (!Number.isFinite(value) || value <= 0) {
                    throw new Error("MEASUREMENT_VALUE_INVALID");
                }

                delta += value;
                evidence.push({
                    evidence_id: String(entry.evidence_id || ("EXECUTION_" + (sourceRequestId || "UNKNOWN") + "_" + resultIndex + "_" + metricIndex)),
                    source_request_id: sourceRequestId,
                    metric: targetMetric,
                    value
                });
            });
        });

        return { delta, evidence };
    }

    async measure({ goal_id, request_id, execution_results = [] } = {}) {
        const { goalId, requestId, goal } = this.validateInput({
            goal_id,
            request_id,
            execution_results
        });

        const { delta, evidence } = this.collectMetricDeltas(goal, execution_results);
        let snapshot = goal;

        if (delta > 0) {
            snapshot = this.goalEngine.recordProgress(goalId, {
                metric: goal.target.metric,
                value: delta,
                evidence_id: "MEASUREMENT_" + requestId
            });
        }

        return {
            measurement_id: "MEASUREMENT_" + requestId,
            goal_id: goalId,
            request_id: requestId,
            metric: goal.target.metric,
            delta,
            current: snapshot.progress.current,
            target: snapshot.progress.target,
            remaining: snapshot.progress.remaining,
            percent: snapshot.progress.percent,
            status: snapshot.status,
            evidence
        };
    }

    execute(input = {}) {
        return this.measure(input);
    }
}

module.exports = OutcomeMeasurementV1;
