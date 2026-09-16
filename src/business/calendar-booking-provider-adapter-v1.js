"use strict";

/**
 * Calendar Booking Provider Adapter V1.
 *
 * Provider-neutral booking operation boundary. The adapter owns only the
 * provider-specific booking call. Authorization, lifecycle, persistence,
 * retries, and audit remain outside this adapter.
 *
 * A real provider implementation is injected through `perform`; V1 never
 * simulates a booking when the provider operation is absent.
 */
class CalendarBookingProviderAdapterV1 {
    constructor({ provider, perform } = {}) {
        this.provider = String(provider || "").trim();
        this.action = "BOOKING_EXECUTION";
        this.operation = "create_booking";
        this.perform = typeof perform === "function" ? perform : null;

        if (!this.provider) throw new Error("CALENDAR_PROVIDER_REQUIRED");
    }

    execute({ request_id: requestId, service_id: serviceId, task_id: taskId, action, input } = {}) {
        if (!requestId || !serviceId || !taskId) throw new Error("IDENTITY_REQUIRED");
        if (String(action || "").trim().toUpperCase() !== this.action) {
            throw new Error("UNSUPPORTED_ACTION");
        }
        if (!input || typeof input !== "object") throw new Error("BOOKING_INPUT_REQUIRED");

        const { lead_id: leadId, requested_time: requestedTime, duration_minutes: durationMinutes } = input;
        if (!leadId || !requestedTime || !Number.isFinite(Number(durationMinutes)) || Number(durationMinutes) <= 0) {
            throw new Error("BOOKING_INPUT_INVALID");
        }
        if (!this.perform) throw new Error("CALENDAR_PROVIDER_NOT_CONFIGURED");

        return this.perform({
            request_id: requestId,
            service_id: serviceId,
            task_id: taskId,
            action: this.action,
            operation: this.operation,
            input: {
                lead_id: leadId,
                requested_time: requestedTime,
                duration_minutes: Number(durationMinutes)
            }
        });
    }
}

module.exports = CalendarBookingProviderAdapterV1;
