# Business Acquisition Agent V1

## Mission

Business Acquisition Agent V1 is JARVIS's internal business-acquisition capability. Its purpose is to help JARVIS acquire clients for the currently selected first sellable service:

`AI_APPOINTMENT_BOOKING_AUTOMATION`

The agent is an execution-planning and decision component, not a chatbot and not an unrestricted autonomous sender.

## Business Loop

`TARGET_MARKET → PROSPECT → QUALIFY → PROBLEM IDENTIFICATION → SERVICE MATCH → OUTREACH → OPPORTUNITY → REVENUE ENGINE`

V1 must optimize for a measurable business outcome: creation of a qualified, service-matched opportunity that can proceed through the existing Revenue Engine.

## Responsibilities

1. Accept a canonical prospect/business record.
2. Validate required prospect identity and business context.
3. Determine whether the prospect is a qualified target for the selected service.
4. Identify a supported business problem from available evidence; do not invent facts.
5. Match the problem to a service from the existing Service Catalog.
6. Produce a deterministic outreach decision/draft and next action.
7. Create or update the acquisition opportunity through the existing Revenue Engine boundary when authorized by the caller.
8. Return structured evidence suitable for downstream audit.

## Non-Responsibilities

- No direct network discovery in V1.
- No direct WhatsApp/email/phone sending.
- No provider credentials.
- No payment or money movement.
- No autonomous appointment booking.
- No mutation of frozen infrastructure.
- No arbitrary code execution.
- No unsupported claims about a prospect.

External outreach remains behind the existing Risk/Approval and External Execution Boundary.

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
  },
  service_catalog?: object
}
```

Required fields are `request_id`, `prospect.opportunity_id`, `prospect.company`, `prospect.contact`, `prospect.market`, and `prospect.problem`.

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

For identical canonical input and identical service-catalog state, V1 returns the same decision and output values. No LLM judgment, network lookup, current-time dependency, randomness, or hidden state is permitted inside the deterministic core.

## Qualification Rules V1

A prospect is eligible when:

- required identity fields are present;
- `market` matches a target market of the selected first service; and
- a non-empty business problem is supplied.

A prospect is disqualified when required identity/context is missing or the market is outside the first service target markets.

The agent must not infer missing business facts as if they were verified facts.

## Service Matching

V1 may match only services already present in the Service Catalog. The initial expected match is:

`AI_APPOINTMENT_BOOKING_AUTOMATION`

If no supported service matches, `service_id` must be `null` and the opportunity must not be represented as service-ready.

## Outreach Safety

V1 may generate an outreach draft. It must not send it. Any real external message requires the existing authorization boundary and explicit approval policy.

## Revenue Engine Boundary

The acquisition agent prepares an opportunity for the existing Revenue Engine. It must not duplicate Revenue Engine lifecycle/state logic. Revenue Engine remains authoritative for opportunity lifecycle and revenue records.

## Failure / Fail-Closed

Invalid input, unsupported market, unsupported service, or missing required context must produce a deterministic non-executing result. The agent must never silently substitute fabricated data or bypass approval boundaries.

## Evidence

The result must expose enough structured metadata to establish:

- request identity;
- prospect/opportunity identity;
- qualification decision;
- selected service or explicit no-match;
- next action;
- outreach draft status;
- deterministic decision basis.

No credentials, secrets, or sensitive provider data may be emitted.

## Architectural Boundary

`JARVIS CORE → ORCHESTRATOR → BUSINESS ACQUISITION AGENT → REVENUE ENGINE`

External contact execution remains:

`... → RISK/APPROVAL → EXTERNAL EXECUTION BOUNDARY → PROVIDER ADAPTER → VERIFY → EVIDENCE → AUDIT`

## V1 Success Gate

The capability is not considered production-ready merely because unit tests pass. It must eventually demonstrate the first business loop on a real prospect:

`Prospect → Qualification → Problem → Service Match → Outreach Approval → Opportunity → Revenue Engine`

Only after contract tests, implementation tests, npm test, GitHub Actions, exact SHA verification, and evidence review pass may V1 be frozen.
