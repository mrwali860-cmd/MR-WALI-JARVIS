# Verify V1 — Architecture Contract

**Status:** Contract Draft / Implementation Gate
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

This document defines the contract only. No Verify implementation is considered complete until tests prove the contract invariants.

Required future verification tests MUST cover at minimum:

1. deterministic PASS for valid compliant output;
2. FAIL for non-compliant output;
3. FAIL for missing/malformed identity;
4. FAIL for identity mismatch;
5. FAIL for missing/malformed contract;
6. FAIL for missing/malformed execution result;
7. FAIL for action mismatch;
8. fail-closed behavior on verifier errors;
9. no provider/external execution from Verify;
10. no authorization/approval bypass;
11. provider-agnostic behavior;
12. credential/secret sanitization;
13. evidence promotion only from verified PASS output;
14. deterministic output and safe serialization.

**Implementation is blocked until the contract is reviewed and accepted.**
