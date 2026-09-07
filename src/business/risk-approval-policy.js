"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * JARVIS Risk / Approval Policy Engine V1
 *
 * Central policy authority for actions that can affect external systems,
 * money, messages, bookings, or data. DENY is the safe default.
 */
class RiskApprovalPolicy extends ComponentContract {
    constructor(config = {}) {
        super({
            id: "RISK_APPROVAL_POLICY",
            name: "Risk / Approval Policy Engine",
            version: "1.0.0",
            status: "AVAILABLE",
            ...config
        });

        this.policies = Object.freeze({
            BOOKING_EXECUTION: "APPROVAL_REQUIRED",
            EXTERNAL_MESSAGE_SEND: "APPROVAL_REQUIRED",
            PAYMENT_OR_MONEY_MOVEMENT: "APPROVAL_REQUIRED",
            DATA_DELETION: "APPROVAL_REQUIRED"
        });
    }

    normalizeAction(action) {
        return String(action || "").trim().toUpperCase();
    }

    evaluate({ action, approval_context: approvalContext = {} } = {}) {
        const normalizedAction = this.normalizeAction(action);
        if (!normalizedAction) {
            return { allowed: false, decision: "DENY", reason: "ACTION_REQUIRED" };
        }

        const policy = this.policies[normalizedAction] || "NO_APPROVAL_REQUIRED";
        const approved = approvalContext.approved === true || approvalContext.status === "APPROVED";

        if (policy === "APPROVAL_REQUIRED" && !approved) {
            return {
                allowed: false,
                decision: "WAIT",
                reason: "APPROVAL_REQUIRED",
                action: normalizedAction,
                policy
            };
        }

        return {
            allowed: true,
            decision: "ALLOW",
            reason: policy === "APPROVAL_REQUIRED" ? "APPROVED" : "NO_APPROVAL_REQUIRED",
            action: normalizedAction,
            policy
        };
    }

    requiresApproval(action) {
        return this.policies[this.normalizeAction(action)] === "APPROVAL_REQUIRED";
    }

    execute(input = {}) {
        const action = String(input.action || "").toUpperCase();
        if (action === "EVALUATE") return this.evaluate(input);
        if (action === "REQUIRES_APPROVAL") {
            return { success: true, requires_approval: this.requiresApproval(input.target_action) };
        }
        throw new Error(`Unknown policy action: ${action}`);
    }
}

module.exports = RiskApprovalPolicy;
