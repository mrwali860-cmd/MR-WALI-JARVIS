"use strict";

/**
 * JARVIS Close-Clients Outcome Mission V1.
 *
 * Outcome-oriented sales mission contract on top of the existing
 * Master Agent / Orchestrator boundaries.
 *
 * This contract does not guarantee sales and never auto-approves
 * external actions, contracts, meetings, or payments.
 */
const STOP_CONDITIONS = Object.freeze([
    "VERIFIED_PAID_CLIENT_TARGET_REACHED",
    "DAILY_OUTREACH_LIMIT_REACHED",
    "HUMAN_APPROVAL_REQUIRED",
    "MISSION_BLOCKED"
]);

function createCloseClientsMission(input = {}) {
    const goal = String(input.goal || "").trim();
    if (!goal) throw new Error("CLOSE_CLIENTS_GOAL_REQUIRED");

    const target = Number(input.target_clients);
    if (!Number.isInteger(target) || target < 1) {
        throw new Error("TARGET_CLIENTS_MUST_BE_POSITIVE_INTEGER");
    }

    const market = String(input.market || "").trim();
    if (!market) throw new Error("CLOSE_CLIENTS_MARKET_REQUIRED");

    const offer = String(input.offer || "").trim();
    if (!offer) throw new Error("CLOSE_CLIENTS_OFFER_REQUIRED");

    const maxOutreach = Number(input.max_outreach);
    if (!Number.isInteger(maxOutreach) || maxOutreach < target) {
        throw new Error("MAX_OUTREACH_MUST_BE_INTEGER_AND_AT_LEAST_TARGET");
    }

    const approvalPolicy = input.approval_policy && typeof input.approval_policy === "object"
        ? { ...input.approval_policy }
        : {};

    return Object.freeze({
        mission_id: String(input.mission_id || `CLOSE_CLIENTS_${Date.now()}`),
        mission_type: "CLOSE_CLIENTS",
        goal,
        target_clients: target,
        market,
        offer,
        max_outreach: maxOutreach,
        daily_limits: input.daily_limits && typeof input.daily_limits === "object"
            ? { ...input.daily_limits }
            : {},
        approval_policy: Object.freeze({
            external_messages: "HUMAN_APPROVAL_REQUIRED",
            meetings: "HUMAN_APPROVAL_REQUIRED",
            contracts: "HUMAN_APPROVAL_REQUIRED",
            payments: "HUMAN_APPROVAL_REQUIRED",
            ...approvalPolicy
        }),
        stop_conditions: [...STOP_CONDITIONS],
        stop_when: String(
            input.stop_when ||
            "verified paid clients reach target OR an enforced mission limit/blocker is reached"
        ).trim(),
        success_metric: "verified_paid_clients",
        guarantee: false,
        required_evidence: [
            "prospect_identity",
            "qualification_result",
            "outreach_status",
            "reply_classification",
            "meeting_status",
            "proposal_status",
            "approval_events",
            "payment_verification"
        ],
        execution_boundary: {
            planning_owner: "JARVIS_AUTONOMOUS_MASTER_AGENT_V1",
            execution_owner: "ORCHESTRATOR",
            external_actions_require_approval: true
        },
        status: "READY",
        version: "1.0.0"
    });
}

module.exports = { STOP_CONDITIONS, createCloseClientsMission };
