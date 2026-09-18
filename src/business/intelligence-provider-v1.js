"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * JARVIS Intelligence Provider V1.
 *
 * Model-agnostic boundary between JARVIS execution control and an AI model.
 * The provider may call an external model, but it never executes business
 * actions, bypasses approvals, or changes task state.
 */
class JarvisIntelligenceProviderV1 extends ComponentContract {
    constructor(config = {}) {
        super({
            id: "JARVIS_INTELLIGENCE_PROVIDER_V1",
            name: "JARVIS Intelligence Provider",
            version: "1.0.0",
            status: "AVAILABLE",
            ...config
        });
        this.model = config.model || null;
        this.generate = typeof config.generate === "function" ? config.generate : null;
    }

    async plan(input = {}) {
        const goal = String(input.goal || "").trim();
        if (!goal) throw new Error("GOAL_REQUIRED");

        if (!this.generate) {
            throw new Error("INTELLIGENCE_PROVIDER_NOT_CONFIGURED");
        }

        const raw = await this.generate({
            operation: "PLAN",
            goal,
            context: input.context || {},
            constraints: input.constraints || {},
            available_actions: Array.isArray(input.available_actions) ? input.available_actions : []
        });

        return this.normalizePlan(raw, goal);
    }

    normalizePlan(raw, goal) {
        const value = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!value || typeof value !== "object") throw new Error("INVALID_INTELLIGENCE_RESPONSE");
        if (!Array.isArray(value.steps)) throw new Error("PLAN_STEPS_REQUIRED");

        const steps = value.steps.map((step, index) => {
            if (!step || typeof step !== "object") throw new Error("INVALID_PLAN_STEP");
            const action = String(step.action || "").trim();
            if (!action) throw new Error("PLAN_ACTION_REQUIRED");
            return {
                step: index + 1,
                action,
                purpose: String(step.purpose || "").trim(),
                input: step.input && typeof step.input === "object" ? step.input : {},
                requires_approval: Boolean(step.requires_approval)
            };
        });

        return {
            goal,
            summary: String(value.summary || "").trim(),
            steps
        };
    }

    async execute(input = {}) {
        return this.plan(input);
    }
}

module.exports = JarvisIntelligenceProviderV1;
