# QA Capability V1 — Test Cases

These tests define the implementation gate. No QA implementation should be considered complete unless all cases pass.

## Contract tests

1. Component exposes `getInfo()`, `healthCheck()`, and `execute()`.
2. Component identity is `QA` / `QUALITY_ASSURANCE` and status is `AVAILABLE`.
3. Missing `service_id` is rejected.
4. Missing `task_id` is rejected.
5. Missing `request_id` is rejected.
6. Missing `expected_output` is rejected.
7. Missing `actual_output` is rejected.
8. Missing `acceptance_criteria` is rejected.
9. Missing `execution_status` is rejected.

## Decision tests

10. Valid successful output satisfying all acceptance criteria returns `PASS`.
11. Output missing a required criterion returns `FAIL`.
12. Failed execution status cannot return `PASS`.
13. Ambiguous/unreliable automated validation returns `REVIEW`.
14. Every decision contains `decision`, `service_id`, `task_id`, `request_id`, `reason`, and `checks`.

## Safety/state tests

15. `FAIL` never triggers external execution itself.
16. `REVIEW` never triggers automatic delivery.
17. `REVIEW` never triggers revenue recording.
18. QA cannot grant client approval.
19. QA cannot bypass Risk/Approval Policy.
20. QA failure supports controlled rework metadata (`retry_count` / `max_retries`) without allowing infinite automatic retries.

## Integration tests

21. QA accepts a completed execution result and evaluates it before client approval.
22. QA `PASS` makes the service/task eligible for the client-approval stage, but does not approve it.
23. QA `FAIL` blocks progression to client approval until rework succeeds.
24. QA `REVIEW` blocks automatic progression until human review resolves it.
25. Orchestrator remains the execution coordinator; QA remains the quality decision owner.

## Implementation gate

**All 25 cases must pass before QA V1 is marked production-ready.**
