"use strict";

const assert = require("assert");
const CalendlyApiV1 = require("./calendly-api-v1");

(async () => {
    const calls = [];
    const api = new CalendlyApiV1({
        token: "test-token",
        fetchImpl: async (url, init) => {
            calls.push({ url, init });
            if (url.includes("/users/me")) {
                return { ok: true, status: 200, text: async () => JSON.stringify({ resource: { uri: "https://api.calendly.com/users/test-user", name: "Test User" } }) };
            }
            if (url.includes("/event_types?")) {
                return { ok: true, status: 200, text: async () => JSON.stringify({ collection: [{ uri: "https://api.calendly.com/event_types/test", name: "Test event type", scheduling_url: "https://calendly.com/test/test-event" }] }) };
            }
            return { ok: true, status: 200, text: async () => JSON.stringify({ collection: [{ status: "available", start_time: "2026-10-01T10:00:00Z", invitees_remaining: 1 }] }) };
        }
    });

    const user = await api.getCurrentUser();
    assert.equal(user.uri, "https://api.calendly.com/users/test-user");

    const eventTypes = await api.listEventTypes(user.uri);
    assert.equal(eventTypes.length, 1);
    assert.equal(eventTypes[0].name, "Test event type");

    const slots = await api.listAvailableTimes(eventTypes[0].uri, "2026-10-01T00:00:00Z", "2026-10-02T00:00:00Z");
    assert.equal(slots.length, 1);
    assert.equal(slots[0].status, "available");
    assert.equal(calls.length, 3);
    assert.ok(calls.every(call => call.init.headers.Authorization === "Bearer test-token"));

    assert.throws(() => new CalendlyApiV1({ fetchImpl: async () => ({}) }), /CALENDLY_TOKEN_REQUIRED/);
    assert.ok(!JSON.stringify({ user, eventTypes, slots }).includes("test-token"));

    console.log("CALENDLY API V1 DISCOVERY TEST: PASS");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
