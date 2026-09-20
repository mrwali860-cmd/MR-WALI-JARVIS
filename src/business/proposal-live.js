"use strict";

const { getFirstSellableService } = require("./first-service-contract");

/**
 * Proposal Live - Level 3
 * Qualify prospects → match first sellable service → draft proposal.
 * Human only approves the final proposal.
 */
class ProposalLive {
  constructor(options = {}) {
    this.service = options.service || getFirstSellableService();
    this.senderName = options.senderName || "MR Wali";
    this.senderRole = options.senderRole || "AI Business Systems";
    this.priceHint = options.priceHint || "Custom quote after short discovery call";
  }

  /**
   * Build proposals from prospects (and optional outreach status).
   */
  prepare(prospects = [], options = {}) {
    if (!Array.isArray(prospects) || prospects.length === 0) {
      return {
        executed: false,
        status: "BLOCKED",
        message: "No prospects found. Run prospect discovery first.",
        proposals: [],
        total: 0
      };
    }

    const limit = options.limit || prospects.length;
    const selected = prospects.slice(0, limit);

    const proposals = selected.map((p, index) => {
      const name = p.name || "Prospect";
      const market = this.inferMarket(p);
      const qualified = market === "REAL_ESTATE";
      const problem = this.service.customer_problem;

      const body = [
        `Proposal for: ${name}`,
        ``,
        `Service: ${this.service.name}`,
        `Service ID: ${this.service.service_id}`,
        ``,
        `Problem we solve:`,
        problem,
        ``,
        `Business outcome:`,
        this.service.business_outcome,
        ``,
        `What you get:`,
        `- Lead intake automation`,
        `- Lead qualification flow`,
        `- Appointment request + booking approval gate`,
        `- CRM record of booked appointments`,
        ``,
        `Investment: ${this.priceHint}`,
        ``,
        `Next step: 10-minute call to confirm fit and timeline.`,
        ``,
        `Prepared by: ${this.senderName} | ${this.senderRole}`
      ].join("\n");

      return {
        id: `proposal_${index + 1}`,
        prospect_id: p.id || `prospect_${index + 1}`,
        prospect_name: name,
        phone: p.phone || "",
        website: p.website || "",
        market,
        qualification: qualified ? "QUALIFIED" : "NEEDS_REVIEW",
        service_id: this.service.service_id,
        service_name: this.service.name,
        problem,
        body,
        status: "PENDING_APPROVAL",
        created_at: new Date().toISOString()
      };
    });

    const qualifiedCount = proposals.filter((x) => x.qualification === "QUALIFIED").length;

    return {
      executed: true,
      status: "COMPLETE",
      mode: "PREPARE",
      total: proposals.length,
      qualified_count: qualifiedCount,
      proposals,
      message: `Prepared ${proposals.length} proposals (${qualifiedCount} qualified for ${this.service.name}). Waiting for approval.`
    };
  }

  approve(proposals = [], ids = null) {
    const list = Array.isArray(proposals) ? proposals : [];
    const approved = list.map((p) => {
      if (!ids || ids.includes(p.id)) {
        return { ...p, status: "APPROVED" };
      }
      return p;
    });
    return {
      executed: true,
      status: "COMPLETE",
      total: approved.filter((p) => p.status === "APPROVED").length,
      proposals: approved,
      message: `Approved proposals ready. Next: share with prospect or move to delivery planning.`
    };
  }

  inferMarket(prospect) {
    const text = [
      prospect.name,
      prospect.category,
      prospect.address,
      prospect.website
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (
      text.includes("real estate") ||
      text.includes("estate agent") ||
      text.includes("property") ||
      text.includes("immobilien") ||
      text.includes("realtor") ||
      text.includes("dubai")
    ) {
      return "REAL_ESTATE";
    }
    return "UNKNOWN";
  }
}

module.exports = ProposalLive;
