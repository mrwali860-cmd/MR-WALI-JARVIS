# Operator Console V3 — Voice Architecture

## Goal
Enable the existing JARVIS Operator Console to accept spoken input and speak JARVIS responses without changing business execution authority.

## Boundaries
- `jarvis.html` remains the operator UI.
- Browser Web Speech API is the V3 speech boundary: `SpeechRecognition`/`webkitSpeechRecognition` for speech-to-text and `speechSynthesis` for text-to-speech.
- `POST /ask` remains the only conversational backend boundary.
- `JarvisChatV2` remains responsible for conversational response generation.
- Existing `analyzeCommand()`, Orchestrator, Dashboard Action Boundary, approvals, and services remain authoritative for execution.
- Voice must never execute a business action directly.

## Voice flow
`Microphone → SpeechRecognition → transcript → existing /ask flow → JARVIS reply → speechSynthesis`

## Required behavior
1. Voice input can be started/stopped safely.
2. Recognition errors do not break chat.
3. Final transcript is sent through the same `/ask` path as typed messages.
4. Interim recognition text is visual-only and never executed.
5. Speech output uses the exact returned JARVIS reply.
6. Speech output can be stopped by the operator.
7. Unsupported browsers degrade to typed chat without breaking the console.
8. No new backend execution path, database, task manager, orchestrator, or approval bypass is introduced.

## Acceptance criteria
- Voice controls are present and wired to browser speech APIs.
- Voice transcript reaches `/ask`.
- `/ask` response is rendered in the existing chat surface.
- JARVIS reply is spoken when voice mode is enabled.
- Errors fall back to normal text interaction.
- Existing V1/V2 contracts and business execution boundaries remain unchanged.

## Locked V3 delivery gate
Architecture → Contract Test → Existing Console/Core Audit → Minimal Implementation → `npm test` → GitHub Actions → Exact SHA → Browser Live Voice Test → Visual Verification → FREEZE.
