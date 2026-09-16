"use strict";

const assert = require("assert");
const CalendlyBookingProviderV1 = require("./calendly-booking-provider-v1");

(async () => {
    const calls = [];
    const provider = new CalendlyBookingProviderV1({
        token: "test-token",
        fetchImpl: async (url, init) => {
            calls.push({ url, init });
            return {
                ok: true,
                status: 201,
                text: async () => JSON.stringify({ resource: { uri: "https://api.calendly.com/scheduled_events/test-event", status: "active" } })
            };
        }
    });

    const result = await provider.createBooking({
        request_id: "req-calendly-1",
        service_id: "service_1",
        task_id: "task_booking_1",
        input: {
            event_type: "https://api.calendly.com/event_types/test",
            requested_time: "2026-10-01T10:00:00Z",
            name: "Test Lead",
            email: "test@example.com",
            timezone: "UTC"
        }
    });

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "https://api.calendly.com/invitees");
    assert.equal(calls[0].init.method, "POST");
    assert.equal(calls[0].init.headers.Authorization, "Bearer test-token");
    assert.equal(calls[0].init.headers["X-Request-Id"], "req-calendly-1");
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.event_type, "https://api.calendly.com/event_types/test");
    assert.equal(body.start_time, "2026-10-01T10:00:00Z");
    assert.equal(body.invitee.email, "test@example.com");
    assert.equal(result.status, "COMPLETE");
    assert.equal(result.provider, "CALENDLY");
    assert.equal(result.request_id, "req-calendly-1");
    assert.equal(result.booking.uri, "https://api.calendly.com/scheduled_events/test-event");
    assert.ok(!JSON.stringify(result).includes("test-token"));

    assert.throws(() => new CalendlyBookingProviderV1({ fetchImpl: async () => ({}) }), /CALENDLY_TOKEN_REQUIRED/);

    const failureProvider = new CalendlyBookingProviderV1({
        token: "test-token",
        fetchImpl: async () => ({
            ok: false,
            status: 409,
            text: async () => JSON.stringify({ message: "slot unavailable" })
        })
    });
    await assert.rejects(
        () => failureProvider.createBooking({
            request_id: "req-calendly-2",
            service_id: "service_1",
            task_id: "task_booking_1",
            input: {
                event_type: "https://api.calendly.com/event_types/test",
                requested_time: "2026-10-01T10:00:00Z",
                name: "Test Lead",
                email: "test@example.com",
                timezone: "UTC"
            }
        }),
        /CALENDLY_PROVIDER_409: slot unavailable/
    );

    console.log("CALENDLY BOOKING PROVIDER V1 TEST: PASS");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
