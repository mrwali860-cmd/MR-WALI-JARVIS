# Action Boundary → Orchestrator → Execution Trace V1

## Objective

Make Dashboard-triggered task execution traceable end-to-end without allowing the Dashboard to own or mutate core business state.

## Contract

The Dashboard Action Boundary accepts the dashboard command envelope:

- `action = EXECUTE_TASK`
- `target.service_id`
- `target.task_id`
- `request_id`
- optional `approval_context` and `input`

The boundary validates and delegates to the core Orchestrator. It does not persist or mutate task/service state.

The Orchestrator owns execution. For the `EXECUTE_TASK` command envelope, it resolves the target task and derives the canonical task action from `task.action`. Direct Orchestrator callers may continue to provide the canonical task action; it must match the task definition.

## Traceability invariant

The same `request_id` MUST survive unchanged through:

`Dashboard Action Boundary → Orchestrator → Task Manager state metadata → Execution Trace → returned execution result`.

The canonical task identity is resolved by the Orchestrator from `service_id + task_id`; the Dashboard cannot supply an arbitrary execution action that overrides the task definition.

## Gates

Dependency, risk, and approval policy gates remain Orchestrator-owned. A blocked or waiting request must still return its trace with the original `request_id`. A successful execution must return the completed task and trace with the same identity.

## Source-of-truth rule

Execution Trace is request-level evidence only. Task Manager remains authoritative for task state. Dashboard remains a command/read surface and is never a second persistence source.

## Verification

Contract tests MUST cover:

1. valid Dashboard command delegates exactly once;
2. `EXECUTE_TASK` resolves the canonical task action;
3. `request_id` is preserved end-to-end;
4. dependency blocking preserves the trace identity;
5. approval waiting preserves the trace identity;
6. executor success reaches `COMPLETED` with matching task state;
7. executor failure reaches `FAILED` with matching task state;
8. an arbitrary action cannot override the task's canonical action.
