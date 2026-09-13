# Real Prospect Discovery V1

## Purpose
Activate the existing `ProspectDiscoveryV1` with real Apify Google Maps data without creating a second prospect-discovery domain module.

## Runtime path
Apify Google Maps → normalized provider results → `ProspectDiscoveryV1.discover()` → `data/prospects.json` → human approval list.

## Safety
- `APIFY_TOKEN` is read only from the environment; it is never stored in source control or output.
- Discovery is read-only with respect to external systems.
- No email, WhatsApp, phone call, payment, or outreach is performed.
- No prospect is marked contacted/sent merely by discovery.
- Existing `ProspectDiscoveryV1` remains the canonical normalization and deduplication contract.
- Results are saved locally under ignored `data/` storage.

## Configuration
- `APIFY_TOKEN` — required local secret.
- `PROSPECT_SEARCH_QUERY` — default `real estate agency Dubai`.
- `PROSPECT_MAX_RESULTS` — default `20`, maximum `100`.
- `PROSPECT_OUTPUT_FILE` — default `data/prospects.json`.
- `APIFY_POLL_MS` — default `3000`.
- `APIFY_TIMEOUT_MS` — default `600000`.

## Operator command
`node scripts/real-prospect-discovery.js`

The command exits non-zero on missing credentials, Apify failure, malformed run response, timeout, or failed actor execution.

## Acceptance
Real provider data must pass through the existing discovery contract and produce a deterministic, deduplicated approval list. External outreach remains disabled until a separate explicit approval/execution path is used.
