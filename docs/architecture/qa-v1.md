# QA Capability V1 — Contract

## Decision
QA is the mandatory quality control point after execution and before client approval.

Lifecycle:

`Execute → QA → Client Approval → Delivery → Revenue`

## 1. Responsibility

QA validates the output of an executed task/service against its expected output and acceptance criteria.

QA MUST NOT:
- execute external actions;
- bypass Risk/Approval Policy;
- grant client approval;
- mark delivery complete;
- record revenue.

## 2. Input contract

Required:
- `service_id`
- `task_id`
- `request_id`
- `expected_output`
- `actual_output`
- `acceptance_criteria`
- `execution_status`

Optional:
- `qa_context`
- `evidence`

The QA engine must reject a request with missing required fields rather than guessing.

## 3. Decision contract

QA returns exactly one decision:

- `PASS` — output satisfies the acceptance criteria and may proceed to client approval.
- `FAIL` — output does not satisfy the acceptance criteria and requires rework.
- `REVIEW` — automated QA cannot make a reliable decision and human review is required.

Every decision must include:
- `decision`
- `service_id`
- `task_id`
- `request_id`
- `reason`
- `checks`

## 4. State transition contract

`PASS` → QA completed → eligible for `CLIENT_APPROVAL`.

`FAIL` → QA failed → rework required → task returns to the controlled execution/rework path.

`REVIEW` → human review required → no automatic delivery or revenue transition.

QA does not silently convert `FAIL` or `REVIEW` into `PASS`.

## 5. Quality checks

V1 QA checks are deterministic and contract-driven:
- required output exists;
- execution status is successful;
- acceptance criteria are satisfied;
- expected and actual output are structurally compatible where applicable;
- no declared critical validation check failed.

## 6. Retry/rework boundary

QA failure is a rework signal, not permission for uncontrolled retries.

V1 must track `retry_count` and `max_retries` when rework execution is implemented. Exceeding the configured limit must stop automatic rework and require review.

## 7. Integration boundary

Orchestrator remains responsible for execution coordination.
Risk/Approval Policy remains responsible for authorization.
Task Manager remains the source of truth for task state.
QA owns only quality evaluation and its decision record.

## Architecture Gate

**PASS WITH IMPLEMENTATION GATES**

Implementation may begin only after the QA test cases in `qa-v1-test-cases.md` are accepted.
