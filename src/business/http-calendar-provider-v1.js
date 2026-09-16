"use strict";

/**
 * HTTP Calendar Provider V1.
 *
 * Concrete transport adapter for an external calendar provider. The core
 * system supplies a normalized create-booking request; this adapter owns only
 * HTTP transport and response normalization. Credentials are supplied at
 * runtime and are never persisted or returned in the normalized result.
 */
class HttpCalendarProviderV1 {
    constructor({ baseUrl, token, fetchImpl = globalThis.fetch } = {}) {
        this.baseUrl = String(baseUrl || "").trim().replace(/\/$/, "");
        this.token = String(token || "").trim();
        this.fetchImpl = typeof fetchImpl === "function" ? fetchImpl : null;
        if (!this.baseUrl) throw new Error("CALENDAR_BASE_URL_REQUIRED");
        if (!this.token) throw new Error("CALENDAR_TOKEN_REQUIRED");
        if (!this.fetchImpl) throw new Error("FETCH_REQUIRED");
    }

    async createBooking({ request_id: requestId, service_id: serviceId, task_id: taskId, input } = {}) {
        if (!requestId || !serviceId || !taskId) throw new Error("IDENTITY_REQUIRED");
        if (!input || typeof input !== "object") throw new Error("BOOKING_INPUT_REQUIRED");

        const response = await this.fetchImpl(`${this.baseUrl}/bookings`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
                "X-Request-Id": requestId
            },
            body: JSON.stringify({
                service_id: serviceId,
                task_id: taskId,
                lead_id: input.lead_id,
                requested_time: input.requested_time,
                duration_minutes: Number(input.duration_minutes)
            })
        });

        const raw = await response.text();
        let body = null;
        try { body = JSON.parse(raw); } catch { body = { raw }; }

        if (!response.ok) {
            const message = body?.message || body?.error || `HTTP_${response.status}`;
            throw new Error(`CALENDAR_PROVIDER_${response.status}: ${message}`);
        }

        return {
            executed: true,
            status: "COMPLETE",
            provider: "HTTP_CALENDAR",
            operation: "create_booking",
            request_id: requestId,
            service_id: serviceId,
            task_id: taskId,
            booking: body
        };
    }
}

module.exports = HttpCalendarProviderV1;
