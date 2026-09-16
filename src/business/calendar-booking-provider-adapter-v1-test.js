"use strict";

const assert = require("assert");
const CalendarBookingProviderAdapterV1 = require("./calendar-booking-provider-adapter-v1");
const ExternalExecutionBoundary = require("./external-execution-boundary");

(async () => {
    const calls = [];
    const adapter = new CalendarBookingProviderAdapterV1({
        provider: "CALENDAR_TEST_PROVIDER",
        perform(payload) {
            calls.push(payload);
            return { booking_id: "booking-001", status: "CONFIRMED" };
        }
    });

    const boundary = new ExternalExecutionBoundary({
        adapters: { CALENDAR_TEST_PROVIDER: adapter }
    });

    assert.throws(
        () => boundary.execute({
            request_id: "req-001",
            service_id: "svc-001",
            task_id: "booking-001",
            action: "BOOKING_EXECUTION",
            provider: "CALENDAR_TEST_PROVIDER",
            input: { lead_id: "lead-001", requested_time: "2026-10-01T10:00:00Z", duration_minutes: 30 }
        }),
        /AUTHORIZATION_REQUIRED/
    );

    const success = boundary.execute({
        request_id: "req-001",
        service_id: "svc-001",
        task_id: "booking-001",
        action: "BOOKING_EXECUTION",
        provider: "CALENDAR_TEST_PROVIDER",
        approval_context: { allowed: true },
        input: { lead_id: "lead-001", requested_time: "2026-10-01T10:00:00Z", duration_minutes: 30 }
    });

    assert.equal(success.success, true);
    assert.equal(success.provider, "CALENDAR_TEST_PROVIDER");
    assert.equal(success.action, "BOOKING_EXECUTION");
    assert.equal(success.result.booking_id, "booking-001");
    assert.equal(calls.length, 1);
    assert.equal(calls[0].request_id, "req-001");
    assert.equal(calls[0].operation, "create_booking");
    assert.equal(calls[0].input.lead_id, "lead-001");
    assert.equal(calls[0].input.duration_minutes, 30);

    assert.throws(
        () => boundary.execute({
            request_id: "req-002",
            service_id: "svc-001",
            task_id: "booking-002",
            action: "BOOKING_EXECUTION",
            provider: "MISSING_PROVIDER",
            approval_context: { allowed: true },
            input: { lead_id: "lead-001", requested_time: "2026-10-01T10:00:00Z", duration_minutes: 30 }
        }),
        /UNSUPPORTED_PROVIDER/
    );

    assert.throws(
        () => boundary.execute({
            request_id: "req-003",
            service_id: "svc-001",
            task_id: "booking-003",
            action: "CRM_RECORD",
            provider: "CALENDAR_TEST_PROVIDER",
            approval_context: { allowed: true },
            input: { lead_id: "lead-001", requested_time: "2026-10-01T10:00:00Z", duration_minutes: 30 }
        }),
        /UNSUPPORTED_ACTION/
    );

    const failingAdapter = new CalendarBookingProviderAdapterV1({
        provider: "CALENDAR_FAIL_PROVIDER",
        perform() {
            const error = new Error("calendar unavailable");
            error.code = "CALENDAR_UNAVAILABLE";
            throw error;
        }
    });
    const failingBoundary = new ExternalExecutionBoundary({
        adapters: { CALENDAR_FAIL_PROVIDER: failingAdapter }
    });

    const failure = failingBoundary.execute({
        request_id: "req-004",
        service_id: "svc-001",
        task_id: "booking-004",
        action: "BOOKING_EXECUTION",
        provider: "CALENDAR_FAIL_PROVIDER",
        approval_context: { allowed: true },
        input: { lead_id: "lead-001", requested_time: "2026-10-01T10:00:00Z", duration_minutes: 30 }
    });

    assert.equal(failure.success, false);
    assert.equal(failure.error.code, "CALENDAR_UNAVAILABLE");

    assert.throws(
        () => adapter.execute({
            request_id: "req-005",
            service_id: "svc-001",
            task_id: "booking-005",
            action: "BOOKING_EXECUTION",
            input: { lead_id: "lead-001", duration_minutes: 30 }
        }),
        /BOOKING_INPUT_INVALID/
    );

    console.log("calendar booking provider adapter v1 tests: PASS");
})();
