"use strict";

/**
 * External Execution Boundary V1
 *
 * Provider-neutral boundary between authorized JARVIS orchestration and
 * provider adapters. V1 intentionally has no real external integrations,
 * retries, queues, or persistence.
 */
class ExternalExecutionBoundary {
    constructor({ adapters = {} } = {}) {
        this.adapters = { ...adapters };
    }

    execute({ request_id: requestId, service_id: serviceId, task_id: taskId, action, provider, approval_context: approvalContext, input } = {}) {
        if (!requestId || !serviceId || !taskId) {
            throw new Error("IDENTITY_REQUIRED");
        }

        const normalizedAction = String(action || "").trim().toUpperCase();
        if (!normalizedAction) {
            throw new Error("ACTION_REQUIRED");
        }

        if (!approvalContext || approvalContext.allowed !== true) {
            throw new Error("AUTHORIZATION_REQUIRED");
        }

        const adapter = this.adapters[provider];
        if (!adapter || typeof adapter.execute !== "function") {
            throw new Error("UNSUPPORTED_PROVIDER");
        }

        if (adapter.action && String(adapter.action).toUpperCase() !== normalizedAction) {
            throw new Error("UNSUPPORTED_ACTION");
        }

        try {
            const result = adapter.execute({
                request_id: requestId,
                service_id: serviceId,
                task_id: taskId,
                action: normalizedAction,
                input
            });

            return {
                success: true,
                request_id: requestId,
                action: normalizedAction,
                provider,
                result: this.normalizeResult(result)
            };
        } catch (error) {
            return {
                success: false,
                request_id: requestId,
                action: normalizedAction,
                provider,
                error: this.normalizeError(error)
            };
        }
    }

    normalizeResult(result) {
        if (result === undefined) return null;
        JSON.stringify(result);
        return result;
    }

    normalizeError(error) {
        return {
            code: error && error.code ? String(error.code) : "PROVIDER_EXECUTION_FAILED",
            message: error && error.message ? String(error.message) : "Provider execution failed"
        };
    }
}

module.exports = ExternalExecutionBoundary;
