"use strict";

const assert = require("assert");
const { RevenueEngineV1 } = require("./revenue-engine-v1");

const engine = new RevenueEngineV1();
const opportunity = engine.execute({
    action: "ACQUIRE",
    opportunity_id: "opp-001",
    request_id: "req-001",
    service_id: "WHATSAPP_LEAD_AUTOMATION",
    company: "Example Realty",
    contact: "owner@example.com",
    market: "REAL_ESTATE",
    problem: "Slow lead response",
    budget: "1500",
    urgency: true
});
assert.equal(opportunity.stage, "PROSPECT");
assert.equal(opportunity.score, 100);

const offer = engine.execute({
    action: "OFFER",
    opportunity_id: "opp-001",
    offer_id: "offer-001",
    amount: 1500,
    currency: "USD",
    outcome: "Faster qualification and more booked appointments"
});
assert.equal(offer.status, "OFFER_SENT");
assert.equal(engine.intelligence().offers_sent, 1);

engine.execute({ action: "APPROVE_OFFER", offer_id: "offer-001" });
assert.equal(engine.opportunities.get("opp-001").stage, "APPROVED");

assert.throws(
    () => engine.execute({ action: "CONFIRM_PAYMENT", offer_id: "offer-001", payment_status: "PENDING", transaction_reference: "tx-001" }),
    /payment must be CONFIRMED/
);

const payment = engine.execute({
    action: "CONFIRM_PAYMENT",
    offer_id: "offer-001",
    payment_status: "CONFIRMED",
    transaction_reference: "tx-001"
});
assert.equal(payment.payment_status, "CONFIRMED");
assert.equal(engine.opportunities.get("opp-001").stage, "PAID");
assert.equal(engine.intelligence().cash_collected, 1500);
assert.equal(engine.intelligence().deals_won, 1);

const duplicate = engine.execute({
    action: "CONFIRM_PAYMENT",
    offer_id: "offer-001",
    payment_status: "CONFIRMED",
    transaction_reference: "tx-001"
});
assert.equal(duplicate.duplicate, true);

console.log("Revenue Engine V1: PASS");
