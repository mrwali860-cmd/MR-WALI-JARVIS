"use strict";

const assert = require("assert");
const OpenAIIntelligenceProviderV1 = require("./openai-intelligence-provider-v1");

async function run() {
    const calls = [];
    const fakeClient = {
        responses: {
            async create(input) {
                calls.push(input);
                return {
                    output_text: JSON.stringify({
                        summary: "Qualify a lead before requesting an appointment.",
                        steps: [
                            {
                                action: "LEAD_INTAKE",
                                purpose: "Collect the lead details.",
                                input: { source: "test" },
                                requires_approval: false
                            },
                            {
                                action: "LEAD_QUALIFICATION",
                                purpose: "Qualify the lead.",
                                input: {},
                                requires_approval: false
                            }
                        ]
                    })
                };
            }
        }
    };

    const provider = new OpenAIIntelligenceProviderV1({
        client: fakeClient,
        model: "test-model"
    });

    const plan = await provider.plan({
        goal: "Run the lead qualification pipeline",
        available_actions: ["LEAD_INTAKE", "LEAD_QUALIFICATION"]
    });

    assert.strictEqual(plan.goal, "Run the lead qualification pipeline");
    assert.strictEqual(plan.steps.length, 2);
    assert.strictEqual(plan.steps[0].action, "LEAD_INTAKE");
    assert.strictEqual(calls.length, 1);
    assert.strictEqual(calls[0].model, "test-model");
    assert.strictEqual(calls[0].text.format.type, "json_schema");
    assert.strictEqual(calls[0].text.format.strict, true);
    assert.deepStrictEqual(calls[0].text.format.schema.required, ["summary", "steps"]);

    const unconfigured = new OpenAIIntelligenceProviderV1({
        apiKey: null
    });
    await assert.rejects(
        () => unconfigured.plan({ goal: "x" }),
        /OPENAI_API_KEY_REQUIRED/
    );

    console.log("OPENAI INTELLIGENCE PROVIDER V1 TEST: PASS");
}

run().catch((error) => {
    console.error(error);
    process.exit(1);
});
