"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * JARVIS Risk / Approval Policy Engine V1
 *
 * Central policy authority for actions that can affect external systems,
 * money, messages, bookings, or data. Unknown actions fail closed.
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

        this.approvalRequired = new Set([
            "BOOKING_EXECUTION",
            "EXTERNAL_MESSAGE_SEND",
            "PAYMENT_OR_MONEY_MOVEMENT",
            "DATA_DELETION"
        ]);

        this.knownActions = new Set([
            "LEAD_INTAKE",
            "LEAD_QUALIFICATION",
            "APPOINTMENT_REQUEST",
            "APPROVAL_GATE",
            "BOOKING_EXECUTION",
            "CRM_RECORD",
            "QA",
            "CLIENT_APPROVAL",
            "DELIVERY",
            "REVENUE_RECORD",
            ...this.approvalRequired
        ]);
    }

    normalizeAction(action) {
        return String(action || "").trim().toUpperCase();
    }

    evaluate({ action, approval_context: approvalContext = {} } = {}) {
        const normalizedAction = this.normalizeAction(action);
        if (!normalizedAction) {
            return { allowed: false, decision: "DENY", reason: "ACTION_REQUIRED" };
        }

        if (!this.knownActions.has(normalizedAction)) {
            return {
                allowed: false,
                decision: "DENY",
                reason: "UNCLASSIFIED_ACTION",
                action: normalizedAction
            };
        }

        const approvalRequired = this.approvalRequired.has(normalizedAction);
        const approved = approvalContext.approved === true || approvalContext.status === "APPROVED";

        if (approvalRequired && !approved) {
            return {
                allowed: false,
                decision: "WAIT",
                reason: "APPROVAL_REQUIRED",
                action: normalizedAction,
                policy: "APPROVAL_REQUIRED"
            };
        }

        return {
            allowed: true,
            decision: "ALLOW",
            reason: approvalRequired ? "APPROVED" : "NO_APPROVAL_REQUIRED",
            action: normalizedAction,
            policy: approvalRequired ? "APPROVAL_REQUIRED" : "NO_APPROVAL_REQUIRED"
        };
    }

    requiresApproval(action) {
        return this.approvalRequired.has(this.normalizeAction(action));
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
