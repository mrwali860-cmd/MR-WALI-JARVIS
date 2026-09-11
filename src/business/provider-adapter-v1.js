"use strict";

/**
 * Provider Adapter V1
 *
 * Minimal provider-specific adapter contract implementation. It performs
 * exactly one declared operation and intentionally owns no authorization,
 * lifecycle, retry, persistence, or audit responsibilities.
 */
class ProviderAdapter {
    constructor({ provider, action, operation, perform } = {}) {
        this.provider = provider;
        this.action = String(action || "").trim().toUpperCase();
        this.operation = operation;
        this.perform = typeof perform === "function" ? perform : (() => ({}));
    }

    validateEnvelope(envelope = {}) {
        const { request_id: requestId, service_id: serviceId, task_id: taskId } = envelope;
        if (!requestId || !serviceId || !taskId) throw new Error("IDENTITY_REQUIRED");
        const action = String(envelope.action || "").trim().toUpperCase();
        if (!action || action !== this.action) throw new Error("UNSUPPORTED_ACTION");
        if (envelope.input === undefined) throw new Error("INPUT_REQUIRED");
        return {
            request_id: requestId,
            service_id: serviceId,
            task_id: taskId,
            action,
            input: envelope.input
        };
    }

    execute(envelope = {}) {
        const normalized = this.validateEnvelope(envelope);
        if (!this.operation) throw new Error("OPERATION_REQUIRED");
        return this.perform({
            ...normalized,
            provider: this.provider,
            operation: this.operation
        });
    }
}

module.exports = ProviderAdapter;
