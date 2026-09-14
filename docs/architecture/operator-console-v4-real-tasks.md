# Operator Console V4 — Real Task Execution Architecture

## Goal
Allow a JARVIS chat command to execute an existing task through the existing Orchestrator and Service Manager/Task Manager contracts.

## Locked execution path
`Browser chat → POST /ask → V4 task-command adapter → Orchestrator.executeTask() → existing Service/Task execution contract`

The browser does not execute business logic. `JarvisChatV2` remains conversational only. V4 is the execution bridge for explicitly resolvable task commands.

## Authority boundaries
- `jarvis.html`: presentation and `/ask` transport only.
- `JarvisChatV2`: conversational response generation only; no mutation or execution.
- V4 task-command adapter: parse/validate an explicit task target and delegate; it must not implement business execution.
- `Orchestrator`: authoritative execution lifecycle, dependency checks, risk policy, task status, and execution trace.
- `ServiceManager` and `TaskManager`: existing service/task state authorities.
- `DashboardActionBoundary`: remains the Dashboard execution boundary and is not duplicated by V4.

## Supported V4 command form
A command must identify an existing service and task. Accepted forms are:
- `execute task <service_id> <task_id>`
- `run task <service_id> <task_id>`

The adapter returns a clarification response for commands without a complete target. It never guesses a service or task.

## Execution contract
The adapter generates a unique `request_id` when the command does not provide one, then calls `orchestrator.executeTask({ service_id, task_id, action: "EXECUTE_TASK", request_id, approval_context, input })`.

The returned status is surfaced unchanged: `BLOCKED`, `WAITING_FOR_APPROVAL`, `FAILED`, or `COMPLETED`.

## Safety / non-duplication
- No new task manager.
- No new service manager.
- No second orchestrator.
- No direct external provider execution from chat.
- No approval bypass.
- No direct task-status mutation from the adapter.
- Existing execution trace remains authoritative.

## Acceptance criteria
1. Explicit task command reaches the existing Orchestrator.
2. Unknown service/task is rejected without mutation.
3. Dependency and approval gates are enforced by Orchestrator.
4. `request_id` is traceable in the result.
5. Successful execution returns the existing Orchestrator result.
6. Non-task conversation remains on V2 chat path.
7. Existing V1/V2/V3 behavior is preserved.

## Delivery gate
Architecture → Contract Test → Existing Console/Core Audit → Minimal implementation → `npm test` → GitHub Actions → Exact SHA → Browser live task test → Visual verification → FREEZE.
