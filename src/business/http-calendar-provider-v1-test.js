"use strict";

const assert = require("assert");
const HttpCalendarProviderV1 = require("./http-calendar-provider-v1");

(async () => {
    let captured = null;
    const provider = new HttpCalendarProviderV1({
        baseUrl: "https://calendar.example.test/api",
        token: "secret-token",
        fetchImpl: async (url, init) => {
            captured = { url, init };
            return {
                ok: true,
                status: 200,
                async text() { return JSON.stringify({ booking_id: "booking_001", status: "confirmed" }); }
            };
        }
    });

    const result = await provider.createBooking({
        request_id: "req-http-001",
        service_id: "SERVICE_001",
        task_id: "TASK_BOOKING_001",
        input: { lead_id: "lead_001", requested_time: "2026-09-20T10:00:00Z", duration_minutes: 30 }
    });

    assert.strictEqual(captured.url, "https://calendar.example.test/api/bookings");
    assert.strictEqual(captured.init.method, "POST");
    assert.strictEqual(captured.init.headers.Authorization, "Bearer secret-token");
    const body = JSON.parse(captured.init.body);
    assert.deepStrictEqual(body, {
        service_id: "SERVICE_001",
        task_id: "TASK_BOOKING_001",
        lead_id: "lead_001",
        requested_time: "2026-09-20T10:00:00Z",
        duration_minutes: 30
    });
    assert.strictEqual(result.status, "COMPLETE");
    assert.strictEqual(result.request_id, "req-http-001");
    assert.strictEqual(result.booking.booking_id, "booking_001");
    assert.ok(!JSON.stringify(result).includes("secret-token"));

    assert.throws(
        () => new HttpCalendarProviderV1({ baseUrl: "https://calendar.example.test" }),
        /CALENDAR_TOKEN_REQUIRED/
    );

    const failedProvider = new HttpCalendarProviderV1({
        baseUrl: "https://calendar.example.test/api",
        token: "secret-token",
        fetchImpl: async () => ({
            ok: false,
            status: 409,
            async text() { return JSON.stringify({ message: "slot unavailable" }); }
        })
    });
    await assert.rejects(
        () => failedProvider.createBooking({
            request_id: "req-http-002",
            service_id: "SERVICE_001",
            task_id: "TASK_BOOKING_002",
            input: { lead_id: "lead_002", requested_time: "2026-09-20T11:00:00Z", duration_minutes: 30 }
        }),
        /CALENDAR_PROVIDER_409: slot unavailable/
    );

    console.log("HTTP Calendar Provider V1 tests: PASS");
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
