"use strict";

/**
 * Calendly Scheduling API Provider V1.
 *
 * Concrete external booking adapter. It maps the core booking identity and
 * lead details to Calendly's POST /invitees Scheduling API operation.
 * Credentials are runtime-only and never returned in normalized results.
 */
class CalendlyBookingProviderV1 {
    constructor({ token, fetchImpl = globalThis.fetch, baseUrl = "https://api.calendly.com" } = {}) {
        this.token = String(token || "").trim();
        this.baseUrl = String(baseUrl || "").trim().replace(/\/$/, "");
        this.fetchImpl = typeof fetchImpl === "function" ? fetchImpl : null;
        if (!this.token) throw new Error("CALENDLY_TOKEN_REQUIRED");
        if (!this.baseUrl) throw new Error("CALENDLY_BASE_URL_REQUIRED");
        if (!this.fetchImpl) throw new Error("FETCH_REQUIRED");
    }

    async createBooking({ request_id: requestId, service_id: serviceId, task_id: taskId, input } = {}) {
        if (!requestId || !serviceId || !taskId) throw new Error("IDENTITY_REQUIRED");
        if (!input || typeof input !== "object") throw new Error("BOOKING_INPUT_REQUIRED");

        const eventType = String(input.event_type || "").trim();
        const requestedTime = String(input.requested_time || "").trim();
        const email = String(input.email || "").trim();
        const name = String(input.name || "").trim();
        const timezone = String(input.timezone || "UTC").trim();
        if (!eventType || !requestedTime || !email || !name || !timezone) {
            throw new Error("CALENDLY_BOOKING_INPUT_INVALID");
        }
        if (!/^https:\/\/api\.calendly\.com\/?$/i.test(this.baseUrl)) {
            throw new Error("CALENDLY_BASE_URL_INVALID");
        }

        const payload = {
            event_type: eventType,
            start_time: requestedTime,
            invitee: { name, email, timezone }
        };
        if (input.first_name) payload.invitee.first_name = String(input.first_name);
        if (input.last_name) payload.invitee.last_name = String(input.last_name);
        if (Array.isArray(input.event_guests) && input.event_guests.length) payload.event_guests = input.event_guests.map(String);
        if (input.location && typeof input.location === "object") payload.location = input.location;
        if (Array.isArray(input.questions_and_answers)) payload.questions_and_answers = input.questions_and_answers;

        const response = await this.fetchImpl(`${this.baseUrl}/invitees`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
                "X-Request-Id": requestId
            },
            body: JSON.stringify(payload)
        });

        const raw = await response.text();
        let body;
        try { body = JSON.parse(raw); } catch { body = { raw }; }
        if (!response.ok) {
            const message = body?.message || body?.error || `HTTP_${response.status}`;
            throw new Error(`CALENDLY_PROVIDER_${response.status}: ${message}`);
        }

        return {
            executed: true,
            status: "COMPLETE",
            provider: "CALENDLY",
            operation: "create_booking",
            request_id: requestId,
            service_id: serviceId,
            task_id: taskId,
            booking: body?.resource || body
        };
    }
}

module.exports = CalendlyBookingProviderV1;
