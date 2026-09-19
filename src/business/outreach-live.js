"use strict";

const fs = require("fs");
const path = require("path");

/**
 * Outreach Live - Level 2
 * System prepares personalized outreach messages from prospects.
 * Human only Approves / Rejects before send.
 * Export writes approved messages for manual send.
 */
class OutreachLive {
  constructor(options = {}) {
    this.serviceOffer =
      options.serviceOffer ||
      "AI automation for lead generation, follow-ups, and client management";
    this.senderName = options.senderName || "MR Wali";
    this.senderRole = options.senderRole || "AI Business Systems";
    this.exportDir = options.exportDir || process.cwd();
  }

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

  /**
   * Export approved messages to CSV + human-readable TXT in project folder.
   */
  export(messages = []) {
    const list = (Array.isArray(messages) ? messages : []).filter(
      (m) => m.status === "APPROVED"
    );

    if (!list.length) {
      return {
        executed: false,
        status: "BLOCKED",
        message: "No outreach messages to export. Run prepare outreach first.",
        files: []
      };
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const csvPath = path.join(this.exportDir, `outreach-export-${stamp}.csv`);
    const txtPath = path.join(this.exportDir, `outreach-export-${stamp}.txt`);

    const escapeCsv = (value) => {
      const s = String(value == null ? "" : value);
      if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const csvHeader = ["id", "prospect_name", "phone", "website", "channel", "status", "subject", "body"];
    const csvRows = list.map((m) =>
      [m.id, m.prospect_name, m.phone, m.website, m.channel, m.status, m.subject, m.body]
        .map(escapeCsv)
        .join(",")
    );
    fs.writeFileSync(csvPath, [csvHeader.join(","), ...csvRows].join("\n"), "utf8");

    const txt = list
      .map(
        (m, i) =>
          [
            `===== ${i + 1}. ${m.prospect_name} =====`,
            `Status: ${m.status}`,
            `Phone: ${m.phone || "-"}`,
            `Website: ${m.website || "-"}`,
            `Channel: ${m.channel || "-"}`,
            `Subject: ${m.subject || "-"}`,
            ``,
            m.body || "",
            ``
          ].join("\n")
      )
      .join("\n");
    fs.writeFileSync(txtPath, txt, "utf8");

    return {
      executed: true,
      status: "COMPLETE",
      total: list.length,
      files: [csvPath, txtPath],
      message: `Exported ${list.length} messages.\n\nCSV: ${csvPath}\nTXT: ${txtPath}\n\nOpen these files and send manually via WhatsApp/Email.`
    };
  }
}

module.exports = OutreachLive;
