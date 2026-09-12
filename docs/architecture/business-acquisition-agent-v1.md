# Business Acquisition Agent V1

## Mission

Business Acquisition Agent V1 is JARVIS's internal business-acquisition capability. Its purpose is to help JARVIS acquire clients for the currently selected first sellable service: `AI_APPOINTMENT_BOOKING_AUTOMATION`.

The agent is a deterministic decision component, not a chatbot and not an unrestricted autonomous sender.

## Business Loop

`TARGET_MARKET → PROSPECT → QUALIFY → PROBLEM IDENTIFICATION → SERVICE MATCH → OUTREACH → OPPORTUNITY → REVENUE ENGINE`

V1 optimizes for a measurable business outcome: a qualified, service-matched opportunity that can proceed through the existing Revenue Engine.

## Responsibilities

1. Accept a canonical prospect/business record.
2. Validate prospect identity and business context.
3. Qualify the prospect against the first service's target markets.
4. Use supplied problem evidence without inventing facts.
5. Match only an existing Service Catalog service.
6. Produce a deterministic outreach draft and next action.
7. Return structured evidence for downstream audit.
8. Prepare output for the existing Revenue Engine boundary without duplicating its lifecycle logic.

## Non-Responsibilities

- No direct network discovery in V1.
- No direct WhatsApp/email/phone sending.
- No provider credentials.
- No payment or money movement.
- No autonomous appointment booking.
- No mutation of frozen infrastructure.
- No arbitrary code execution.
- No fabricated prospect claims.

External outreach remains behind Risk/Approval and the External Execution Boundary.

## Canonical Input

```js
{
  request_id: string,
  prospect: {
    opportunity_id: string,
    company: string,
    contact: string,
    market: string,
    problem: string,
    source?: string,
    website?: string
  }
}
```

Required fields: `request_id`, `opportunity_id`, `company`, `contact`, `market`, `problem`.

## Canonical Output

```js
{
  request_id: string,
  opportunity_id: string,
  qualification: "QUALIFIED" | "DISQUALIFIED",
  problem: string,
  service_id: string | null,
  outreach: {
    status: "DRAFT" | "NOT_READY",
    channel: string | null,
    message: string | null
  },
  next_action: string,
  evidence: object
}
```

## Determinism

Identical canonical input produces identical output. The deterministic core has no LLM judgment, network lookup, current-time dependency, randomness, or hidden mutable state.

## Qualification Rules V1

A prospect is qualified only when required fields are present, the market is one of the first service's target markets, and a non-empty business problem is supplied.

The first service currently targets `REAL_ESTATE`, `HIGH_TICKET_BUSINESSES`, and `SERVICE_BUSINESSES`.

Unsupported or incomplete prospects are disqualified and receive no service match.

## Service Matching

V1 matches the selected first service only when qualification succeeds:

`AI_APPOINTMENT_BOOKING_AUTOMATION`

No unsupported service may be invented.

## Outreach Safety

V1 generates a draft only. It never sends external outreach. Sending requires the existing authorization boundary and explicit approval.

## Revenue Engine Boundary

Revenue Engine remains authoritative for opportunity lifecycle and revenue records. Acquisition V1 must not duplicate or bypass that state machine.

## Failure / Fail-Closed

Invalid input or unsupported market produces a deterministic non-executing result. Missing evidence is never silently replaced with fabricated data.

## Evidence

Output evidence identifies request, opportunity, qualification, service match, decision basis, outreach status, and that no external execution occurred. Secrets and credentials are never emitted.

## Architecture Boundary

`JARVIS CORE → ORCHESTRATOR → BUSINESS ACQUISITION AGENT → REVENUE ENGINE`

External contact execution remains:

`... → RISK/APPROVAL → EXTERNAL EXECUTION BOUNDARY → PROVIDER ADAPTER → VERIFY → EVIDENCE → AUDIT`

## Success Gate

V1 is not production-ready merely because unit tests pass. The eventual real-business gate is:

`Prospect → Qualification → Problem → Service Match → Outreach Approval → Opportunity → Revenue Engine`

Freeze requires Contract → Tests → Implementation → npm test → GitHub Actions → Exact SHA Verification → Evidence → FREEZE.
