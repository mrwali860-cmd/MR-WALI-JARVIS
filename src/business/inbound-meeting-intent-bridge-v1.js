"use strict";

/**
 * Inbound Meeting Intent Bridge V1.
 *
 * Converts a classified MEETING_INTENT into an approval-gated appointment
 * request. It deliberately does not book or contact anyone.
 */
class InboundMeetingIntentBridgeV1 {
    createAppointmentRequest({ classification, opportunity_id, request_id, requested_time = null, duration_minutes = 30 } = {}) {
        if (!request_id || !opportunity_id) throw new Error("MEETING_INTENT_CONTEXT_REQUIRED");
        if (!classification || classification.classification !== "MEETING_INTENT") {
            throw new Error("MEETING_INTENT_REQUIRED");
        }

        return {
            status: "PENDING_APPROVAL",
            request_id: String(request_id),
            opportunity_id: String(opportunity_id),
            requested_time: requested_time ? String(requested_time) : null,
            duration_minutes: Number(duration_minutes) || 30,
            next_action: "REQUEST_MEETING_APPROVAL",
            execution: "BOOKING_REQUIRES_APPROVAL"
        };
    }
}

module.exports = { InboundMeetingIntentBridgeV1 };
