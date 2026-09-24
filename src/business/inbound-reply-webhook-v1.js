"use strict";

/**
 * Inbound Reply Webhook Adapter V1.
 * Accepts normalized inbound events from an authorized channel bridge.
 * It does not send messages or expose provider credentials.
 */
class InboundReplyWebhookV1 {
    constructor({ secret } = {}) {
        this.secret = String(secret || process.env.JARVIS_INBOUND_WEBHOOK_SECRET || "").trim();
    }

    accept(event = {}, suppliedSecret = "") {
        if (!this.secret || suppliedSecret !== this.secret) {
            return { status: "REJECTED", reason: "WEBHOOK_AUTH_REQUIRED" };
        }
        if (!event.request_id || !event.opportunity_id || !event.text) {
            return { status: "REJECTED", reason: "REQUIRED_REPLY_CONTEXT_MISSING" };
        }
        return {
            status: "ACCEPTED",
            request_id: String(event.request_id),
            opportunity_id: String(event.opportunity_id),
            source: String(event.source || "INBOUND_CHANNEL"),
            external_message_id: event.external_message_id ? String(event.external_message_id) : null,
            text: String(event.text)
        };
    }
}
module.exports = { InboundReplyWebhookV1 };
