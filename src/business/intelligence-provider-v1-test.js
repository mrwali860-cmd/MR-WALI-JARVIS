"use strict";

const assert = require("assert");
const JarvisIntelligenceProviderV1 = require("./intelligence-provider-v1");

(async () => {
    const provider = new JarvisIntelligenceProviderV1({
        model: "test-model",
        generate: async () => ({
            summary: "Create a controlled execution plan",
            steps: [
                { action: "LEAD_INTAKE", purpose: "Collect lead data" },
                { action: "LEAD_QUALIFICATION", purpose: "Qualify the lead", requires_approval: false }
            ]
        })
    });

    const plan = await provider.plan({
        goal: "Process today's leads",
        context: { source: "benchmark" },
        constraints: { max_steps: 5 },
        available_actions: ["LEAD_INTAKE", "LEAD_QUALIFICATION"]
    });

    assert.strictEqual(plan.goal, "Process today's leads");
    assert.strictEqual(plan.steps.length, 2);
    assert.strictEqual(plan.steps[0].action, "LEAD_INTAKE");
    assert.strictEqual(plan.steps[1].action, "LEAD_QUALIFICATION");
    assert.strictEqual(provider.getInfo().version, "1.0.0");

    const unconfigured = new JarvisIntelligenceProviderV1();
    await assert.rejects(
        () => unconfigured.plan({ goal: "x" }),
        /INTELLIGENCE_PROVIDER_NOT_CONFIGURED/
    );

    console.log("JARVIS INTELLIGENCE PROVIDER V1 TEST: PASS");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
