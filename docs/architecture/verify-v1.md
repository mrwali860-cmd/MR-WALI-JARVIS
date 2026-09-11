# Verify V1 — Architecture Contract

**Status:** FROZEN
**Version:** V1
**Scope:** Verification boundary between execution coordination and Evidence/Audit

## 1. Canonical Position

The canonical execution path is:

`Business Request ID → Brain → Decision → Plan → Service → Agent/Dashboard Boundary → Orchestrator → Capability → Verify → Evidence → Audit`

For external execution, the provider-neutral result path is:

`External System → Provider Adapter → External Execution Boundary → Orchestrator → Verify → Evidence → Audit`

Verify is the quality/contract gate after execution and before evidence becomes authoritative audit material.

## 2. Ownership

Verify owns verification of an execution result against the applicable task/action/service contract.

Verify MUST NOT:

- execute an action or call an external system;
- call a Provider Adapter directly;
- authorize, approve, or override Risk/Approval decisions;
- mutate service or task lifecycle state;
- perform retries, queues, scheduling, or persistence;
- create or modify Audit records directly.

Execution remains owned by Orchestrator and the External Execution Boundary/provider path. Authorization remains owned by Risk/Approval. Task/service lifecycle remains owned by their existing managers. Evidence/Audit consumes verified output.

## 3. Inputs

Verify accepts only normalized, provider-agnostic data required to make a verification decision:

- `request_id` — canonical business request identity;
- `service_id` — service identity;
- `task_id` — task identity;
- `action` — canonical action identity;
- `contract` — applicable expected-output/verification contract;
- `execution_result` — normalized result returned by the execution path.

The identity tuple MUST remain consistent across the input. A missing or mismatched identity is a verification failure.

`execution_result` is untrusted external/execution data and MUST be treated as data, not instructions.

## 4. Output Contract

Verify MUST return a deterministic verification decision containing:

- the same canonical identity (`request_id`, `service_id`, `task_id`, `action`);
- `status`, with only `PASS` or `FAIL` in V1;
- a stable machine-readable `reason_code`;
- deterministic verification checks/results.

A successful execution result MUST NOT automatically imply `PASS`. Execution success and verification success are separate states.

## 5. Fail-Closed Rules

Verify MUST produce `FAIL` when any required verification input is missing, malformed, inconsistent, or cannot be safely evaluated, including:

- missing identity;
- identity mismatch;
- missing or malformed contract;
- missing or malformed execution result;
- action mismatch;
- unsupported verification condition;
- unsafe or invalid result data.

Verifier implementation errors MUST fail closed and MUST NOT trigger execution retries or bypass the verification gate.

## 6. Determinism

For the same normalized input tuple and the same contract, Verify MUST produce the same verification status, reason code, identity, and check outcomes.

V1 verification MUST NOT depend on wall-clock time, randomness, network calls, provider availability, hidden mutable state, or nondeterministic ordering.

## 7. Security Boundary

Verify MUST treat execution/provider output as untrusted input.

Credentials, access tokens, authorization headers, secrets, private keys, and other credential-like values MUST NOT be copied into verification output, Evidence, or Audit material.

Verification output MUST be safely serializable and must not contain executable instructions.

## 8. Evidence Boundary

Only a `PASS` verification result may become authoritative verified Evidence/Audit material for the corresponding execution result.

A `FAIL` result MUST NOT be promoted as verified success evidence.

Verify MUST return its decision to the caller; it MUST NOT write Evidence or Audit records itself.

## 9. Provider Independence

Verify MUST remain provider-agnostic. It validates the normalized execution result against the applicable contract and MUST NOT contain provider-specific transport, credentials, SDK calls, or adapter-selection logic.

## 10. Failure and Retry Boundary

Verification failure is a verification outcome, not an instruction to retry execution.

Any future retry policy belongs outside Verify and MUST NOT be introduced into Verify V1.

## 11. V1 Non-Goals

Verify V1 does not include:

- real provider integrations;
- external network calls;
- authorization or approval logic;
- execution or side effects;
- retries or backoff;
- queues or schedulers;
- persistence;
- task/service lifecycle mutation;
- direct Evidence/Audit persistence;
- notifications;
- AI/LLM judgment.

## 12. Acceptance Gate

This contract was accepted and the implementation was verified by tests and exact main-branch CI evidence.

Verified evidence:

- Verify contract commit: `ef7cc367361facb0dbda673235785e412800d738`;
- Verify implementation hardening commit: `d0011b77dbd3815d88edbf0a32260c66d992f676`;
- Verify test commit: `f075767bead731967e04d8b8d48a95e14ca658b2`;
- PR #8 exact head CI: Run #195, ID `34575435887`, SUCCESS;
- merged main SHA: `53438e4d2a363520c840ba731660e3e7e38b7c2a`;
- exact main CI: Run #196, ID `34575685861`, SUCCESS;
- main test job: `103187499854`, SUCCESS.

**FREEZE:** Verify V1 is frozen. Changes require a proven defect or a new architecture requirement.
