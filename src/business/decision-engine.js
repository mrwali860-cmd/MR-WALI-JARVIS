"use strict";

const ComponentContract = require("../../contracts/component-contract");

/** Decision Engine V1: planning intent only; never executes work. */
class DecisionEngine extends ComponentContract {
    constructor() {
        super({ id: "DECISION_ENGINE", name: "JARVIS Decision Engine", version: "1.0.0", status: "AVAILABLE" });
    }

    decide(input = {}) {
        const goal = typeof input.goal === "string" ? input.goal.trim() : "";
        const options = Array.isArray(input.options)
            ? input.options.filter(option => typeof option === "string" && option.trim()).map(option => option.trim())
            : [];
        const decisionId = typeof input.decision_id === "string" && input.decision_id.trim()
            ? input.decision_id.trim()
            : null;

        if (!goal || !options.length) {
            return {
                decision_id: decisionId,
                decision: "CLARIFY",
                selected_action: null,
                rationale: "A non-empty goal and at least one candidate action are required.",
                goal
            };
        }

        return {
            decision_id: decisionId,
            decision: "PROCEED",
            selected_action: options[0],
            rationale: "Goal and candidate action set are valid; V1 selects the first supplied candidate deterministically.",
            goal
        };
    }

    execute(input = {}) {
        return this.decide(input);
    }
}

module.exports = DecisionEngine;
