# Provider Adapter V1 — Architecture Contract

## Purpose

Define the provider-specific execution component behind the frozen External Execution Boundary.

The Provider Adapter translates one canonical, already-authorized execution envelope into exactly one declared provider operation and returns a serializable provider result or normalized execution error.

## Canonical Position

`Orchestrator → Risk/Approval → External Execution Boundary → Provider Adapter → External System`

Return path:

`External System → Provider Adapter → External Execution Boundary → Orchestrator → Verify → Evidence → Audit`

The External Execution Boundary remains the sole caller of provider adapters in JARVIS core.

## Ownership

- **External Execution Boundary:** authorization gate, canonical action validation, adapter selection, provider-independent normalization, and side-effect boundary.
- **Provider Adapter:** provider-specific protocol/API translation and provider credential access.
- **Orchestrator:** provider-agnostic coordination; never calls provider APIs directly.
- **Risk/Approval:** authorization only; never implemented by an adapter.
- **Task Manager:** task lifecycle/state only.
- **Verify:** validates returned output against the task contract.
- **Evidence/Audit:** records verified evidence; never executes an adapter.

## Adapter Contract

Every adapter MUST expose:

- a stable provider identifier used by the boundary;
- a declared canonical action mapping;
- `execute(envelope)` as the only V1 execution entry point.

The adapter MUST receive only the normalized envelope required for execution:

- `request_id`
- `service_id`
- `task_id`
- `action`
- `input`

The adapter MUST NOT receive Risk/Approval authority as a mechanism to grant or change authorization.

## Action Mapping

1. Each adapter declares the canonical action it implements.
2. The boundary selects the adapter by explicit provider mapping.
3. The adapter MUST reject or fail when invoked for an action outside its declared mapping.
4. Provider protocol names are adapter-internal and MUST NOT replace the canonical JARVIS action.

## Side-Effect Boundary

An adapter may perform its declared provider operation only after the External Execution Boundary has passed authorization.

An adapter MUST NOT:

- authorize or approve actions;
- create or modify client consent;
- mutate Task/Service lifecycle state;
- bypass QA or Delivery gates;
- record revenue;
- write Evidence/Audit as an execution side effect;
- invoke another provider adapter;
- perform unrelated provider operations.

## Credentials / Secrets

Provider credentials MAY be accessed only inside the adapter/provider integration boundary.

Credentials MUST NOT be:

- stored in task/service state;
- passed back to the boundary as result data;
- written to execution trace, evidence, or audit records;
- exposed through errors or logs.

V1 does not define credential storage infrastructure; adapters may depend on a future credential provider without making it part of the core contract.

## Input / Output

The adapter MUST treat the execution envelope as provider-neutral input and translate it internally to provider-specific request data.

Successful execution MUST return a serializable provider result suitable for boundary normalization.

Provider failure MUST be represented as an error and MUST NOT be converted into success.

Adapter output MUST NOT contain credentials or other secret material.

## Determinism / Safety

1. No adapter is directly callable from Orchestrator or business-state components as a provider API.
2. Authorization is inherited from the boundary; adapters do not authorize.
3. One request identity is preserved unchanged.
4. One declared action maps to one declared provider operation.
5. V1 introduces no retries, queues, workers, or duplicate side-effect logic.
6. Adapter failures remain failures.
7. No autonomous payment, irreversible action, or policy decision is introduced by the adapter layer.
8. Real provider integrations are outside this V1 contract.

## Failure Contract

The adapter MUST fail clearly for:

- unsupported/mismatched action;
- malformed execution input;
- provider protocol failure;
- provider timeout/error;
- unavailable provider dependency.

The External Execution Boundary is responsible for normalizing adapter failures into its canonical failure envelope.

## V1 Non-Goals

- WhatsApp/CRM/Calendar implementation;
- real provider credentials or secret-management infrastructure;
- retry/idempotency/distributed deduplication;
- queues/workers;
- provider-specific business logic in core;
- direct Orchestrator-to-provider calls;
- new persistence/event-bus infrastructure.

## Acceptance Gate

Architecture Check → Contract → Contract Tests → Minimal Adapter Implementation → npm test → GitHub Actions → Exact SHA Verification → Evidence Lock → FREEZE.
