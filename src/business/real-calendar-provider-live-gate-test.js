"use strict";

/**
 * Real Calendar Provider Live Gate V1.
 *
 * This test is intentionally opt-in. Standard CI must never create a real
 * external booking. A live run requires explicit operator intent plus a
 * non-production/test provider endpoint and runtime credentials.
 */
const assert = require("assert");
const HttpCalendarProviderV1 = require("./http-calendar-provider-v1");

(async () => {
    const enabled = process.env.LIVE_PROVIDER_TEST === "true";
    if (!enabled) {
        console.log("REAL CALENDAR PROVIDER LIVE GATE: BLOCKED (opt-in required)");
        console.log("Set LIVE_PROVIDER_TEST=true only for an intentional live-provider test run.");
        return;
    }

    const baseUrl = String(process.env.CALENDAR_BASE_URL || "").trim();
    const token = String(process.env.CALENDAR_TOKEN || "").trim();
    const serviceId = String(process.env.CALENDAR_TEST_SERVICE_ID || "").trim();
    const taskId = String(process.env.CALENDAR_TEST_TASK_ID || "").trim();
    const leadId = String(process.env.CALENDAR_TEST_LEAD_ID || "").trim();
    const requestedTime = String(process.env.CALENDAR_TEST_REQUESTED_TIME || "").trim();
    const duration = Number(process.env.CALENDAR_TEST_DURATION_MINUTES || "30");

    for (const [name, value] of Object.entries({ baseUrl, token, serviceId, taskId, leadId, requestedTime })) {
        assert.ok(value, `${name.toUpperCase()}_REQUIRED`);
    }
    assert.ok(Number.isInteger(duration) && duration > 0, "CALENDAR_TEST_DURATION_INVALID");
    assert.ok(/^https:\/\//i.test(baseUrl), "CALENDAR_BASE_URL_MUST_USE_HTTPS");
    assert.ok(/(sandbox|staging|test|localhost|127\.0\.0\.1)/i.test(baseUrl), "LIVE_GATE_REQUIRES_NON_PRODUCTION_ENDPOINT");

    const requestId = `live-calendar-gate-${Date.now()}`;
    const provider = new HttpCalendarProviderV1({ baseUrl, token });
    const result = await provider.createBooking({
        request_id: requestId,
        service_id: serviceId,
        task_id: taskId,
        input: { lead_id: leadId, requested_time: requestedTime, duration_minutes: duration }
    });

    assert.strictEqual(result.status, "COMPLETE");
    assert.strictEqual(result.request_id, requestId);
    assert.strictEqual(result.service_id, serviceId);
    assert.strictEqual(result.task_id, taskId);
    assert.ok(result.booking);
    assert.ok(!JSON.stringify(result).includes(token), "SECRET_LEAKED_IN_RESULT");

    console.log("REAL CALENDAR PROVIDER LIVE GATE: PASS");
    console.log(`request_id=${requestId}`);
    console.log(`booking_id=${result.booking.booking_id || result.booking.id || "provider-response"}`);
})().catch((error) => {
    console.error("REAL CALENDAR PROVIDER LIVE GATE: FAILED");
    console.error(error.message);
    process.exitCode = 1;
});
