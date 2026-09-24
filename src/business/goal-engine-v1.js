"use strict";

const ComponentContract = require("../../contracts/component-contract");

const GOAL_STATUSES = Object.freeze({
    ACTIVE: "ACTIVE",
    ACHIEVED: "ACHIEVED",
    FAILED: "FAILED"
});

class GoalEngineV1 extends ComponentContract {
    constructor() {
        super({
            id: "OUTCOME_GOAL_ENGINE_V1",
            name: "Outcome Goal Engine",
            version: "1.0.0",
            status: "AVAILABLE"
        });
        this.goals = new Map();
    }

    create(input = {}) {
        const requestId = String(input.request_id || "").trim();
        const goalText = String(input.goal || "").trim();
        const metric = String(input.target?.metric || "").trim();
        const value = Number(input.target?.value);

        if (!requestId) throw new Error("GOAL_REQUEST_ID_REQUIRED");
        if (!goalText) throw new Error("GOAL_REQUIRED");
        if (!metric || !Number.isFinite(value) || value <= 0) {
            throw new Error("GOAL_TARGET_INVALID");
        }

        const goalId = `GOAL_${requestId}`;
        if (this.goals.has(goalId)) throw new Error("GOAL_ALREADY_EXISTS");

        const now = new Date().toISOString();
        const goal = {
            goal_id: goalId,
            request_id: requestId,
            goal: goalText,
            status: GOAL_STATUSES.ACTIVE,
            target: { metric, value },
            context: input.context || {},
            constraints: {
                human_approval_required: input.constraints?.human_approval_required !== false,
                no_guaranteed_outcomes: input.constraints?.no_guaranteed_outcomes !== false,
                ...(input.constraints || {})
            },
            progress: {
                current: 0,
                target: value,
                remaining: value,
                percent: 0
            },
            evidence: [],
            created_at: now,
            updated_at: now
        };

        this.goals.set(goalId, goal);
        return this.snapshot(goal);
    }

    recordProgress(goalId, input = {}) {
        const goal = this.goals.get(goalId);
        if (!goal) throw new Error("GOAL_NOT_FOUND");

        const metric = String(input.metric || "").trim();
        const value = Number(input.value);
        if (metric !== goal.target.metric) throw new Error("GOAL_METRIC_MISMATCH");
        if (!Number.isFinite(value) || value <= 0) throw new Error("GOAL_PROGRESS_INVALID");

        const previous = goal.progress.current;
        goal.progress.current = Math.min(goal.target.value, previous + value);
        goal.progress.remaining = Math.max(0, goal.target.value - goal.progress.current);
        goal.progress.percent = Math.round((goal.progress.current / goal.target.value) * 10000) / 100;
        goal.updated_at = new Date().toISOString();

        goal.evidence.push({
            evidence_id: String(input.evidence_id || `EVIDENCE_${goal.evidence.length + 1}`),
            metric,
            value: goal.progress.current - previous,
            recorded_at: goal.updated_at
        });

        if (goal.progress.current >= goal.target.value) {
            goal.status = GOAL_STATUSES.ACHIEVED;
        }

        return this.snapshot(goal);
    }

    markFailed(goalId, reason) {
        const goal = this.goals.get(goalId);
        if (!goal) throw new Error("GOAL_NOT_FOUND");
        if (goal.status === GOAL_STATUSES.ACHIEVED) throw new Error("GOAL_ALREADY_ACHIEVED");
        goal.status = GOAL_STATUSES.FAILED;
        goal.failure_reason = String(reason || "GOAL_FAILED");
        goal.updated_at = new Date().toISOString();
        return this.snapshot(goal);
    }

    get(goalId) {
        const goal = this.goals.get(goalId);
        return goal ? this.snapshot(goal) : null;
    }

    snapshot(goal) {
        return JSON.parse(JSON.stringify(goal));
    }
}

module.exports = { GoalEngineV1, GOAL_STATUSES };
