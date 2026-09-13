# JARVIS Operator Console V1 Contract

## Purpose

The Operator Console is the human-facing live control surface for MR WALI JARVIS. It is distinct from the read-only Dashboard V1 surface.

## Requirements

1. The console MUST be available from the existing Node/Express application without creating a second backend.
2. The console MUST provide both text input and browser voice input.
3. JARVIS responses MUST be visible in the conversation and MAY be spoken using browser speech synthesis when supported.
4. User commands MUST flow into the existing core command/execution boundary; the console MUST NOT become a second business-logic engine.
5. Risky or irreversible execution MUST remain subject to the existing core risk/approval policy. The console MUST display an approval request and send approval through the existing controlled action boundary.
6. Execution state MUST remain observable through the existing dashboard read APIs and execution trace.
7. The central JARVIS visual MUST use the supplied core artwork unchanged as the base visual. Animation may add motion/glow effects around it but MUST NOT replace or redesign the artwork.
8. The console MUST work in a normal browser at the existing local server and remain compatible with future desktop wrapping.
9. No new persistence source of truth may be introduced by the console.
10. The console MUST remain responsive on desktop and mobile widths.

## API Boundary

The console may consume POST /ask, GET /api/dashboard/status, GET /api/dashboard/tasks, GET /api/dashboard/activity, and POST /api/dashboard/actions.

The console MUST NOT directly mutate business persistence.

## Voice

Voice input uses browser Speech Recognition when available. Voice output uses browser Speech Synthesis when available. Unsupported browsers MUST degrade to text-only operation.

## Safety

The UI is never allowed to bypass the Orchestrator or risk-approval policy. Approval is an explicit human action.
