# Execution → Verify → Audit Integration V1 — Architecture Contract

## Purpose

Close the existing boundary gap between external execution, Verify, and Audit/Evidence without changing ownership of any frozen component.

## Canonical Position

`Authorized Orchestrator → ExternalExecutionBoundary → ProviderAdapter → normalized execution result → Verify → AuditEvidenceV1`

Only a successful verification result may produce a `COMPLETED` audit record.

## Ownership

- ExternalExecutionBoundary owns authorization enforcement, provider selection, and normalized execution outcomes.
- ProviderAdapter owns provider-specific operation only.
- Verify owns output-contract verification only.
- AuditEvidenceV1 owns immutable audit/evidence records only.
- This integration owns composition/orchestration of those existing boundaries; it does not replace or mutate their responsibilities.

## Input Contract

Required:

- `request_id`
- `service_id`
- `task_id`
- `action`
- `provider`
- `approval_context`
- `input`
- `verification_contract`

## Success Contract

1. Execute through ExternalExecutionBoundary.
2. Pass the normalized execution result to Verify.
3. If Verify returns `PASS`, record AuditEvidenceV1 with outcome `COMPLETED`.
4. Audit evidence MUST reference both execution and verification results.
5. Return execution, verification, and audit results together.

## Failure Contract

- Authorization or input rejection before execution produces no success audit.
- Provider execution failure produces no `COMPLETED` audit.
- Verification failure produces no `COMPLETED` audit.
- Verification failure MUST NOT trigger an execution retry.
- Integration errors fail closed and remain serializable.

## Security / Determinism

1. Frozen ExternalExecutionBoundary, ProviderAdapter, Verify, and AuditEvidenceV1 files are not modified.
2. No provider is called directly outside ExternalExecutionBoundary.
3. No audit record is written before Verify passes.
4. Audit data is sanitized by AuditEvidenceV1; credentials must not cross the evidence boundary.
5. Canonical identity remains `request_id + service_id + task_id + action`.
6. No new network, queue, retry, persistence, or payment behavior is introduced.
7. Revenue Engine remains authoritative for opportunity/revenue lifecycle state.

## V1 Non-Goals

- Real WhatsApp/CRM/Calendar integration.
- Autonomous outreach.
- Payment execution.
- Retry/idempotency infrastructure.
- Changes to frozen component contracts.

## Acceptance Gate

Architecture Check → Contract → Contract Tests → Minimal Integration Implementation → npm test → GitHub Actions → Exact SHA Verification → Evidence Lock → FREEZE.
