"use strict";

/**
 * Email Outreach Provider V1
 * Sends only messages already marked APPROVED.
 * Uses Resend HTTP API without adding another npm dependency.
 *
 * Required env:
 * RESEND_API_KEY
 * OUTREACH_FROM_EMAIL
 *
 * Optional safety gate:
 * EMAIL_OUTREACH_ENABLED=true
 */
class EmailOutreachProviderV1 {
  constructor(options = {}) {
    this.apiKey = Object.prototype.hasOwnProperty.call(options, "apiKey")
      ? options.apiKey
      : (process.env.RESEND_API_KEY || null);
    this.from = options.from || process.env.OUTREACH_FROM_EMAIL || null;
    this.enabled = Object.prototype.hasOwnProperty.call(options, "enabled")
      ? options.enabled
      : process.env.EMAIL_OUTREACH_ENABLED === "true";
    this.maxPerRun = Number(options.maxPerRun || process.env.OUTREACH_MAX_PER_RUN || 10);
  }

  validateMessage(message) {
    return Boolean(
      message &&
      message.status === "APPROVED" &&
      typeof message.email === "string" &&
      /@/.test(message.email) &&
      typeof message.subject === "string" &&
      message.subject.trim() &&
      typeof message.body === "string" &&
      message.body.trim()
    );
  }

  async sendApproved(messages = []) {
    if (!this.enabled) {
      return { executed: false, status: "BLOCKED", reason: "EMAIL_OUTREACH_ENABLED is not true", sent: [] };
    }
    if (!this.apiKey || !this.from) {
      return { executed: false, status: "BLOCKED", reason: "RESEND_API_KEY or OUTREACH_FROM_EMAIL missing", sent: [] };
    }

    const approved = (Array.isArray(messages) ? messages : [])
      .filter(m => this.validateMessage(m))
      .slice(0, this.maxPerRun);

    const sent = [];
    for (const message of approved) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: this.from,
          to: [message.email],
          subject: message.subject,
          text: message.body
        })
      });

      const body = await response.text();
      let data;
      try { data = JSON.parse(body); } catch { data = { raw: body }; }

      if (!response.ok) {
        return {
          executed: false,
          status: "PARTIAL_FAILURE",
          reason: data?.message || `RESEND_${response.status}`,
          sent
        };
      }

      sent.push({
        id: message.id,
        email: message.email,
        provider_id: data?.id || null,
        status: "SENT"
      });
    }

    return {
      executed: true,
      status: "COMPLETE",
      total: sent.length,
      sent
    };
  }
}

module.exports = { EmailOutreachProviderV1 };
