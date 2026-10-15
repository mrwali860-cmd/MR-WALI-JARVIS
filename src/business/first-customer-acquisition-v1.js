"use strict";

/**
 * First Customer Acquisition Engine V1
 * Converts verified prospect records into a small, auditable sales pipeline.
 * Draft-only: never sends messages, invents prospect facts, or marks a sale as won.
 */

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isPlaceholder(value) {\n  const normalized = clean(value).toLowerCase();\n  return !normalized || normalized.startsWith("replace_with_") || normalized.includes("example.test");\n}\n\nfunction prospectIdentity(p) {
  const website = clean(p.website).toLowerCase().replace(/\/$/, "");
  if (website) return `website:${website}`;
  const email = clean(p.email).toLowerCase();
  if (email) return `email:${email}`;
  const phone = clean(p.phone).replace(/[^+\d]/g, "");
  if (phone) return `phone:${phone}`;
  return `company:${clean(p.company).toLowerCase()}|${clean(p.city).toLowerCase()}`;
}

class FirstCustomerAcquisitionV1 {
  constructor(options = {}) {
    this.targetMarket = clean(options.targetMarket) || "Pakistan small businesses";
    this.offer = clean(options.offer) || "a simple inquiry-response and follow-up workflow";
    this.outcome = clean(options.outcome) || "help reduce missed enquiries and make follow-up more consistent";
    this.senderName = clean(options.senderName) || "MR WALI";
    this.contactRequest = clean(options.contactRequest) || "Would you be open to a brief 10-minute conversation this week?";
  }

  build(prospects = []) {
    if (!Array.isArray(prospects)) {
      return { status: "REJECTED", reason: "PROSPECTS_MUST_BE_AN_ARRAY", prospects: [], summary: this.emptySummary() };
    }

    const seen = new Set();
    const rows = [];
    let rejected = 0;

    for (const raw of prospects) {
      if (!raw || typeof raw !== "object" || Array.isArray(raw) || isPlaceholder(raw.company)) {
        rejected++;
        continue;
      }

      const identity = prospectIdentity(raw);
      if (seen.has(identity)) {
        rejected++;
        continue;
      }
      seen.add(identity);

      const company = clean(raw.company);
      const category = clean(raw.category);
      const city = clean(raw.city);
      const website = clean(raw.website);
      const email = clean(raw.email);
      const phone = clean(raw.phone);
      const hasContact = Boolean(email || phone);\n      const verified = raw.verified_by_human === true;
      const contactStatus = hasContact ? "CONTACT_AVAILABLE" : "CONTACT_REQUIRED";
      const problemEvidence = clean(raw.observed_problem);
      const personalization = problemEvidence
        ? `I noticed this publicly available detail: ${problemEvidence}`
        : "I do not want to assume how your team currently handles enquiries, so I wanted to ask first.";

      const body = [
        `Hello ${company} team,`,
        "",
        `I’m reaching out to businesses in ${city || this.targetMarket} to learn how they handle new customer enquiries and follow-ups.`,
        "",
        `I’m testing ${this.offer}. The goal is to ${this.outcome}.`,
        personalization,
        "",
        this.contactRequest,
        "",
        `Regards,\n${this.senderName}`
      ].join("\n");

      const followUp = [
        `Hello ${company} team,`,
        "",
        "Just following up on my earlier note. If enquiry handling or follow-up is a current challenge, I can show a small, practical pilot before suggesting anything larger.",
        "",
        "If this is not relevant, no problem—please let me know."
      ].join("\n");

      rows.push({
        prospect_id: `prospect_${rows.length + 1}`,
        company,
        category,
        city,
        website,
        email,
        phone,
        identity,
        contact_status: contactStatus,
        stage: hasContact && verified ? "DRAFT_READY_FOR_REVIEW" : (hasContact ? "NEEDS_VERIFICATION" : "NEEDS_CONTACT_RESEARCH"),
        offer: this.offer,
        outreach_draft: body,
        follow_up_draft: followUp,
        approval_required: true,
        send_status: "NOT_SENT",
        observed_problem: problemEvidence,
        evidence: {
          source_url: clean(raw.source_url),
          verified_by_human: raw.verified_by_human === true,
          unsupported_company_claims_added: false
        }
      });
    }

    return {
      status: "COMPLETE",
      mode: "DRAFT_ONLY",
      target_market: this.targetMarket,
      offer: this.offer,
      prospects: rows,
      summary: {
        input_count: prospects.length,
        accepted_count: rows.length,
        rejected_or_duplicate_count: rejected,
        contact_available: rows.filter(p => p.contact_status === "CONTACT_AVAILABLE").length,
        contact_required: rows.filter(p => p.contact_status === "CONTACT_REQUIRED").length,
        drafts_ready_for_review: rows.filter(p => p.stage === "DRAFT_READY_FOR_REVIEW").length,\n        verification_required: rows.filter(p => p.stage === "NEEDS_VERIFICATION").length,
        approvals_required: rows.length,
        messages_sent: 0,
        sales_won: 0
      },
      controls: {
        external_execution: false,
        automatic_send: false,
        approval_required_before_contact: true,
        sales_require_evidence: true
      }
    };
  }

  emptySummary() {
    return {
      input_count: 0,
      accepted_count: 0,
      rejected_or_duplicate_count: 0,
      contact_available: 0,
      contact_required: 0,
      drafts_ready_for_review: 0,\n      verification_required: 0,
      approvals_required: 0,
      messages_sent: 0,
      sales_won: 0
    };
  }
}

module.exports = { FirstCustomerAcquisitionV1, prospectIdentity };
