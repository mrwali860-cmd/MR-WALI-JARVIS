"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * JARVIS Client Approval V1
 *
 * Owns only the explicit client-consent decision. It never performs
 * delivery, revenue recording, QA, or external execution.
 */
class ClientApproval extends ComponentContract {
    constructor(config = {}) {
        super({
            id: "CLIENT_APPROVAL",
            name: "Client Approval",
            version: "1.0.0",
            status: "AVAILABLE",
            ...config
        });
    }

    validateInput(input = {}) {
        const required = ["service_id", "request_id", "qa_decision", "approval_context"];
        const missing = required.filter((key) => input[key] === undefined || input[key] === null);
        if (missing.length) {
            throw new Error(`CLIENT_APPROVAL: missing required fields: ${missing.join(", ")}`);
        }
    }

    decide(input = {}) {
        this.validateInput(input);

        const qaDecision = String(input.qa_decision).toUpperCase();
        const context = input.approval_context;
        const timestamp = new Date().toISOString();

        if (qaDecision !== "PASS") {
            return this.result(input, "PENDING", `Client approval blocked until QA is PASS; received ${qaDecision}`, timestamp);
        }

        if (!context || typeof context !== "object") {
            return this.result(input, "PENDING", "Explicit approval context is required", timestamp);
        }

        const signal = String(context.status || context.decision || "").toUpperCase();
        if (context.approved === true || signal === "APPROVED") {
            return this.result(input, "APPROVED", "Explicit client approval received after QA PASS", timestamp);
        }

        if (context.approved === false || signal === "REJECTED") {
            return this.result(input, "REJECTED", "Explicit client rejection received", timestamp);
        }

        return this.result(input, "PENDING", "Awaiting explicit client approval", timestamp);
    }

    result(input, decision, reason, timestamp) {
        return {
            decision,
            service_id: input.service_id,
            request_id: input.request_id,
            reason,
            approval_context: input.approval_context,
            timestamp
        };
    }

    execute(input = {}) {
        const action = String(input.action || "DECIDE").trim().toUpperCase();
        if (action !== "DECIDE") {
            throw new Error(`CLIENT_APPROVAL: unsupported action ${action}`);
        }
        return this.decide(input);
    }
}

module.exports = ClientApproval;
