"use strict";

class InboundReplyClassifierV1 {
    classify(input = {}) {
        const text = String(input.text || "").trim();
        const requestId = String(input.request_id || "").trim();
        const opportunityId = String(input.opportunity_id || "").trim();
        if (!requestId || !opportunityId || !text) {
            return { status: "REJECTED", reason: "REQUIRED_REPLY_CONTEXT_MISSING", request_id: requestId || null, opportunity_id: opportunityId || null };
        }

        const normalized = text.toLowerCase();
        const negative = /\b(no|not interested|unsubscribe|remove me|stop|do not contact)\b/.test(normalized);
        const positive = /\b(yes|yeah|yep|sure|interested|sounds good|let'?s talk|book|call me|send details)\b/.test(normalized);
        const meeting = /\b(today|tomorrow|this week|next week|schedule|meeting|call|available|availability)\b/.test(normalized);

        let classification = "NEEDS_REVIEW";
        let nextAction = "HUMAN_REVIEW";
        if (negative) {
            classification = "NOT_INTERESTED";
            nextAction = "STOP_OUTREACH";
        } else if (positive && meeting) {
            classification = "MEETING_INTENT";
            nextAction = "REQUEST_MEETING_APPROVAL";
        } else if (positive) {
            classification = "INTERESTED";
            nextAction = "REQUEST_FOLLOW_UP_APPROVAL";
        }

        return {
            status: "CLASSIFIED",
            request_id: requestId,
            opportunity_id: opportunityId,
            classification,
            next_action: nextAction,
            evidence: { deterministic: true, source: input.source || "INBOUND_CHANNEL", text_received: true }
        };
    }
}

module.exports = { InboundReplyClassifierV1 };
