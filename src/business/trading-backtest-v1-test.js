"use strict";

const assert = require("assert");
const TradingBacktestV1 = require("./trading-backtest-v1");

function candles(closes) {
    return closes.map((close,index) => ({
        timestamp: `2026-01-${String(index+1).padStart(2,"0")}`,
        open: close, high: close+1, low: close-1, close
    }));
}

function run() {
    // Controlled deterministic signal stream isolates backtest accounting:
    // HOLD through index 3, BUY at index 4, then SELL from index 7 onward.
    const engine = {
        signal: history => ({
            side: history.length <= 4 ? "HOLD" : history.length <= 7 ? "BUY" : "SELL"
        })
    };
    const backtest = new TradingBacktestV1({ tradingEngine: engine });

    assert.throws(() => backtest.run({candles:candles([10,11,12,13])}), /CANDLES_MINIMUM_5_REQUIRED/);

    const input = {
        candles:candles([10,10,10,10,12,14,16,8,6]),
        initial_equity:1000,
        quantity:1
    };
    const result = backtest.run(input);

    assert.strictEqual(result.status,"BACKTEST_COMPLETED");
    assert.strictEqual(result.simulated,true);
    assert.strictEqual(result.initial_equity,1000);
    assert.strictEqual(result.final_equity,998);
    assert.strictEqual(result.total_pnl,-2);
    assert.strictEqual(result.trade_count,2);
    assert.strictEqual(result.winning_trades,1);
    assert.strictEqual(result.losing_trades,1);
    assert.strictEqual(result.win_rate_pct,50);
    assert.strictEqual(result.max_drawdown,8);
    assert.strictEqual(result.trades[0].side,"BUY");
    assert.strictEqual(result.trades[0].entry_price,12);
    assert.strictEqual(result.trades[0].exit_price,8);
    assert.strictEqual(result.trades[0].pnl,-4);
    assert.strictEqual(result.trades[1].side,"SELL");
    assert.strictEqual(result.trades[1].entry_price,8);
    assert.strictEqual(result.trades[1].exit_price,6);
    assert.strictEqual(result.trades[1].pnl,2);
    assert.strictEqual(result.equity_curve[result.equity_curve.length-1].equity,998);

    assert.deepStrictEqual(backtest.run(input),result);
    assert.throws(() => backtest.run({candles:candles([1,2,3,4,5]),quantity:0}), /INVALID_QUANTITY/);

    console.log("Trading Backtest V1 contract tests: PASS");
}

run();
