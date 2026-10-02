"use strict";

const assert = require("assert");
const TradingEngineV1 = require("./trading-engine-v1");
const TradingBacktestV1 = require("./trading-backtest-v1");

function candles(closes) {
    return closes.map((close,index) => ({
        timestamp: `2026-01-${String(index+1).padStart(2,"0")}`,
        open: close, high: close+1, low: close-1, close
    }));
}

function run() {
    const engine = new TradingEngineV1();
    const backtest = new TradingBacktestV1({ tradingEngine: engine });

    assert.throws(() => backtest.run({candles:candles([10,11,12,13])}), /CANDLES_MINIMUM_5_REQUIRED/);

    const result = backtest.run({
        candles:candles([10,10,10,10,12,14,16,8,6]),
        initial_equity:1000,
        quantity:1
    });

    assert.strictEqual(result.status,"BACKTEST_COMPLETED");
    assert.strictEqual(result.simulated,true);
    assert.strictEqual(result.initial_equity,1000);
    assert.strictEqual(result.final_equity,994);
    assert.strictEqual(result.total_pnl,-6);
    assert.strictEqual(result.trade_count,2);
    assert.strictEqual(result.winning_trades,0);
    assert.strictEqual(result.losing_trades,1);
    assert.strictEqual(result.win_rate_pct,0);
    assert.strictEqual(result.max_drawdown,6);
    assert.strictEqual(result.trades[0].side,"BUY");
    assert.strictEqual(result.trades[0].entry_price,12);
    assert.strictEqual(result.trades[0].exit_price,6);
    assert.strictEqual(result.trades[1].side,"SELL");
    assert.strictEqual(result.trades[1].entry_price,6);
    assert.strictEqual(result.trades[1].exit_price,6);

    const again = backtest.run({candles:candles([10,10,10,10,12,14,16,8,6]),initial_equity:1000,quantity:1});
    assert.deepStrictEqual(again,result);

    assert.throws(() => backtest.run({candles:candles([1,2,3,4,5]),quantity:0}), /INVALID_QUANTITY/);

    console.log("Trading Backtest V1 contract tests: PASS");
}

run();
