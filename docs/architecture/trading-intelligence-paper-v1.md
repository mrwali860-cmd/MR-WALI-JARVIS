# Trading Intelligence + Paper Execution V1

## Purpose

Add a real trading-system foundation without creating a second orchestration architecture.

## Boundary

`Market Data -> Trading Engine -> Signal -> Risk Check -> Paper Order -> Verification Evidence`

The existing JARVIS Orchestrator remains responsible for task lifecycle, dependency checks, risk/approval policy, and execution trace. The trading engine owns only trading-domain calculations and paper-order simulation.

## V1 capabilities

- OHLC candle validation.
- Deterministic baseline moving-average signal.
- Explicit position-notional limit.
- Explicit maximum-loss-per-trade limit when a stop price is supplied.
- Simulated BUY/SELL/HOLD execution.
- Deterministic paper-fill verification metadata.
- Request identity on paper orders.

## Explicit non-capabilities

- No live broker/exchange connection.
- No real-money order submission.
- No credential handling.
- No claim of profitability.
- No autonomous financial execution.

## Future controlled boundary

Any future live-execution work must remain behind the existing external-execution boundary and approval/risk policy, with provider adapters, order-status verification, duplicate-order protection, kill switch, position limits, and auditable evidence. V1 deliberately stops before that boundary.
