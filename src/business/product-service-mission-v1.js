"use strict";

/**
 * JARVIS Product/Service Mission Contract V1.
 *
 * Business-first boundary for autonomous work on digital products and
 * AI/digital services. This contract defines the mission envelope; execution
 * remains owned by the existing Master Agent, Orchestrator, and task services.
 */
const MISSION_TYPES = Object.freeze({
    DIGITAL_PRODUCT: "DIGITAL_PRODUCT",
    DIGITAL_SERVICE: "DIGITAL_SERVICE"
});

const REQUIRED_OUTPUTS = Object.freeze([
    "goal",
    "plan",
    "execution_report",
    "verification",
    "final_deliverable"
]);

function createProductServiceMission(input = {}) {
    const goal = String(input.goal || "").trim();
    if (!goal) throw new Error("MISSION_GOAL_REQUIRED");

    const mission_type = String(input.mission_type || "").trim();
    if (!Object.values(MISSION_TYPES).includes(mission_type)) {
        throw new Error("MISSION_TYPE_INVALID");
    }

    const deliverable = String(input.deliverable || "").trim();
    if (!deliverable) throw new Error("MISSION_DELIVERABLE_REQUIRED");

    return Object.freeze({
        mission_id: String(input.mission_id || `MISSION_${Date.now()}`),
        mission_type,
        goal,
        deliverable,
        target_customer: String(input.target_customer || "").trim(),
        constraints: input.constraints && typeof input.constraints === "object" ? { ...input.constraints } : {},
        required_outputs: [...REQUIRED_OUTPUTS],
        success_criteria: Array.isArray(input.success_criteria) ? [...input.success_criteria] : [],
        external_execution_requires_approval: true,
        status: "READY",
        version: "1.0.0"
    });
}

module.exports = {
    MISSION_TYPES,
    REQUIRED_OUTPUTS,
    createProductServiceMission
};
