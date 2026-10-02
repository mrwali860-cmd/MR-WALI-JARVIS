"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * Trading Engine V1
 *
 * Educational / paper-trading engine only.
 * It converts OHLC candles into a deterministic signal, applies explicit
 * risk limits, and creates a simulated order. It never sends a live order.
 */
class TradingEngineV1 extends ComponentContract {
    constructor(config = {}) {
        super({
            id: "TRADING_ENGINE_V1",
            name: "Trading Intelligence + Paper Execution Engine",
            version: "1.0.0",
            status: "AVAILABLE",
            ...config
        });
        this.defaultRisk = {
            max_position_notional: 1000,
            max_loss_per_trade: 20
        };
    }

    validateCandles(candles) {
        if (!Array.isArray(candles) || candles.length < 4) {
            throw new Error("CANDLES_MINIMUM_4_REQUIRED");
        }
        for (const candle of candles) {
            for (const field of ["open", "high", "low", "close"]) {
                if (!Number.isFinite(Number(candle[field]))) throw new Error("INVALID_CANDLE");
            }
            if (Number(candle.high) < Number(candle.low)) throw new Error("INVALID_CANDLE_RANGE");
        }
    }

    movingAverage(values, period) {
        const slice = values.slice(-period);
        return slice.reduce((sum, value) => sum + value, 0) / period;
    }

    signal(candles) {
        this.validateCandles(candles);
        const closes = candles.map(c => Number(c.close));
        const fast = this.movingAverage(closes, 3);
        const slow = this.movingAverage(closes, Math.min(4, closes.length));
        const price = closes[closes.length - 1];
        let side = "HOLD";
        if (fast > slow) side = "BUY";
        if (fast < slow) side = "SELL";
        return {
            side,
            price,
            indicators: { fast_ma: Number(fast.toFixed(8)), slow_ma: Number(slow.toFixed(8)) },
            strategy: "MA_CROSSOVER_BASELINE",
            note: "Baseline educational strategy; no profitability is implied."
        };
    }

    riskCheck({ side, price, quantity = 1, stop_loss_price, risk = {} } = {}) {
        const limits = { ...this.defaultRisk, ...risk };
        const notional = Math.abs(Number(price) * Number(quantity));
        if (!Number.isFinite(notional) || notional <= 0) return { allowed: false, reason: "INVALID_NOTIONAL" };
        if (notional > limits.max_position_notional) return { allowed: false, reason: "POSITION_LIMIT_EXCEEDED", notional, limits };
        if (stop_loss_price !== undefined && stop_loss_price !== null) {
            const estimatedLoss = Math.abs(Number(price) - Number(stop_loss_price)) * Math.abs(Number(quantity));
            if (!Number.isFinite(estimatedLoss)) return { allowed: false, reason: "INVALID_STOP_LOSS" };
            if (estimatedLoss > limits.max_loss_per_trade) return { allowed: false, reason: "MAX_LOSS_EXCEEDED", estimated_loss: estimatedLoss, limits };
        }
        if (!["BUY", "SELL", "HOLD"].includes(String(side).toUpperCase())) return { allowed: false, reason: "INVALID_SIDE" };
        return { allowed: true, reason: "RISK_CHECK_PASSED", notional, limits };
    }

    paperExecute({ request_id: requestId, symbol, side, quantity = 1, price, stop_loss_price, risk } = {}) {
        if (!requestId) throw new Error("IDENTITY_REQUIRED");
        if (!symbol) throw new Error("SYMBOL_REQUIRED");
        const normalizedSide = String(side || "").toUpperCase();
        if (normalizedSide === "HOLD") {
            return { status: "NO_ORDER", request_id: requestId, symbol, side: "HOLD", simulated: true };
        }
        const riskResult = this.riskCheck({ side: normalizedSide, price, quantity, stop_loss_price, risk });
        if (!riskResult.allowed) return { status: "REJECTED", request_id: requestId, symbol, side: normalizedSide, simulated: true, risk: riskResult };
        return {
            status: "FILLED_SIMULATED",
            request_id: requestId,
            symbol,
            side: normalizedSide,
            quantity: Number(quantity),
            fill_price: Number(price),
            notional: riskResult.notional,
            stop_loss_price: stop_loss_price ?? null,
            simulated: true,
            verification: { status: "VERIFIED", rule: "PAPER_FILL_CREATED_BY_LOCAL_ENGINE" }
        };
    }

    execute(input = {}) {
        switch (String(input.action || "").toUpperCase()) {
            case "TRADING_SIGNAL": return { success: true, signal: this.signal(input.candles || []) };
            case "TRADING_RISK_CHECK": return { success: true, risk: this.riskCheck(input) };
            case "TRADING_PAPER_ORDER": return { success: true, order: this.paperExecute(input) };
            default: throw new Error(`Unsupported trading action: ${input.action}`);
        }
    }
}

module.exports = TradingEngineV1;
