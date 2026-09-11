# External Execution Boundary V1 — Architecture Contract

## Purpose

Define the single controlled boundary between JARVIS core orchestration and real external providers.

The boundary prevents provider-specific execution logic, credentials, retries, and external side effects from leaking into Orchestrator, Task Manager, Service Manager, Dashboard, QA, Client Approval, Revenue, or Audit/Evidence ownership.

## Canonical Position

`Business Request → Brain → Decision → Plan → Service → Task → Orchestrator → Risk/Approval → External Execution Boundary → Provider Adapter → External System`

Provider result returns through:

`External System → Provider Adapter → External Execution Boundary → Orchestrator → Verify → Evidence → Audit`

## Ownership

- **Orchestrator:** coordinates an authorized task execution; does not implement provider protocols.
- **Risk/Approval:** authorizes or blocks protected actions before external execution.
- **External Execution Boundary:** validates the canonical action envelope, enforces provider-independent execution rules, selects/delegates to an adapter, normalizes provider outcomes, and prevents unauthorized external side effects.
- **Provider Adapter:** owns provider-specific protocol/API translation and credentials access. It does not decide business authorization.
- **Task Manager:** remains authoritative for task lifecycle/state.
- **Execution Trace:** records request-level execution events.
- **Verify:** validates execution output against the applicable contract.
- **Evidence/Audit:** records verified evidence; it does not execute providers.

## Input Contract

Required:

- `request_id`
- `service_id`
- `task_id`
- `action`
- `approval_context`
- `input`

The boundary MUST reject missing identity fields and MUST require the action to match the task's canonical action.

`EXECUTE_TASK` is an orchestration command, not a provider action. Provider execution receives the resolved task action only.

## Authorization Boundary

The boundary MUST NOT authorize an action on its own.

A protected external action MUST arrive with an approval context that has already passed the Risk/Approval policy. Missing, invalid, or denied authorization MUST fail closed before an adapter is invoked.

The boundary MUST preserve `request_id` unchanged.

## Provider Adapter Contract

An adapter is selected explicitly by supported action/provider mapping and receives a normalized execution envelope. An adapter MUST:

- perform only its declared provider-specific operation;
- not mutate JARVIS core lifecycle state;
- not grant approval;
- not create client consent;
- not record revenue;
- not bypass QA, Delivery, or Audit/Evidence;
- return a serializable normalized result or a normalized execution error.

Provider credentials MUST remain outside task/service state and MUST NOT be returned in results, traces, evidence, or audit records.

## Output Contract

Success MUST return a serializable normalized result containing at least:

- `success: true`
- `request_id`
- `action`
- `provider`
- `result`

Failure MUST return a serializable normalized failure containing at least:

- `success: false`
- `request_id`
- `action`
- `provider` when known
- `error`

The boundary MUST NOT silently convert provider failure into success.

## Determinism / Safety

1. No adapter call occurs before authorization has passed.
2. The task's canonical action cannot be overridden by caller input.
3. One request identity remains traceable end-to-end.
4. Provider-specific failures remain failures.
5. Adapter output is normalized before returning to Orchestrator.
6. Secrets/credentials never cross the business-state or evidence boundary.
7. The boundary performs no autonomous payment, irreversible action, or policy decision.
8. No retries or duplicate external side effects are introduced by V1; retry/idempotency semantics require an explicit future contract.
9. V1 does not require WhatsApp, CRM, Calendar, payment, or any specific provider integration.

## Failure Boundaries

Reject before adapter invocation for:

- missing request/service/task identity;
- unknown or mismatched action;
- missing/invalid authorization;
- unsupported provider/action mapping;
- malformed input.

Adapter execution failures return normalized failure and remain traceable. The boundary does not hide or reinterpret provider errors.

## Verification / Evidence Boundary

The boundary returns provider-neutral normalized results to Orchestrator. Verification remains responsible for deciding whether the output satisfies the task contract. Only verified output becomes Evidence/Audit material.

## V1 Non-Goals

- real provider integrations;
- credential storage infrastructure;
- queues/workers;
- retry orchestration;
- idempotency keys or distributed deduplication;
- provider-specific business logic;
- autonomous external actions;
- new persistence/event-bus infrastructure.

## Acceptance Gate

Architecture Check → Contract → Contract Tests → Minimal Boundary Implementation → npm test → GitHub Actions → Exact SHA Verification → Evidence Lock → FREEZE.
