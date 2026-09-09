# Execution Trace V1

## Purpose

Provide a request-level, append-only execution evidence record for JARVIS orchestration without becoming a second source of truth for service or task state.

## Ownership

- **Execution Trace** owns request-level execution evidence.
- **Task Manager** remains the source of truth for task state, dependencies, and task audit history.
- **Orchestrator** owns execution coordination and emits trace events at execution boundaries.
- **Risk / Approval Policy** remains the authorization owner.

## Required Trace Identity

Every execution trace MUST contain:

- `request_id`
- `service_id`
- `task_id`
- `action`
- `status`
- `started_at`
- `ended_at`
- ordered `events`

Every event MUST contain:

- `type`
- `timestamp`
- `status`

Optional event fields are limited to safe execution metadata such as `reason`, `policy_decision`, `result`, and `error`.

## Lifecycle

The canonical task trace is:

`STARTED -> [BLOCKED | WAITING_FOR_APPROVAL | RUNNING] -> [COMPLETED | FAILED]`

A terminal trace MUST have `ended_at`. A non-terminal trace MUST NOT claim completion.

## Safety Rules

1. `request_id` is mandatory and identifies one execution request.
2. A trace MUST NOT execute actions itself.
3. Trace recording MUST NOT bypass Risk / Approval Policy.
4. Trace output MUST be JSON-serializable.
5. Trace records MUST NOT expose credentials or secret material.
6. Task state remains owned by Task Manager; trace records reference it rather than replacing it.
7. Reusing a `request_id` for a different service/task/action is rejected.
8. Existing task audit history remains authoritative for task-state transitions.

## Verification Gate

V1 is complete only when contract tests verify identity, event ordering, terminal state handling, request-id collision protection, safe serialization, and Orchestrator integration for blocked, approval-waiting, success, and failure paths.
