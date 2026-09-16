# Real Calendar Provider Live Gate V1

## Purpose

Verify the HTTP calendar provider against an explicitly configured non-production/test endpoint without allowing normal CI or the dashboard to create external bookings.

## Execution boundary

`JARVIS -> Dashboard Action Boundary -> Orchestrator -> Approval Gate -> External Execution Boundary -> HttpCalendarProviderV1 -> test provider`

The live-gate script is a verification harness. It is not a new business-state owner and it does not bypass the Orchestrator or approval model.

## Required runtime configuration

- `LIVE_PROVIDER_TEST=true`
- `CALENDAR_BASE_URL=https://<sandbox-or-test-endpoint>`
- `CALENDAR_TOKEN=<runtime secret>`
- `CALENDAR_TEST_SERVICE_ID=<known test service>`
- `CALENDAR_TEST_TASK_ID=<known booking task>`
- `CALENDAR_TEST_LEAD_ID=<known test lead>`
- `CALENDAR_TEST_REQUESTED_TIME=<provider-compatible test time>`
- `CALENDAR_TEST_DURATION_MINUTES=<positive integer>`

## Safety gates

1. The live test is opt-in; normal `npm test` does not create an external booking.
2. The endpoint must use HTTPS.
3. The endpoint must identify itself as sandbox/staging/test/localhost/127.0.0.1. A production endpoint is rejected by the harness.
4. Missing credentials or test identity fail closed.
5. The token is never printed and must not appear in the normalized result.
6. The result must preserve `request_id`, `service_id`, and `task_id`.
7. A successful provider response is required for a PASS. No simulated success is accepted.

## Evidence standard

A green contract test proves transport behavior only. A green live gate proves that the configured test provider accepted one real request and returned a normalized successful response. CI must not be described as live-provider verification unless the live job actually ran with configured test-provider secrets and produced external-response evidence.

## Freeze rule

Do not mark this gate COMPLETE/FROZEN until a real non-production provider run has been executed with the required secrets and its workflow/job evidence has been verified by exact commit SHA.
