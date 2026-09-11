# Revenue Engine V1 Contract

## Purpose
Revenue Engine V1 provides one deterministic core-owned commercial flow: Revenue Acquisition, Offer Engine, Sales Pipeline, Payment Gate, and Revenue Intelligence.

## Boundaries
- Dashboard is read-only and never owns commercial persistence.
- External outreach, booking, and money movement remain approval-gated by existing safety boundaries.
- Existing Revenue V1 remains the authoritative post-delivery/post-confirmed-payment revenue record.

## Commercial lifecycle
PROSPECT -> QUALIFIED -> CONTACTED -> REPLIED -> CALL_REQUESTED -> OFFER_SENT -> APPROVED -> PAYMENT_PENDING -> PAID -> DELIVERING -> DELIVERED, with LOST as a terminal loss state.

## Determinism and safety
- Opportunity identity is `opportunity_id` and request traceability is `request_id`.
- Duplicate opportunity creation is idempotent.
- Offer creation is idempotent by `offer_id`.
- Payment confirmation requires an approved offer, `CONFIRMED` status, and a transaction reference.
- Duplicate transaction references are idempotent and cannot collect twice.
- Intelligence is derived from the engine's core-owned opportunity, offer, and payment records.

## V1 capabilities
1. Revenue Acquisition: deterministic fit score from market, problem, contact, budget, and urgency.
2. Offer Engine: service-linked offer with outcome, amount, currency, and approval state.
3. Sales Pipeline: explicit stage and next-action state.
4. Payment Gate: confirmed payment with transaction identity and idempotency.
5. Revenue Intelligence: pipeline counts, qualified opportunities, offers, deals won, and cash collected.

## Verification gate
Architecture -> Contract -> Tests -> Minimal Implementation -> npm test -> GitHub Actions -> Exact SHA Verification -> Evidence -> Freeze.
