"use strict";

const ComponentContract = require("../../contracts/component-contract");

class OutcomePlannerV1 extends ComponentContract {
    constructor() {
        super({
            id: "OUTCOME_PLANNER_V1",
            name: "Outcome Planner",
            version: "1.0.0",
            status: "AVAILABLE"
        });
    }

    plan(input = {}) {
        const goal = input.goal && typeof input.goal === "object" ? input.goal : null;
        const target = goal?.target && typeof goal.target === "object" ? goal.target : null;
        const metric = String(target?.metric || "").trim();
        const targetValue = Number(target?.value);
        const currentValue = Number(goal?.progress?.current || 0);

        if (!goal?.goal_id) throw new Error("PLAN_GOAL_ID_REQUIRED");
        if (!metric || !Number.isFinite(targetValue) || targetValue <= 0) {
            throw new Error("PLAN_TARGET_INVALID");
        }

        const remaining = Math.max(0, targetValue - currentValue);
        const stages = Array.isArray(input.stages)
            ? input.stages.filter(stage => stage && typeof stage === "object")
            : [];

        if (!stages.length) throw new Error("PLAN_STAGES_REQUIRED");

        const steps = stages.map((stage, index) => {
            const action = String(stage.action || "").trim();
            if (!action) throw new Error("PLAN_ACTION_REQUIRED");
            return {
                step_id: String(stage.step_id || `PLAN_STEP_${index + 1}`),
                action,
                purpose: String(stage.purpose || "").trim(),
                depends_on: stage.depends_on || null,
                approval_required: stage.approval_required !== false
            };
        });

        return {
            plan_id: `PLAN_${goal.goal_id}`,
            goal_id: goal.goal_id,
            target: { metric, value: targetValue },
            baseline: { current: currentValue, remaining },
            steps,
            status: "READY",
            execution_policy: {
                human_approval_required: input.execution_policy?.human_approval_required !== false,
                no_guaranteed_outcomes: true
            }
        };
    }
}

module.exports = OutcomePlannerV1;
