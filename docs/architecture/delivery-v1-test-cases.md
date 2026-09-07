# Delivery V1 — Test Cases

## Contract / identity

1. Component exposes `CLIENT_DELIVERY` identity, name, version, and AVAILABLE status.
2. Health check reports healthy when component is AVAILABLE.

## Input validation

3. Missing `service_id` is rejected.
4. Missing `request_id` is rejected.
5. Missing `qa_decision` is rejected.
6. Missing `client_approval_decision` is rejected.
7. Missing `delivery_payload` is rejected.

## QA gate

8. QA `FAIL` returns `BLOCKED`.
9. QA `REVIEW` returns `BLOCKED`.
10. QA `PENDING` returns `BLOCKED`.
11. QA decision other than `PASS` never reaches delivery.

## Client approval gate

12. Client approval `PENDING` returns `BLOCKED`.
13. Client approval `REJECTED` returns `BLOCKED`.
14. Client approval other than `APPROVED` never reaches delivery.

## Successful delivery

15. QA `PASS` + client approval `APPROVED` + valid payload returns `DELIVERED`.
16. Successful result preserves `service_id` and `request_id`.
17. Successful result contains delivery payload, reason, status, and timestamp.

## Failure / boundary

18. A delivery executor failure returns `FAILED` with a reason.
19. Delivery cannot create client approval.
20. Delivery cannot record revenue.
21. Unsupported delivery action is rejected.
22. No unrelated external action is performed by the component.

## Contract acceptance

All cases must pass before Delivery V1 is considered implementation-complete. CI must execute the Delivery test as part of `npm test`.
