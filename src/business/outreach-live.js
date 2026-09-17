"use strict";

/**
 * Outreach Live - Level 2
 * System prepares personalized outreach messages from prospects.
 * Human only Approves / Rejects before send.
 */
class OutreachLive {
  constructor(options = {}) {
    this.serviceOffer =
      options.serviceOffer ||
      "AI automation for lead generation, follow-ups, and client management";
    this.senderName = options.senderName || "MR Wali";
    this.senderRole = options.senderRole || "AI Business Systems";
  }

  /**
   * Generate outreach messages for a list of prospects.
   * @param {Array} prospects - from ProspectDiscoveryLive
   * @returns {{ executed, status, messages, total }}
   */
  prepare(prospects = []) {
    if (!Array.isArray(prospects) || prospects.length === 0) {
      return {
        executed: false,
        status: "BLOCKED",
        message: "No prospects found. Run prospect discovery first.",
        messages: [],
        total: 0
      };
    }

    const messages = prospects.map((p, index) => {
      const name = p.name || "there";
      const channel = p.phone ? "WhatsApp/Phone" : p.website ? "Website/Email" : "Direct";

      const subject = `Quick idea for ${name}`;

      const body = [
        `Hi ${name} team,`,
        ``,
        `I noticed your real estate work and wanted to share something practical.`,
        ``,
        `We help agencies like yours with ${this.serviceOffer} — so your team spends less time on manual follow-ups and more time closing deals.`,
        ``,
        `Would you be open to a short 10-minute call this week to see if it fits?`,
        ``,
        `Best regards,`,
        `${this.senderName}`,
        `${this.senderRole}`
      ].join("\n");

      return {
        id: `outreach_${index + 1}`,
        prospect_id: p.id || `prospect_${index + 1}`,
        prospect_name: name,
        phone: p.phone || "",
        website: p.website || "",
        channel,
        subject,
        body,
        status: "PENDING_APPROVAL",
        created_at: new Date().toISOString()
      };
    });

    return {
      executed: true,
      status: "COMPLETE",
      mode: "PREPARE",
      total: messages.length,
      messages,
      message: `Prepared ${messages.length} outreach messages. Waiting for your approval before send.`
    };
  }

  /**
   * Mark messages as approved (ready to send).
   */
  approve(messages = [], ids = null) {
    const list = Array.isArray(messages) ? messages : [];
    const approved = list.map((m) => {
      if (!ids || ids.includes(m.id)) {
        return { ...m, status: "APPROVED" };
      }
      return m;
    });
    return {
      executed: true,
      status: "COMPLETE",
      total: approved.filter((m) => m.status === "APPROVED").length,
      messages: approved,
      message: `Approved messages ready. Next: send or export.`
    };
  }
}

module.exports = OutreachLive;
