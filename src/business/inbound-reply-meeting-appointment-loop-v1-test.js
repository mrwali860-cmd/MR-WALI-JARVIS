"use strict";

const assert = require("assert");
const { InboundReplyWebhookV1 } = require("./inbound-reply-webhook-v1");
const { InboundReplyClassifierV1 } = require("./inbound-reply-classifier-v1");
const { InboundMeetingIntentBridgeV1 } = require("./inbound-meeting-intent-bridge-v1");

const secret = "test-secret";
const webhook = new InboundReplyWebhookV1({ secret });
const classifier = new InboundReplyClassifierV1();
const bridge = new InboundMeetingIntentBridgeV1();

const accepted = webhook.accept({
    request_id: "req-real-loop-1",
    opportunity_id: "opp-dubai-1",
    source: "EMAIL",
    external_message_id: "msg-1",
    text: "Yes, let's schedule a meeting tomorrow"
}, secret);

assert.equal(accepted.status, "ACCEPTED");

const classification = classifier.classify(accepted);
assert.equal(classification.classification, "MEETING_INTENT");
assert.equal(classification.next_action, "REQUEST_MEETING_APPROVAL");

const appointment = bridge.createAppointmentRequest({
    classification,
    request_id: accepted.request_id,
    opportunity_id: accepted.opportunity_id,
    requested_time: "2026-09-28T15:00:00+04:00",
    duration_minutes: 30
});

assert.equal(appointment.status, "PENDING_APPROVAL");
assert.equal(appointment.next_action, "REQUEST_MEETING_APPROVAL");
assert.equal(appointment.execution, "BOOKING_REQUIRES_APPROVAL");

const rejected = webhook.accept({
    request_id: "req-real-loop-2",
    opportunity_id: "opp-dubai-2",
    text: "Yes, schedule tomorrow"
}, "wrong-secret");

assert.equal(rejected.status, "REJECTED");
assert.equal(rejected.reason, "WEBHOOK_AUTH_REQUIRED");

console.log("Inbound Reply -> Meeting Intent -> Appointment Approval Loop V1: PASS");
