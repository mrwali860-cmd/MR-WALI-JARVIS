"use strict";

const assert = require("assert");
const OpenAIIntelligenceProviderV1 = require("./openai-intelligence-provider-v1");

async function main() {
    if (!process.env.OPENAI_API_KEY) {
        console.log("REAL OPENAI INTELLIGENCE LIVE GATE: BLOCKED (OPENAI_API_KEY not configured)");
        return;
    }

    const provider = new OpenAIIntelligenceProviderV1({
        model: process.env.JARVIS_OPENAI_MODEL || "gpt-5.6-luna"
    });

    const startedAt = Date.now();
    const plan = await provider.plan({
        goal: "Create a safe internal plan to research Dubai real-estate prospects.",
        context: {
            environment: "LIVE_SMOKE_TEST",
            external_side_effects_allowed: false
        },
        constraints: {
            no_external_messages: true,
            no_payments: true,
            no_data_deletion: true
        },
        available_actions: [
            "LEAD_INTAKE",
            "LEAD_QUALIFICATION",
            "QA"
        ]
    });

    const allowed = new Set(["LEAD_INTAKE", "LEAD_QUALIFICATION", "QA"]);
    assert.ok(plan && Array.isArray(plan.steps) && plan.steps.length > 0, "PLAN_REQUIRED");

    for (const step of plan.steps) {
        assert.ok(allowed.has(step.action), `UNAUTHORIZED_ACTION: ${step.action}`);
        assert.equal(typeof step.requires_approval, "boolean");
        assert.ok(step.input && step.input.data && typeof step.input.data === "object");
    }

    console.log("REAL OPENAI INTELLIGENCE LIVE GATE: PASS");
    console.log(`MODEL: ${provider.model}`);
    console.log(`LATENCY_MS: ${Date.now() - startedAt}`);
    console.log(`STEPS: ${plan.steps.length}`);
    console.log("EXTERNAL_SIDE_EFFECTS: NONE");
}

main().catch((error) => {
    console.error("REAL OPENAI INTELLIGENCE LIVE GATE: FAIL");
    console.error(error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
