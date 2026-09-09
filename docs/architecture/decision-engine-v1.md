# Decision Engine V1 Architecture

## Status
Architecture Check: APPROVED FOR V1 IMPLEMENTATION

## Purpose
The Decision Engine converts an explicit business goal and current state into a deterministic decision intent. It does not execute tasks, mutate task state, perform external actions, or replace policy/approval controls.

## Boundary

`input → Decision Engine → decision intent → Orchestrator`

The Decision Engine owns:
- goal interpretation at the contract level
- selection of one supplied candidate action
- decision rationale
- deterministic decision output

The Decision Engine does not own:
- task execution
- task state transitions
- risk or approval authorization
- external messages, bookings, payments, or data deletion
- execution trace persistence

## V1 Contract

Required input:
- `goal`: non-empty string
- `options`: non-empty array of candidate actions

Optional input:
- `state`: JSON-safe current state/context

Output:
- `decision_id`: stable per request identifier supplied by the caller
- `decision`: `PROCEED` or `CLARIFY`
- `selected_action`: one of the supplied options when `PROCEED`; `null` when `CLARIFY`
- `rationale`: non-empty string
- `goal`: normalized goal

## Safety / Composition Rules
1. Missing or invalid goal/options must fail closed with `CLARIFY` rather than guessing.
2. `selected_action` must always come from the supplied options.
3. The engine must never call the executor or mutate TaskManager state.
4. Risk/approval decisions remain owned by RiskApprovalPolicy and enforced by Orchestrator.
5. Execution trace remains owned by ExecutionTrace/Orchestrator.

## V1 Decision Rule
V1 is intentionally deterministic: when the goal and candidate options are valid, select the first candidate action and return `PROCEED`. Invalid/missing planning input returns `CLARIFY` with no selected action.

This narrow V1 is an architecture slice, not an AI reasoning layer. More sophisticated ranking can be added later only through a new contract/test decision.
