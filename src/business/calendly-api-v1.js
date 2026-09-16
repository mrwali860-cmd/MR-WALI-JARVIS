"use strict";

/**
 * Calendly API V1 boundary.
 *
 * Handles authenticated discovery only: current user, event types, and
 * available times. Booking remains in CalendlyBookingProviderV1 so the
 * external side effect stays isolated.
 */
class CalendlyApiV1 {
    constructor({ token, fetchImpl = globalThis.fetch, baseUrl = "https://api.calendly.com" } = {}) {
        this.token = String(token || "").trim();
        this.baseUrl = String(baseUrl || "").trim().replace(/\/$/, "");
        this.fetchImpl = typeof fetchImpl === "function" ? fetchImpl : null;
        if (!this.token) throw new Error("CALENDLY_TOKEN_REQUIRED");
        if (this.baseUrl !== "https://api.calendly.com") throw new Error("CALENDLY_BASE_URL_INVALID");
        if (!this.fetchImpl) throw new Error("FETCH_REQUIRED");
    }

    async request(pathname, { searchParams = {}, method = "GET", body } = {}) {
        const url = new URL(`${this.baseUrl}${pathname}`);
        Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
        });
        const response = await this.fetchImpl(url.toString(), {
            method,
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/json",
                ...(body ? { "Content-Type": "application/json" } : {})
            },
            ...(body ? { body: JSON.stringify(body) } : {})
        });
        const raw = await response.text();
        let data;
        try { data = JSON.parse(raw); } catch { data = { raw }; }
        if (!response.ok) {
            const message = data?.message || data?.error || `HTTP_${response.status}`;
            throw new Error(`CALENDLY_API_${response.status}: ${message}`);
        }
        return data;
    }

    async getCurrentUser() {
        const data = await this.request("/users/me");
        return data.resource || data;
    }

    async listEventTypes(userUri, { active = true } = {}) {
        if (!userUri) throw new Error("CALENDLY_USER_URI_REQUIRED");
        const data = await this.request("/event_types", {
            searchParams: { user: userUri, active, count: 100, sort: "name:asc" }
        });
        return Array.isArray(data.collection) ? data.collection : [];
    }

    async listAvailableTimes(eventTypeUri, startTime, endTime) {
        if (!eventTypeUri || !startTime || !endTime) throw new Error("CALENDLY_AVAILABILITY_INPUT_REQUIRED");
        const data = await this.request("/event_type_available_times", {
            searchParams: { event_type: eventTypeUri, start_time: startTime, end_time: endTime }
        });
        return Array.isArray(data.collection) ? data.collection : [];
    }
}

module.exports = CalendlyApiV1;
