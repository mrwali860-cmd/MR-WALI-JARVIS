# AI Appointment Booking Automation V1 — Architecture Check

## Decision
Selected as the first sellable service because it combines high sellability and measurable ROI with fast delivery and manageable complexity.

## 1. Architecture

Client Requirement
→ Service Manager
→ Service Contract
→ Task Manager
→ Dependency Graph
→ Orchestrator
→ Risk/Approval Gate
→ Execution
→ QA
→ Client Approval
→ Delivery
→ Revenue

### Component responsibilities
- **Service Manager:** owns the client service lifecycle and service-level state. It must not execute external actions.
- **Task Manager:** owns task creation, dependency state, readiness, execution state, completion and failure state.
- **Orchestrator:** coordinates tasks in dependency order; it does not own business data or bypass approval gates.
- **Risk/Approval Gate:** blocks external message sending, appointment booking, money movement and deletion unless explicitly approved.
- **QA:** verifies outputs before client approval.
- **Revenue:** records commercial outcome after delivery.

## 2. Service Manager integration contract

When a client selects `AI_APPOINTMENT_BOOKING_AUTOMATION`, Service Manager creates the service using the catalog/contract identity.

Service Manager stores task IDs, not task implementation details.

Required service-level mapping:
- service_id
- client
- requirement
- service_type = `AI_AUTOMATION`
- selected_service = `AI_APPOINTMENT_BOOKING_AUTOMATION`
- task_ids
- lifecycle status
- QA status
- approval status
- delivery status
- revenue status

Service Manager calls Task Manager for task creation. Task Manager remains the source of truth for task state.

## 3. Task dependency map

| Order | Task | Depends on | External action? |
|---|---|---|---|
| 1 | LEAD_INTAKE | — | No |
| 2 | LEAD_QUALIFICATION | LEAD_INTAKE | No |
| 3 | APPOINTMENT_REQUEST | LEAD_QUALIFICATION | No |
| 4 | APPROVAL_GATE | APPOINTMENT_REQUEST | No |
| 5 | BOOKING_EXECUTION | APPROVAL_GATE | **Yes — approval required** |
| 6 | CRM_RECORD | BOOKING_EXECUTION | No |
| 7 | QA | CRM_RECORD | No |
| 8 | CLIENT_APPROVAL | QA | No |
| 9 | DELIVERY | CLIENT_APPROVAL | No |
| 10 | REVENUE_RECORD | DELIVERY | No |

No task may run before all dependencies are `COMPLETED`.

## 4. Orchestrator execution contract

Input:
- `service_id`
- `task_id`
- `action`
- `request_id`
- `approval_context`

Rules:
1. Validate service and task existence.
2. Validate task belongs to the service.
3. Check all dependencies are complete.
4. Ask the risk/approval policy before any external action.
5. If approval is required but absent, set task to `WAITING_FOR_APPROVAL` and stop.
6. If authorized, set task to `RUNNING`.
7. Execute only the task's declared action.
8. On success, persist result and set `COMPLETED`.
9. On failure, persist error and set `FAILED`.
10. Never skip QA, client approval, delivery or revenue stages.

### External-action rule
`BOOKING_EXECUTION` is always approval-gated in V1. The orchestrator must never silently convert a missing approval into authorization.

## 5. V1 boundaries

Included:
- deterministic service/task lifecycle
- dependency-aware orchestration
- approval gate
- QA and delivery lifecycle
- revenue recording

Not included yet:
- real WhatsApp/CRM/calendar provider integrations
- autonomous payment execution
- autonomous irreversible external actions
- distributed queues/workers
- complex persistence infrastructure

## Architecture Check result
**PASS WITH IMPLEMENTATION GATES**

The contract is implementable with the existing Service Manager and Task Manager. The next implementation should be a small integration layer that creates the service plan and dependency graph, then verifies orchestration with tests before adding external providers.
