# Client Approval Capability V1 — Architecture Check

## Decision
Client Approval is an independent explicit gate after QA and before Delivery.

Lifecycle:

`Execute → QA → Client Approval → Delivery → Revenue`

QA PASS makes the service eligible for client approval; it does not approve the service automatically.

## 1. Responsibility

Client Approval owns only the approval decision and its audit record.

It MUST:
- require a valid service/request context;
- require QA decision `PASS` before approval can be granted;
- distinguish `APPROVED`, `REJECTED`, and `PENDING` states;
- record approval context and timestamp;
- remain auditable and deterministic.

It MUST NOT:
- execute external actions;
- bypass Risk/Approval Policy;
- perform QA itself;
- mark delivery complete;
- record revenue.

## 2. Input contract

Required:
- `service_id`
- `request_id`
- `qa_decision`
- `approval_context`

`approval_context` must identify the approval source/context sufficiently for an audit record. V1 accepts an explicit approval signal rather than inferring approval from silence, QA PASS, or task completion.

## 3. Decision contract

Client Approval returns exactly one decision:

- `APPROVED` — explicit client approval received and QA is `PASS`.
- `REJECTED` — explicit client rejection received.
- `PENDING` — approval is not yet explicitly granted, or the approval context is insufficient for a final decision.

Every decision must include:
- `decision`
- `service_id`
- `request_id`
- `reason`
- `approval_context`
- `timestamp`

## 4. Gate invariants

1. `qa_decision !== PASS` can never produce `APPROVED`.
2. `APPROVED` requires an explicit approval signal.
3. `PENDING` cannot trigger delivery or revenue.
4. `REJECTED` cannot trigger delivery or revenue.
5. Client Approval cannot approve on behalf of the client by default.
6. QA PASS alone is never treated as client approval.
7. Client Approval does not execute or authorize unrelated external actions.

## 5. State transition contract

`QA PASS → CLIENT_APPROVAL PENDING → explicit approval → APPROVED → Delivery eligible`

`QA FAIL → Client Approval blocked`

`QA REVIEW → Client Approval blocked`

`REJECTED → no automatic delivery/revenue`

`PENDING → wait for explicit client decision`

## 6. Audit requirements

V1 records:
- service ID;
- request ID;
- QA decision used as prerequisite;
- approval decision;
- approval context/source;
- timestamp.

No hidden or inferred approval is permitted.

## 7. Integration boundary

QA remains the quality decision owner.
Client Approval remains the client-consent decision owner.
Service Manager remains the service lifecycle owner.
Orchestrator remains the execution coordinator.
Risk/Approval Policy remains the authorization owner for controlled actions.
Delivery and Revenue remain downstream capabilities.

## Architecture Gate

**PASS WITH IMPLEMENTATION GATES**

Next sequence:

`Client Approval Architecture → Contract → Test Cases → Implementation → npm test → GitHub Actions → exact SHA/job/result verification`
