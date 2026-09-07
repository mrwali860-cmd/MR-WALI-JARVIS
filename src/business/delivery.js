"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * JARVIS Delivery V1
 *
 * Owns only delivery eligibility and delivery state. It never performs QA,
 * grants client approval, records revenue, or bypasses risk controls.
 */
class Delivery extends ComponentContract {
    constructor(config = {}) {
        super({
            id: "DELIVERY",
            name: "Delivery",
            version: "1.0.0",
            status: "AVAILABLE",
            ...config
        });
    }

    validateInput(input = {}) {
        const required = [
            "service_id",
            "request_id",
            "qa_decision",
            "client_approval_decision",
            "delivery_payload"
        ];
        const missing = required.filter((key) => input[key] === undefined || input[key] === null);
        if (missing.length) {
            throw new Error(`DELIVERY: missing required fields: ${missing.join(", ")}`);
        }
    }

    deliver(input = {}) {
        this.validateInput(input);

        const qaDecision = String(input.qa_decision).trim().toUpperCase();
        const approvalDecision = String(input.client_approval_decision).trim().toUpperCase();
        const timestamp = new Date().toISOString();

        if (qaDecision !== "PASS") {
            return this.result(input, "BLOCKED", "Delivery requires QA PASS", timestamp);
        }

        if (approvalDecision !== "APPROVED") {
            return this.result(input, "BLOCKED", "Delivery requires explicit client approval", timestamp);
        }

        try {
            if (input.delivery_context && input.delivery_context.delivery_failed === true) {
                throw new Error("Delivery execution failed");
            }

            return this.result(input, "DELIVERED", "Delivery completed after QA PASS and client approval", timestamp);
        } catch (error) {
            return this.result(input, "FAILED", error.message, timestamp);
        }
    }

    result(input, decision, reason, timestamp) {
        return {
            decision,
            service_id: input.service_id,
            request_id: input.request_id,
            delivery_status: decision,
            reason,
            delivery_payload: input.delivery_payload,
            timestamp
        };
    }

    execute(input = {}) {
        const action = String(input.action || "DELIVER").trim().toUpperCase();
        if (action !== "DELIVER") {
            throw new Error(`DELIVERY: unsupported action ${action}`);
        }
        return this.deliver(input);
    }
}

module.exports = Delivery;
