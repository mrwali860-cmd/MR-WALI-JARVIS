"use strict";

const OpenAI = require("openai");
const JarvisIntelligenceProviderV1 = require("./intelligence-provider-v1");

const PLAN_SCHEMA = Object.freeze({
    type: "object",
    properties: {
        summary: { type: "string" },
        steps: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    action: { type: "string" },
                    purpose: { type: "string" },
                    input: {
                        type: "object",
                        properties: {
                            data: {
                                type: "object",
                                properties: {
                                    value: { type: "string" }
                                },
                                required: ["value"],
                                additionalProperties: false
                            }
                        },
                        required: ["data"],
                        additionalProperties: false
                    },
                    requires_approval: { type: "boolean" }
                },
                required: ["action", "purpose", "input", "requires_approval"],
                additionalProperties: false
            }
        }
    },
    required: ["summary", "steps"],
    additionalProperties: false
});

class OpenAIIntelligenceProviderV1 extends JarvisIntelligenceProviderV1 {
    constructor(config = {}) {
        const apiKey = config.apiKey || process.env.OPENAI_API_KEY || null;
        const model = config.model || process.env.JARVIS_OPENAI_MODEL || "gpt-5.6-luna";
        const client = config.client || (apiKey ? new OpenAI({ apiKey, maxRetries: 2 }) : null);

        super({
            ...config,
            model,
            generate: async () => {
                throw new Error("OPENAI_PROVIDER_GENERATE_BOUNDARY");
            }
        });

        this.client = client;
        this.apiKeyConfigured = Boolean(apiKey || config.client);
        this.systemInstructions = config.systemInstructions || [
            "You are the planning intelligence for MR-WALI-JARVIS.",
            "Create a concise executable business plan using only the supplied available_actions.",
            "Do not invent actions, execute actions, bypass approvals, or claim work is complete.",
            "Mark requires_approval true when a step would require human approval."
        ].join(" ");
    }

    async plan(input = {}) {
        const goal = String(input.goal || "").trim();
        if (!goal) throw new Error("GOAL_REQUIRED");
        if (!this.client) throw new Error("OPENAI_API_KEY_REQUIRED");

        const availableActions = Array.isArray(input.available_actions) ? input.available_actions : [];
        const request = {
            goal,
            context: input.context || {},
            constraints: input.constraints || {},
            available_actions: availableActions
        };

        const response = await this.client.responses.create({
            model: this.model,
            instructions: this.systemInstructions,
            input: JSON.stringify(request),
            text: {
                format: {
                    type: "json_schema",
                    name: "jarvis_plan",
                    strict: true,
                    schema: PLAN_SCHEMA
                }
            }
        });

        const raw = response && typeof response.output_text === "string"
            ? response.output_text
            : null;

        if (!raw) throw new Error("OPENAI_EMPTY_RESPONSE");

        return this.normalizePlan(raw, goal);
    }
}

OpenAIIntelligenceProviderV1.PLAN_SCHEMA = PLAN_SCHEMA;

module.exports = OpenAIIntelligenceProviderV1;
