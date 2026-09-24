"use strict";

const assert = require("assert");
const { InboundMeetingIntentBridgeV1 } = require("./inbound-meeting-intent-bridge-v1");

const bridge = new InboundMeetingIntentBridgeV1();

assert.deepEqual(
    bridge.createAppointmentRequest({
        classification: { classification: "MEETING_INTENT" },
        opportunity_id: "opp-1",
        request_id: "req-1",
        requested_time: "2026-09-25T15:00:00+04:00",
        duration_minutes: 30
    }),
    {
        status: "PENDING_APPROVAL",
        request_id: "req-1",
        opportunity_id: "opp-1",
        requested_time: "2026-09-25T15:00:00+04:00",
        duration_minutes: 30,
        next_action: "REQUEST_MEETING_APPROVAL",
        execution: "BOOKING_REQUIRES_APPROVAL"
    }
);

assert.throws(
    () => bridge.createAppointmentRequest({
        classification: { classification: "INTERESTED" },
        opportunity_id: "opp-1",
        request_id: "req-1"
    }),
    /MEETING_INTENT_REQUIRED/
);

assert.throws(
    () => bridge.createAppointmentRequest({
        classification: { classification: "MEETING_INTENT" },
        opportunity_id: "opp-1"
    }),
    /MEETING_INTENT_CONTEXT_REQUIRED/
);

console.log("Inbound Meeting Intent Bridge V1: PASS");
