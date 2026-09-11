"use strict";

const ComponentContract = require("../../contracts/component-contract");

const STAGES = Object.freeze([
    "PROSPECT", "QUALIFIED", "CONTACTED", "REPLIED", "CALL_REQUESTED",
    "OFFER_SENT", "APPROVED", "PAYMENT_PENDING", "PAID", "DELIVERING", "DELIVERED", "LOST"
]);

const TERMINAL = new Set(["PAID", "DELIVERED", "LOST"]);

class RevenueEngineV1 extends ComponentContract {
    constructor(config = {}) {
        super({ id: "REVENUE_ENGINE_V1", name: "Revenue Engine V1", version: "1.0.0", status: "AVAILABLE", ...config });
        this.opportunities = new Map();
        this.offers = new Map();
        this.payments = new Map();
    }

    validateOpportunity(input = {}) {
        for (const key of ["opportunity_id", "request_id", "service_id", "company", "contact"]) {
            if (!String(input[key] ?? "").trim()) throw new Error(`REVENUE_ENGINE: ${key} is required`);
        }
    }

    acquire(input = {}) {
        this.validateOpportunity(input);
        const id = String(input.opportunity_id).trim();
        const existing = this.opportunities.get(id);
        if (existing) return { ...existing, duplicate: true };
        const opportunity = {
            opportunity_id: id,
            request_id: String(input.request_id).trim(),
            service_id: String(input.service_id).trim(),
            company: String(input.company).trim(),
            contact: String(input.contact).trim(),
            market: String(input.market || "").trim(),
            problem: String(input.problem || "").trim(),
            score: this.score(input), stage: "PROSPECT", next_action: "QUALIFY",
            created_at: new Date().toISOString()
        };
        this.opportunities.set(id, opportunity);
        return { ...opportunity };
    }

    score(input = {}) {
        let score = 0;
        if (String(input.market || "").trim()) score += 25;
        if (String(input.problem || "").trim()) score += 25;
        if (String(input.contact || "").trim()) score += 20;
        if (String(input.budget || "").trim()) score += 20;
        if (input.urgency === true) score += 10;
        return score;
    }

    advance(opportunityId, stage, nextAction) {
        const item = this.opportunities.get(opportunityId);
        if (!item) throw new Error("REVENUE_ENGINE: opportunity not found");
        if (!STAGES.includes(stage)) throw new Error(`REVENUE_ENGINE: unsupported stage ${stage}`);
        item.stage = stage;
        item.next_action = nextAction || (TERMINAL.has(stage) ? null : "CONTINUE_SALES");
        item.updated_at = new Date().toISOString();
        return { ...item };
    }

    createOffer(input = {}) {
        const opportunity = this.opportunities.get(input.opportunity_id);
        if (!opportunity) throw new Error("REVENUE_ENGINE: opportunity not found");
        if (!(Number(input.amount) > 0)) throw new Error("REVENUE_ENGINE: offer amount must be positive");
        const offer = {
            offer_id: String(input.offer_id || `${opportunity.opportunity_id}-OFFER`).trim(),
            opportunity_id: opportunity.opportunity_id,
            service_id: opportunity.service_id,
            problem: String(input.problem || opportunity.problem).trim(),
            outcome: String(input.outcome || "Qualified leads and approved appointment workflow").trim(),
            amount: Number(input.amount),
            currency: String(input.currency || "USD").trim().toUpperCase(),
            status: "OFFER_SENT", created_at: new Date().toISOString()
        };
        this.offers.set(offer.offer_id, offer);
        this.advance(opportunity.opportunity_id, "OFFER_SENT", "AWAIT_CLIENT_APPROVAL");
        return { ...offer };
    }

    approveOffer(offerId) {
        const offer = this.offers.get(offerId);
        if (!offer) throw new Error("REVENUE_ENGINE: offer not found");
        if (offer.status !== "OFFER_SENT") throw new Error("REVENUE_ENGINE: offer cannot be approved from current status");
        offer.status = "APPROVED";
        this.advance(offer.opportunity_id, "APPROVED", "REQUEST_PAYMENT");
        return { ...offer };
    }

    confirmPayment(input = {}) {
        const offer = this.offers.get(input.offer_id);
        if (!offer) throw new Error("REVENUE_ENGINE: offer not found");
        if (offer.status !== "APPROVED") throw new Error("REVENUE_ENGINE: payment requires approved offer");
        if (String(input.payment_status).trim().toUpperCase() !== "CONFIRMED") throw new Error("REVENUE_ENGINE: payment must be CONFIRMED");
        const reference = String(input.transaction_reference || "").trim();
        if (!reference) throw new Error("REVENUE_ENGINE: transaction_reference is required");
        if (this.payments.has(reference)) return { ...this.payments.get(reference), duplicate: true };
        const payment = {
            offer_id: offer.offer_id, opportunity_id: offer.opportunity_id,
            amount: offer.amount, currency: offer.currency,
            transaction_reference: reference, payment_status: "CONFIRMED",
            confirmed_at: new Date().toISOString()
        };
        this.payments.set(reference, payment);
        offer.status = "PAID";
        this.advance(opportunity.opportunity_id, "PAID", "START_DELIVERY");
        return { ...payment };
    }

    intelligence() {
        const opportunities = [...this.opportunities.values()];
        const paid = opportunities.filter((x) => x.stage === "PAID" || x.stage === "DELIVERING" || x.stage === "DELIVERED").length;
        return {
            opportunities: opportunities.length,
            qualified: opportunities.filter((x) => x.stage !== "PROSPECT" && x.stage !== "LOST").length,
            offers_sent: [...this.offers.values()].length,
            deals_won: paid,
            cash_collected: [...this.payments.values()].reduce((sum, x) => sum + x.amount, 0),
            currency: [...this.payments.values()][0]?.currency || null,
            pipeline: Object.fromEntries(STAGES.map((stage) => [stage, opportunities.filter((x) => x.stage === stage).length]))
        };
    }

    execute(input = {}) {
        const action = String(input.action || "").trim().toUpperCase();
        if (action === "ACQUIRE") return this.acquire(input);
        if (action === "OFFER") return this.createOffer(input);
        if (action === "APPROVE_OFFER") return this.approveOffer(input.offer_id);
        if (action === "CONFIRM_PAYMENT") return this.confirmPayment(input);
        if (action === "ADVANCE") return this.advance(input.opportunity_id, input.stage, input.next_action);
        if (action === "INTELLIGENCE") return this.intelligence();
        throw new Error(`REVENUE_ENGINE: unsupported action ${action}`);
    }
}

module.exports = { RevenueEngineV1, STAGES };
