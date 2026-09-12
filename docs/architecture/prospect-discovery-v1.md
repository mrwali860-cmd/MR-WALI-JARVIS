# Prospect Discovery V1

## Mission
Provide a deterministic, provider-neutral discovery boundary that converts an approved target-market search request into normalized prospect records for JARVIS's business-acquisition loop.

## Canonical flow
`TARGET MARKET → DISCOVERY REQUEST → PROVIDER RESULT → NORMALIZE → VALIDATE → PROSPECT → BUSINESS ACQUISITION AGENT`

## Responsibilities
- Validate the discovery request.
- Require an explicit target market and search context.
- Normalize provider-supplied business records into a stable prospect shape.
- Reject malformed records and duplicate identities deterministically.
- Preserve provider provenance without exposing credentials.
- Return discovery evidence metadata suitable for later audit.

## Non-responsibilities
- No direct network calls from the core normalization capability.
- No credentials or API tokens in source or output.
- No outreach or messaging.
- No autonomous client contact.
- No payments or money movement.
- No mutation of frozen infrastructure.
- No invented company/contact/problem data.

## Input contract
Required:
- `request_id`
- `target_market`
- `search_context`
- `provider_results` (array)

Each provider result may contain:
- `provider`
- `provider_record_id`
- `company`
- `website`
- `phone`
- `email`
- `city`
- `country`
- `category`

## Output contract
Return:
- `request_id`
- `status`: `READY` or `REJECTED`
- `prospects`: normalized records
- `rejected_count`
- `evidence`: deterministic, provider-neutral metadata

A normalized prospect must have a stable identity based on available provider identity fields. Missing optional contact fields remain absent; they are never fabricated.

## Determinism and safety
- Same valid input produces the same output.
- Invalid request shape fails closed.
- Invalid provider records are rejected rather than repaired with guesses.
- Credentials are never accepted as prospect fields or copied into evidence.
- The capability prepares data only; it does not execute external actions.

## Boundary
Discovery providers remain outside this core. Provider adapters/external execution are responsible for actual network access. This V1 capability consumes provider results and creates a safe normalized prospect set.
