# Service Manager Approval Hardening V1 — Contract

## Purpose

Prevent the Service Manager from independently converting a service into an approved/delivery-ready state without the required upstream gates.

## Ownership

- **Client Approval** owns client consent.
- **QA** owns quality validation.
- **Delivery** owns delivery eligibility and delivery state.
- **Service Manager** owns lifecycle persistence only.

## Approval Contract

`approveService(service_id, approval_context)` may transition the service to `DELIVERED` / delivery-ready only when all required gates are satisfied.

Required conditions:

1. The service exists.
2. Service QA status is `PASSED`.
3. Client approval status is explicitly `APPROVED`.
4. An approval context is present and represents the explicit approval decision.
5. The operation does not itself create client consent.

## Rejection / Blocking Rules

- Missing service → error.
- QA not `PASSED` → blocked; no approval mutation.
- Client approval not `APPROVED` → blocked; no approval mutation.
- Missing/invalid approval context → blocked; no approval mutation.
- `PENDING` or `REJECTED` client approval → blocked.

## State Invariants

- QA PASS alone never means client approval.
- Service Manager cannot infer approval from delivery readiness.
- Service Manager cannot manufacture client consent.
- A blocked approval attempt must not set `approval.status` to `APPROVED`.
- A blocked approval attempt must not set service status to `DELIVERED`.
- Successful approval records the explicit approval context for auditability.
- Service Manager does not execute external actions.

## Audit Fields

On successful approval, persist:

- `approval.status = APPROVED`
- `approval.approved_at`
- `approval.context` (sanitized approval decision metadata)

## Compatibility

Existing callers that invoke `APPROVE_SERVICE` without the required approval context must no longer receive a successful approval. This is an intentional breaking hardening change.

## Test Contract

Tests must cover at minimum:

1. valid QA PASS + explicit APPROVED context succeeds;
2. QA not passed blocks;
3. approval missing blocks;
4. approval PENDING blocks;
5. approval REJECTED blocks;
6. missing approval context blocks;
7. blocked attempts do not mutate approval or delivery state;
8. successful approval records an audit context;
9. unrelated service-manager actions remain unchanged;
10. `execute({action: "APPROVE_SERVICE"})` follows the same gate.

## Gate

**CONTRACT READY FOR TEST IMPLEMENTATION**
