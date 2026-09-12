# Outreach Approval V1 — Architecture Contract

## Purpose
Create a controlled approval boundary between JARVIS's deterministic outreach draft and any future external sending.

## Canonical Flow
`Prospect → Qualification → Problem → Service Match → Outreach Draft → Approval → External Execution → Verify → Evidence → Opportunity/Revenue`

## Responsibilities
- Validate the canonical acquisition request.
- Preserve `request_id` and `opportunity_id`.
- Accept only a deterministic draft produced by Business Acquisition Agent V1.
- Require explicit approval before external execution is eligible.
- Return a normalized approval decision for downstream execution.
- Fail closed when identity, draft, or approval is missing/invalid.

## Non-Responsibilities
- No email, WhatsApp, phone, CRM, calendar, or network calls.
- No provider selection or credentials.
- No prospect discovery.
- No qualification or service matching.
- No revenue recording.
- No autonomous approval.
- No mutation of frozen components.

## Input Contract
Required:
- `request_id`
- `opportunity_id`
- `channel`
- `message`
- `approval`

Approval must contain:
- `status`: `APPROVED` or `DENIED`
- `approved_by`
- `approval_id`

## Output Contract
Return:
- `request_id`
- `opportunity_id`
- `status`: `READY_FOR_EXTERNAL_EXECUTION`, `DENIED`, or `REJECTED`
- `channel`
- `message`
- `evidence`

## Safety Rules
1. Missing identity fails closed.
2. Empty message/channel fails closed.
3. `APPROVED` without `approved_by` and `approval_id` fails closed.
4. `DENIED` never becomes executable.
5. This boundary does not send anything itself.
6. Credentials never enter the request, output, or evidence.
7. Approval does not imply successful delivery; provider execution and verification remain separate boundaries.
8. Same canonical input produces the same decision.

## Acceptance Gate
`Architecture Check → Contract → Tests → Minimal Implementation → npm test → GitHub Actions → Exact SHA Verification → Evidence Lock → FREEZE`
