# End-to-End Business Lifecycle V1

## Purpose

Prove that the selected Digital Services lifecycle can move through one controlled path without bypassing its business gates.

## Canonical Flow

`Client Requirement -> Service -> Plan -> Tasks -> Orchestrator -> Risk -> Execution -> QA -> Client Approval -> Delivery -> Revenue`

## Component Ownership

- **Service Manager**: owns service lifecycle and service-level state.
- **Service Manager Integration**: materializes the selected service plan into tasks and dependencies.
- **Task Manager**: owns task state, dependencies, readiness, and completion.
- **Orchestrator**: coordinates task execution in dependency order; it does not bypass policy gates.
- **Risk / Approval Policy**: fail-closed authorization decision for protected actions.
- **QA**: validates execution output against acceptance criteria.
- **Client Approval**: requires QA PASS plus an explicit client approval signal.
- **Delivery**: requires QA PASS and explicit client approval APPROVED.
- **Revenue**: requires DELIVERED status plus confirmed payment and valid transaction identity.

## V1 Invariants

1. Tasks cannot execute before dependencies are complete.
2. Protected external actions cannot execute without required approval.
3. QA PASS is not client approval.
4. QA failure/review cannot produce an approved delivery.
5. Client approval is required before successful delivery.
6. Delivery alone cannot create revenue.
7. Revenue requires confirmed payment; delivery does not imply payment.
8. Duplicate transaction references cannot be recorded.
9. Unknown risk actions fail closed.
10. The E2E test uses deterministic simulated execution only; it does not send real messages, book real appointments, move money, or delete data.

## Verification Contract

The integration test must verify:

- service creation and READY state;
- ten-task dependency chain;
- Orchestrator execution and Risk decision;
- protected-action WAIT without approval and successful execution with explicit approval;
- QA PASS;
- explicit Client Approval APPROVED;
- Delivery DELIVERED;
- Revenue PAID/RECORDED after confirmed payment;
- all ten lifecycle tasks reach COMPLETED in the controlled test;
- unpaid delivery remains Revenue PENDING.

## Production Boundary

A green E2E test proves the internal business lifecycle contract only. Real marketplace, messaging, calendar, CRM, payment, or other external connectors require separate adapters, credentials, contract tests, and the existing approval/risk gates.

## Gate

**PASS WITH IMPLEMENTATION GATES** — the lifecycle is integration-tested, while real-world external execution remains adapter-specific and approval-controlled.
