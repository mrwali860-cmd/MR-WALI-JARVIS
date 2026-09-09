# Dashboard / Control Center V1 Contract

## 1. Purpose

The Dashboard is the read/control surface for MR WALI JARVIS. It exposes the current Business OS state and sends controlled actions to the existing core modules.

The Dashboard MUST NOT become the owner of business lifecycle, task state, QA, client approval, delivery, or revenue persistence.

## 2. Architecture Boundary

```text
Dashboard UI
    |
    v
Dashboard/API surface
    |
    v
JARVIS Core modules
    |
    +--> Service Manager
    +--> Task Manager
    +--> Orchestrator
    +--> QA
    +--> Client Approval
    +--> Delivery
    +--> Revenue
```

The Dashboard reads normalized state from the core and requests actions through core-owned contracts. It MUST NOT directly mutate core storage files.

## 3. V1 Read Model

The Dashboard MUST be able to represent:

- system status
- services and their lifecycle status
- service plans/tasks
- task status and blockers
- QA status
- client approval status
- delivery status
- revenue status
- recent activity/audit information when available through existing contracts

V1 should prefer existing core state and contracts over introducing a second source of truth.

## 4. Controlled Actions

V1 actions are limited to actions already owned by the core contracts. The Dashboard MUST NOT invent alternate lifecycle transitions.

An action request MUST identify:

- action
- target entity
- request_id
- optional reason/context required by the target contract

The core module remains responsible for validating whether the action is legal.

## 5. Safety Rules

1. Dashboard MUST NOT directly edit `services.json`, `tasks.json`, or other core persistence.
2. Dashboard MUST NOT bypass QA, client approval, delivery eligibility, or risk approval gates.
3. Dashboard MUST NOT infer client consent from QA success.
4. Dashboard MUST NOT execute external side effects directly in V1.
5. Failed/blocked core responses MUST remain visible rather than being hidden or converted to success.
6. Every mutation request MUST carry a request identifier for traceability.

## 6. API Contract Direction

V1 should expose a small normalized read surface, conceptually:

- `GET /api/dashboard/status`
- `GET /api/dashboard/services`
- `GET /api/dashboard/tasks`
- `GET /api/dashboard/activity`

Controlled actions should use a single validated command boundary rather than UI-specific business logic, conceptually:

- `POST /api/dashboard/actions`

The exact implementation endpoint names may change during tests if existing server conventions require it, but the ownership and validation rules MUST remain unchanged.

## 7. UI V1

The initial Control Center should contain:

- System health/status
- Active services
- Lifecycle/task board
- Blocked/failed items
- QA and approval gates
- Delivery state
- Revenue state
- Recent activity

Fancy analytics, external integrations, WhatsApp, voice control, autonomous execution, and new infrastructure are explicitly out of scope for Dashboard V1.

## 8. Voice Agent Compatibility

The Dashboard action boundary MUST remain API/contract based so a future Voice Agent can call the same controlled actions without duplicating business logic.

Target architecture:

```text
                 JARVIS CORE
                     ^
                     |
             validated API boundary
                /            \
               /              \
        Dashboard UI       Voice Agent
```

Neither interface becomes the source of truth.

## 9. Non-Goals

Dashboard V1 does NOT include:

- new database infrastructure
- Redis/event bus
- direct filesystem mutation from UI
- external service execution
- autonomous financial actions
- complex BI/reporting
- multi-user permissions system unless required by an existing core contract

## 10. Acceptance Criteria

The Dashboard architecture is considered contract-complete when tests can prove:

1. dashboard reads do not mutate core state;
2. dashboard status reflects core state;
3. service/task state is represented without redefining lifecycle states;
4. blocked actions remain blocked;
5. approval gates cannot be bypassed;
6. invalid actions are rejected by the core boundary;
7. request IDs are preserved for controlled actions;
8. dashboard and future voice control can share the same action boundary;
9. no new persistence source of truth is introduced.

## 11. Build Sequence

Architecture Check -> Contract -> Contract Tests -> Minimal API/UI Implementation -> CI -> Exact SHA Verification.

No implementation should begin until the contract tests define the above boundaries.
