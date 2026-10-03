"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * Trading Backtest V2
 * Deterministic historical simulation only; never connects to a broker/exchange.
 *
 * Execution model: signal is computed from candles strictly before the
 * execution candle; entries/exits occur at the next candle's open.
 */
class TradingBacktestV1 extends ComponentContract {
    constructor({ tradingEngine, ...config } = {}) {
        super({
            id: "TRADING_BACKTEST_V1",
            name: "Trading Historical Backtest Engine",
            version: "1.1.0",
            status: "AVAILABLE",
            ...config
        });
        if (!tradingEngine || typeof tradingEngine.signal !== "function") {
            throw new Error("tradingEngine is required");
        }
        this.tradingEngine = tradingEngine;
    }

    validateInput({ candles, initial_equity = 1000, quantity = 1 } = {}) {
        if (!Array.isArray(candles) || candles.length < 5) throw new Error("CANDLES_MINIMUM_5_REQUIRED");
        const equity = Number(initial_equity);
        const qty = Number(quantity);
        if (!Number.isFinite(equity) || equity <= 0) throw new Error("INVALID_INITIAL_EQUITY");
        if (!Number.isFinite(qty) || qty <= 0) throw new Error("INVALID_QUANTITY");

        let previousTimestamp = null;
        for (const candle of candles) {
            for (const field of ["open", "high", "low", "close"]) {
                if (!Number.isFinite(Number(candle[field]))) throw new Error("INVALID_CANDLE");
            }
            const open = Number(candle.open);
            const high = Number(candle.high);
            const low = Number(candle.low);
            const close = Number(candle.close);
            if (high < low || open < low || open > high || close < low || close > high) {
                throw new Error("INVALID_CANDLE_RANGE");
            }
            if (candle.timestamp !== undefined) {
                const timestamp = String(candle.timestamp);
                if (previousTimestamp !== null && timestamp <= previousTimestamp) {
                    throw new Error("INVALID_CANDLE_ORDER");
                }
                previousTimestamp = timestamp;
            }
        }
        return { equity, qty };
    }

    markEquity(cash, position, price) {
        return cash + (position ? position.quantity * (price - position.entry_price) * position.side : 0);
    }

    closePosition(position, price, index, reason) {
        if (!position) return null;
        const pnl = position.quantity * (price - position.entry_price) * position.side;
        return {
            entry_index: position.entry_index,
            exit_index: index,
            side: position.side === 1 ? "BUY" : "SELL",
            quantity: position.quantity,
            entry_price: position.entry_price,
            exit_price: price,
            pnl: Number(pnl.toFixed(8)),
            exit_reason: reason
        };
    }

    run({ candles, initial_equity = 1000, quantity = 1 } = {}) {
        const { equity: startingEquity, qty } = this.validateInput({ candles, initial_equity, quantity });
        let cash = startingEquity;
        let position = null;
        const trades = [];
        const equity_curve = [];

        // The signal for candle i may only use candles [0..i-1].
        // Execution happens at candle i open, eliminating same-close lookahead.
        for (let i = 4; i < candles.length; i += 1) {
            const signal = this.tradingEngine.signal(candles.slice(0, i));
            const desiredSide = signal.side === "BUY" ? 1 : signal.side === "SELL" ? -1 : 0;
            const executionPrice = Number(candles[i].open);

            if (position && desiredSide !== position.side) {
                const trade = this.closePosition(position, executionPrice, i, "SIGNAL_CHANGE");
                cash += trade.pnl;
                trades.push(trade);
                position = null;
            }
            if (!position && desiredSide !== 0) {
                position = {
                    side: desiredSide,
                    quantity: qty,
                    entry_price: executionPrice,
                    entry_index: i
                };
            }

            const markPrice = Number(candles[i].close);
            equity_curve.push({
                index: i,
                price: markPrice,
                equity: Number(this.markEquity(cash, position, markPrice).toFixed(8))
            });
        }

        if (position) {
            const lastIndex = candles.length - 1;
            const trade = this.closePosition(position, Number(candles[lastIndex].close), lastIndex, "END_OF_DATA");
            cash += trade.pnl;
            trades.push(trade);
        }

        const finalEquity = cash;
        const wins = trades.filter(t => t.pnl > 0).length;
        const losses = trades.filter(t => t.pnl < 0).length;
        const grossProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
        const grossLoss = trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0);

        let peak = startingEquity;
        let maxDrawdown = 0;
        for (const point of equity_curve) {
            peak = Math.max(peak, point.equity);
            maxDrawdown = Math.max(maxDrawdown, peak - point.equity);
        }

        if (!equity_curve.length || equity_curve[equity_curve.length - 1].equity !== finalEquity) {
            equity_curve.push({
                index: candles.length - 1,
                price: Number(candles[candles.length - 1].close),
                equity: Number(finalEquity.toFixed(8))
            });
        }

        return {
            status: "BACKTEST_COMPLETED",
            simulated: true,
            strategy: "MA_CROSSOVER_BASELINE",
            execution_model: "NEXT_CANDLE_OPEN",
            initial_equity: startingEquity,
            final_equity: Number(finalEquity.toFixed(8)),
            total_pnl: Number((finalEquity - startingEquity).toFixed(8)),
            return_pct: Number((((finalEquity / startingEquity) - 1) * 100).toFixed(8)),
            trade_count: trades.length,
            winning_trades: wins,
            losing_trades: losses,
            win_rate_pct: trades.length ? Number(((wins / trades.length) * 100).toFixed(8)) : 0,
            gross_profit: Number(grossProfit.toFixed(8)),
            gross_loss: Number(grossLoss.toFixed(8)),
            max_drawdown: Number(maxDrawdown.toFixed(8)),
            trades,
            equity_curve,
            note: "Historical simulation only. Results are not a profitability guarantee and do not represent live execution."
        };
    }

    execute(input = {}) {
        if (String(input.action || "TRADING_BACKTEST").toUpperCase() !== "TRADING_BACKTEST") {
            throw new Error(`Unsupported trading backtest action: ${input.action}`);
        }
        return { success: true, backtest: this.run(input) };
    }
}

module.exports = TradingBacktestV1;
