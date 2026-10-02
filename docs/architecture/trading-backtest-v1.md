# Trading Backtest V1

## Purpose
Deterministic historical simulation built on the existing Trading Intelligence V1 signal engine.

## Boundary
Historical OHLC → TradingEngineV1 signal → simulated position lifecycle → P&L → equity curve → performance metrics.

## Rules
- Signal uses only candles available through the current candle.
- Entry/exit is simulated at that candle's close.
- Only one position is held at a time.
- BUY = +1 unit exposure; SELL = -1 unit exposure.
- A changed signal closes the current position and may open the new side.
- Any open position closes at the final historical close.
- V1 does not model commissions, spread, slippage, financing or market impact.

## Metrics
Initial/final equity, total P&L, return %, trade count, wins/losses, win rate, gross profit/loss, maximum drawdown, trade list and equity curve.

## Safety / scope
This module is historical simulation only. It has no broker/exchange integration, credentials, real-money execution or profitability guarantee.

## Next gate
Add transaction-cost modeling and out-of-sample/robustness evaluation before treating any historical result as meaningful evidence.
