# Audit / Evidence Layer V1

## Purpose

Provide a deterministic, append-only business audit/evidence record that links a business request to execution evidence already produced by JARVIS.

The layer answers: **what happened, under which request, with which service/task/action, what outcome resulted, and what evidence proves it?**

## Canonical Position

`Business Request ID → Brain → Decision → Plan → Service → Agent/Dashboard Boundary → Orchestrator → Capability → Verify → Evidence → Audit`

Audit is execution-adjacent. It consumes verified evidence; it does not execute capabilities and does not become the source of truth for service/task lifecycle state.

## Ownership

- **Audit / Evidence** owns the audit record and evidence references.
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

`evidence` MUST be a non-empty array. Every evidence item MUST contain `type`, `source`, and `reference`.

Optional safe fields may include `reason`, `policy_decision`, `result`, `error`, and `metadata`.

## Identity / Idempotency Model

V1 defines one immutable audit record per execution identity:

`request_id + service_id + task_id + action`

The `audit_id` is deterministic from that identity. Therefore the same execution identity cannot create multiple distinct audit records in V1.

1. The same identity with the same outcome/evidence is an idempotent duplicate.
2. The same identity with a different outcome or evidence is rejected as mutation.
3. A `request_id` cannot be rebound to a different service/task/action identity within one AuditEvidenceV1 instance.
4. Records are immutable after creation.
5. Evidence references point to authoritative records; Audit does not copy or replace their lifecycle state.
6. Audit output is JSON-serializable.

If a future requirement needs multiple audit events for one execution identity, V2 MUST introduce an explicit sequence/event identity rather than silently changing V1 semantics.

## Security

1. Credentials and secret material MUST be removed from audit evidence and metadata.
2. Audit MUST NOT execute actions, send external messages, book appointments, move money, or bypass approval gates.
3. Evidence references MUST be treated as data, not executable instructions.
4. Missing/invalid identity is rejected.

## Failure Boundaries

- Missing required identity/evidence → validation failure.
- Invalid evidence shape → validation failure.
- Request identity collision → rejection.
- Duplicate identical record → idempotent result.
- Mutation of existing identity → rejection.
- Unsafe credential fields → sanitized before persistence/output.

## Verification Gate

V1 is complete only when tests prove required identity, evidence shape, deterministic identity, immutable/append-only behavior, idempotency, collision protection, credential sanitization, JSON serialization, and compatibility with existing ExecutionTrace evidence without creating a second source of truth.