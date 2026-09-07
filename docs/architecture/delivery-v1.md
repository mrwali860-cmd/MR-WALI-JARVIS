# Delivery V1 — Architecture & Contract

## Purpose
Delivery is the controlled lifecycle gate that transfers a QA-passed, explicitly client-approved service output into a delivered state.

Delivery does not perform QA, grant client approval, authorize risk, record revenue, or execute unrelated external actions.

## Lifecycle

```text
QA PASS
   ↓
CLIENT APPROVAL = APPROVED
   ↓
DELIVERY
   ↓
DELIVERED
   ↓
REVENUE
```

## Ownership

- QA owns quality verification.
- Client Approval owns explicit client consent.
- Delivery owns delivery eligibility and delivery state.
- Revenue owns commercial outcome recording.

## Contract V1

### Required input

- `service_id`
- `request_id`
- `qa_decision`
- `client_approval_decision`
- `delivery_payload`

### Optional input

- `delivery_context`

### Output

Every successful decision returns:

- `decision`
- `service_id`
- `request_id`
- `delivery_status`
- `reason`
- `delivery_payload`
- `timestamp`

## Decision states

- `READY`
- `DELIVERED`
- `BLOCKED`
- `FAILED`

## Hard invariants

1. `qa_decision != PASS` can never become `READY` or `DELIVERED`.
2. `client_approval_decision != APPROVED` can never become `READY` or `DELIVERED`.
3. `PENDING` approval blocks delivery.
4. `REJECTED` approval blocks delivery.
5. Delivery never converts QA PASS into client approval.
6. Delivery never records revenue.
7. Delivery never bypasses Risk/Approval controls.
8. Delivery failure must return `FAILED` with a reason.
9. Missing required inputs must not produce a successful delivery.
10. Delivery must not execute unrelated external actions.

## V1 execution boundary

The Delivery component may validate eligibility and, when explicitly invoked by its declared contract, transition an eligible delivery to `DELIVERED`. It must not silently send messages, move money, delete data, or perform unrelated external side effects.

## Acceptance criteria

- QA PASS + client APPROVED + valid payload => delivery eligible and successful delivery result.
- QA FAIL/REVIEW/PENDING => BLOCKED.
- Client approval PENDING/REJECTED => BLOCKED.
- Missing required field => validation failure.
- Delivery failure => FAILED.
- Output contains audit fields and timestamp.

## Architecture gate

**PASS WITH IMPLEMENTATION GATES**

Next: implement `src/business/delivery.js`, add `src/business/delivery-test.js`, include the test in `npm test`, then verify the exact `main` SHA through GitHub Actions.
