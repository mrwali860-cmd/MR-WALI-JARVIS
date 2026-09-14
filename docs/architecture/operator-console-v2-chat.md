# MR WALI JARVIS — Operator Console V2 Real Chat

## Status
LOCKED CONTRACT — V2

## Mission
Connect the existing operator-console chat UI to the existing MR WALI JARVIS backend so text messages use one authoritative JARVIS interaction path without creating a second business engine.

## Architecture Boundary
- Browser sends `POST /ask` with `{ message }`.
- `server.js` remains the HTTP boundary.
- `JarvisChatV2` owns conversational response generation only.
- Existing `analyzeCommand()` / action execution remains authoritative for supported business commands.
- Existing Orchestrator and Dashboard Action Boundary remain the only execution/mutation path.
- Chat must not write business state, services, tasks, approvals, or execution traces directly.

## Provider Contract
- When `OPENAI_API_KEY` is configured, `JarvisChatV2` may use the configured OpenAI model through the existing dependency.
- Model selection uses `EMPIRE_LLM_MODEL` when provided.
- Provider failure must return a safe explicit fallback response; it must not claim that an action was executed.
- Missing provider configuration must not break the operator console or existing deterministic command paths.

## Response Contract
`POST /ask` preserves the existing response envelope and adds:
- `chatMode`: `LLM` or `FALLBACK`
- `jarvis`: user-visible response
- `success`: boolean

Existing command/action fields remain unchanged for supported commands.

## Conversation Contract
- Text messages are accepted from the existing chat composer.
- The UI displays user and JARVIS messages in order.
- JARVIS may ask clarification instead of inventing missing requirements.
- Conversational output must not imply execution unless the existing action path reports execution.

## Non-Goals
- No new database.
- No new task manager.
- No new orchestrator.
- No autonomous provider execution from chat.
- No approval bypass.
- No voice implementation in V2; V3 owns voice.

## Acceptance Criteria
- `POST /ask` accepts a non-empty text message.
- Existing supported command actions continue to use their existing execution path.
- General chat uses `JarvisChatV2` when an LLM provider is available.
- Provider absence/failure produces a deterministic safe response.
- Chat code cannot directly mutate business persistence.
- Existing test suite remains compatible.

## Delivery Gate
Architecture → Contract → Contract Test → Minimal Implementation → npm test → GitHub Actions → Exact SHA Verification → Evidence → Freeze.
