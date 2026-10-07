"use strict";

const assert = require("assert");
const TradingEngineV1 = require("./trading-engine-v1");

const engine = new TradingEngineV1();

const candles = [
    { open: 100, high: 102, low: 99, close: 100 },
    { open: 100, high: 103, low: 99, close: 101 },
    { open: 101, high: 104, low: 100, close: 102 },
    { open: 102, high: 105, low: 101, close: 104 }
];

(function testSignalIsDeterministic() {
    const result = engine.execute({ action: "TRADING_SIGNAL", candles });
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.signal.side, "BUY");
    assert.strictEqual(result.signal.strategy, "MA_CROSSOVER_BASELINE");
    assert.ok(Number.isFinite(result.signal.indicators.fast_ma));
})();

(function testRiskRejectsOversizedPosition() {
    const result = engine.execute({
        action: "TRADING_RISK_CHECK",
        side: "BUY",
        price: 2000,
        quantity: 1
    });
    assert.strictEqual(result.risk.allowed, false);
    assert.strictEqual(result.risk.reason, "POSITION_LIMIT_EXCEEDED");
})();

(function testRiskRejectsExcessLoss() {
    const result = engine.execute({
        action: "TRADING_RISK_CHECK",
        side: "BUY",
        price: 100,
        quantity: 1,
        stop_loss_price: 50
    });
    assert.strictEqual(result.risk.allowed, false);
    assert.strictEqual(result.risk.reason, "MAX_LOSS_EXCEEDED");
})();

(function testPaperOrderCreatesVerifiableSimulation() {
    const result = engine.execute({
        action: "TRADING_PAPER_ORDER",
        request_id: "TRADING-REQ-001",
        symbol: "TEST",
        side: "BUY",
        quantity: 2,
        price: 100,
        stop_loss_price: 95
    });
    assert.strictEqual(result.order.status, "FILLED_SIMULATED");
    assert.strictEqual(result.order.simulated, true);
    assert.strictEqual(result.order.verification.status, "VERIFIED");
})();

(function testHoldCreatesNoOrder() {
    const result = engine.execute({
        action: "TRADING_PAPER_ORDER",
        request_id: "TRADING-REQ-002",
        symbol: "TEST",
        side: "HOLD",
        price: 100
    });
    assert.strictEqual(result.order.status, "NO_ORDER");
})();

console.log("Trading Engine V1 tests: PASS");
