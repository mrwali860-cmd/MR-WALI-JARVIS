# Revenue Engine V1 Integration Verification

## Scope
Connect the commercial Revenue Engine V1 to the existing core lifecycle without replacing ownership boundaries.

## Canonical flow
PROSPECT -> QUALIFIED -> CONTACTED -> REPLIED -> CALL_REQUESTED -> OFFER_SENT -> APPROVED -> PAYMENT CONFIRMED -> SERVICE PLAN -> ORCHESTRATOR EXECUTION -> QA/CLIENT APPROVAL -> DELIVERY -> REVENUE RECORD.

## Ownership
- RevenueEngineV1: commercial opportunity, offer, payment confirmation and commercial intelligence.
- ServiceManagerIntegration: materializes the selected service into executable tasks.
- Orchestrator: owns task execution and risk/approval gates.
- Delivery: owns delivery eligibility and delivery state.
- Revenue: remains authoritative for final post-delivery accounting.
- Dashboard: remains read-only and is not a persistence owner.

## Safety
External outreach, booking and money movement are not silently automated. Payment confirmation requires an externally supplied CONFIRMED status and transaction reference. Duplicate transaction references are idempotently rejected/returned.

## Verification gate
Architecture -> Contract -> Integration Test -> npm test -> GitHub Actions -> Exact SHA verification -> Evidence -> Freeze.
