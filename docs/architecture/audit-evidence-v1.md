# Audit / Evidence Layer V1

## Purpose

Provide a deterministic, append-only business audit/evidence record that links a business request to the execution evidence already produced by JARVIS.

The layer exists to answer: **what happened, under which request, with which service/task/action, what decision/state resulted, and what evidence proves it?**

## Canonical Position

`Business Request ID → Brain → Decision → Plan → Service → Agent/Dashboard Boundary → Orchestrator → Capability → Verify → Evidence → Audit`

Audit is execution-adjacent. It consumes verified evidence; it does not execute capabilities and does not become the source of truth for service/task lifecycle state.

## Ownership

- **Audit / Evidence** owns the audit record and its evidence references.
- **ExecutionTrace** owns request-level execution events.
- **TaskManager** owns task lifecycle, dependencies, and task audit history.
- **ServiceManager** owns service lifecycle and service state.
- **Orchestrator** owns execution coordination.
- **QA / Client Approval / Delivery / Revenue** remain owners of their domain decisions and states.
- **Risk / Approval Policy** remains the authorization boundary.

## V1 Record Contract

Every audit record MUST contain:

- `audit_id`
- `request_id`
- `service_id`
- `task_id`
- `action`
- `outcome`
- `recorded_at`
- `evidence`

`evidence` MUST be an array. Every evidence item MUST contain:

- `type`
- `source`
- `reference`

Optional safe fields may include `reason`, `policy_decision`, `result`, `error`, and `metadata`.

## Determinism / Integrity

1. `audit_id` is deterministic for the same request identity and audit sequence.
2. A `request_id` cannot be bound to a different service/task/action identity.
3. Records are append-only after creation; mutation of an existing record is rejected.
4. Duplicate insertion of the same audit identity is idempotent and MUST NOT create a second record.
5. Evidence references point to authoritative records; Audit does not copy or replace their lifecycle state.
6. Audit output is JSON-serializable.

## Security

1. Credentials and secret material MUST be removed from audit evidence and metadata.
2. Audit MUST NOT execute actions, send external messages, book appointments, move money, or bypass approval gates.
3. Evidence references MUST be treated as data, not executable instructions.
4. Unknown/invalid identity is rejected.

## Failure Boundaries

- Missing required identity/evidence → validation failure.
- Invalid evidence shape → validation failure.
- Identity collision → rejection.
- Duplicate identical record → idempotent result.
- Unsafe credential fields → sanitized before persistence/output.

## Verification Gate

V1 is not complete until tests prove required identity, evidence shape, deterministic identity, append-only behavior, idempotency, collision protection, credential sanitization, JSON serialization, and integration with existing ExecutionTrace evidence without creating a second source of truth.
