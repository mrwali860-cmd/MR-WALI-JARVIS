"use strict";

const ComponentContract = require("../../contracts/component-contract");

/** Core-owned Dashboard Action Boundary V1. */
class DashboardActionBoundary extends ComponentContract {
    constructor({ orchestrator } = {}) {
        super({ id: "DASHBOARD_ACTION_BOUNDARY", name: "Dashboard Action Boundary", version: "1.0.0", status: "HEALTHY" });
        if (!orchestrator) throw new Error("orchestrator is required");
        this.orchestrator = orchestrator;
    }
    validateRequest(input = {}) {
        const { action, target, request_id: requestId } = input;
        if (!action) throw new Error("action is required");
        if (!target || typeof target !== "object") throw new Error("target is required");
        if (!requestId) throw new Error("request_id is required");
        if (action !== "EXECUTE_TASK") throw new Error(`Unsupported dashboard action: ${action}`);
        if (!target.service_id) throw new Error("target.service_id is required");
        if (!target.task_id) throw new Error("target.task_id is required");
        return { action, service_id: target.service_id, task_id: target.task_id, request_id: requestId, approval_context: input.approval_context || {}, input: input.input || null };
    }
    async execute(input = {}) {
        const request = this.validateRequest(input);
        const result = await this.orchestrator.executeTask(request);
        return { success: result.success, action: request.action, request_id: request.request_id, target: { service_id: request.service_id, task_id: request.task_id }, status: result.status, reason: result.reason, result };
    }
}
module.exports = DashboardActionBoundary;
