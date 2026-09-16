# Real Task Executor V2 — Lifecycle Execution Gate

## Decision
Extend the production task executor from intake/qualification/request preparation to the remaining deterministic lifecycle actions already defined by the V1 service contract.

## Scope
This gate covers:
- `BOOKING_EXECUTION` through the provider-neutral calendar adapter
- `CRM_RECORD` through a deterministic internal record component
- `QA` through the existing Quality Assurance component
- `CLIENT_APPROVAL` through the existing explicit-consent component
- `DELIVERY` through the existing delivery component
- `REVENUE_RECORD` through the existing revenue component

## Rules
1. The Orchestrator remains the only lifecycle/state coordinator.
2. `BOOKING_EXECUTION` remains approval-gated and must fail closed when a provider is not configured.
3. Provider-specific booking behavior is injected through `CalendarBookingProviderAdapterV1`; the executor never embeds provider credentials or provider logic.
4. `CRM_RECORD`, `QA`, `CLIENT_APPROVAL`, `DELIVERY`, and `REVENUE_RECORD` consume completed dependency results; they do not bypass the dependency graph.
5. QA must receive deterministic acceptance criteria and the completed upstream result.
6. Client approval must require QA `PASS` and explicit approval context.
7. Delivery must require QA `PASS` and client approval `APPROVED`.
8. Revenue must require delivery `DELIVERED` and externally supplied payment confirmation; the executor never moves money.
9. Unsupported actions fail closed.

## Verification contract
The contract test must prove:
- booking waits without approval;
- approved booking invokes the injected provider adapter;
- CRM record consumes the booking result;
- QA consumes CRM output and passes deterministic criteria;
- client approval remains pending/rejected without explicit consent and approves only after QA pass;
- delivery remains blocked until QA and client approval are both satisfied;
- revenue records only after delivery and confirmed payment;
- missing provider configuration fails closed;
- dependency/state identity is preserved through the Orchestrator.

## Non-goals
- Real Calendly/Google Calendar credentials or network calls.
- Real CRM credentials or external CRM writes.
- Automatic payment execution.
- Autonomous client approval.
- Changes to frozen Dashboard contracts or Orchestrator ownership.

## Gate result
PASS requires architecture + contract test + implementation + local `npm test` + GitHub Actions green on the exact implementation SHA.
