"use strict";

/**
 * Authorized Outreach Provider V1
 *
 * Sends only messages that have an explicit APPROVED status.
 * The endpoint is an external, user-authorized transport (for example an
 * n8n webhook). Credentials are supplied at runtime and are never persisted.
 */
class HttpOutreachProviderV1 {
    constructor({ endpoint, token, fetchImpl } = {}) {
        this.endpoint = String(endpoint || process.env.JARVIS_OUTREACH_WEBHOOK_URL || "").trim();
        this.token = String(token || process.env.JARVIS_OUTREACH_WEBHOOK_TOKEN || "").trim();
        this.fetchImpl = fetchImpl || globalThis.fetch;
    }

    validate(message) {
        if (!message || typeof message !== "object") throw new Error("MESSAGE_REQUIRED");
        if (message.status !== "APPROVED") throw new Error("OUTREACH_APPROVAL_REQUIRED");
        if (!message.id) throw new Error("MESSAGE_ID_REQUIRED");
        if (!message.channel) throw new Error("CHANNEL_REQUIRED");
        if (!message.prospect_name) throw new Error("PROSPECT_REQUIRED");
        if (!message.body) throw new Error("MESSAGE_BODY_REQUIRED");
        if (!this.endpoint) throw new Error("OUTREACH_ENDPOINT_REQUIRED");
        if (typeof this.fetchImpl !== "function") throw new Error("FETCH_UNAVAILABLE");
        return message;
    }

    async send(message) {
        const approved = this.validate(message);
        const headers = { "content-type": "application/json" };
        if (this.token) headers.authorization = `Bearer ${this.token}`;

        const response = await this.fetchImpl(this.endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify({
                id: approved.id,
                prospect_id: approved.prospect_id || null,
                prospect_name: approved.prospect_name,
                channel: approved.channel,
                phone: approved.phone || "",
                website: approved.website || "",
                subject: approved.subject || "",
                body: approved.body,
                status: "APPROVED"
            })
        });

        const responseBody = await this.readResponse(response);
        if (!response.ok) {
            const error = new Error(`OUTREACH_PROVIDER_HTTP_${response.status}`);
            error.provider_response = responseBody;
            throw error;
        }

        return {
            status: "SENT",
            executed: true,
            message_id: approved.id,
            provider: "HTTP_OUTREACH",
            provider_response: responseBody
        };
    }

    async readResponse(response) {
        const contentType = String(response.headers?.get?.("content-type") || "").toLowerCase();
        if (contentType.includes("application/json")) {
            try { return await response.json(); } catch (_) { return null; }
        }
        try { return await response.text(); } catch (_) { return null; }
    }
}

module.exports = { HttpOutreachProviderV1 };
