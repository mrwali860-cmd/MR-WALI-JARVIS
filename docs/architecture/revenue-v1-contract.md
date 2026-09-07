# Revenue V1 — Contract & Test Specification

## Purpose
Record revenue only after a valid delivered service and explicit payment confirmation.

`DELIVERED != PAID`

## Required input
- `service_id`
- `request_id`
- `delivery_status`
- `payment_status`
- `amount`
- `currency`
- `transaction_reference`

## Optional input
- `payment_context`

## Output
- `decision`
- `service_id`
- `request_id`
- `revenue_status`
- `amount`
- `currency`
- `transaction_reference`
- `reason`
- `timestamp`

## States
- `PENDING`
- `PAID`
- `FAILED`
- `REFUNDED`

## Hard invariants
1. Delivery must be `DELIVERED` before revenue can become `PAID`.
2. Payment must be explicitly `CONFIRMED` before revenue can become `PAID`.
3. Amount must be a finite positive number.
4. Currency must be present and non-empty.
5. Transaction reference must be present and non-empty.
6. The same transaction reference must not be recorded twice.
7. Revenue must not infer payment from delivery.
8. Revenue must not grant client approval or bypass risk controls.
9. Revenue must not silently convert failed/refunded payments into `PAID`.
10. Missing required input must never produce a successful revenue record.

## Test Cases

1. Valid delivered + confirmed payment => `PAID`.
2. Delivery not `DELIVERED` => blocked.
3. Delivery `PENDING` => blocked.
4. Delivery `FAILED` => blocked.
5. Payment not `CONFIRMED` => blocked.
6. Payment `PENDING` => blocked.
7. Payment `FAILED` => `FAILED`, never `PAID`.
8. Payment `REFUNDED` => `REFUNDED`, never `PAID`.
9. Missing service_id => validation failure.
10. Missing request_id => validation failure.
11. Missing delivery_status => validation failure.
12. Missing payment_status => validation failure.
13. Missing amount => validation failure.
14. Zero amount => validation failure.
15. Negative amount => validation failure.
16. Non-finite amount => validation failure.
17. Missing currency => validation failure.
18. Blank currency => validation failure.
19. Missing transaction reference => validation failure.
20. Blank transaction reference => validation failure.
21. Duplicate transaction reference => rejected.
22. Timestamp is present on successful record.
23. Transaction identity remains stable in output.
24. Revenue does not execute unrelated external actions.
25. Unsupported action is rejected.

## Architecture gate
PASS WITH IMPLEMENTATION GATES.

Next: implement `src/business/revenue.js` and `src/business/revenue-test.js`, add the test to `npm test`, then verify exact main SHA through GitHub Actions.
