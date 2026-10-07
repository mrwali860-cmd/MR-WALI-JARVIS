# Trading Backtest V1

## Purpose
Deterministic historical simulation built on the existing Trading Intelligence V1 signal engine.

## Boundary
Historical OHLC → causal TradingEngineV1 signal → next-candle-open simulated position lifecycle → P&L → equity curve → performance metrics.

## Rules
- Signal for execution candle i uses only candles before i.
- Entry and signal-change exits are simulated at candle i open.
- The execution model is NEXT_CANDLE_OPEN; the signal candle close is never used as its own execution price.
- Equity is marked using the execution candle close after the simulated order.
- Only one position is held at a time.
- BUY = +1 unit exposure; SELL = -1 unit exposure.
- A changed signal closes the current position and may open the new side at the same next-candle open.
- Any open position closes at the final historical close.
- V1 does not model commissions, spread, slippage, financing or market impact.

## Input validation
- At least 5 candles are required.
- OHLC values must be finite.
- high >= low.
- open and close must be within the candle high/low range.
- If timestamps are supplied, they must be strictly increasing.

## Metrics
Initial/final equity, total P&L, return %, trade count, wins/losses, win rate, gross profit/loss, maximum drawdown, trade list and equity curve.

## Safety / scope
This module is historical simulation only. It has no broker/exchange integration, credentials, real-money execution or profitability guarantee.

## Next gate
Add transaction-cost modeling and out-of-sample/robustness evaluation before treating any historical result as meaningful evidence.
