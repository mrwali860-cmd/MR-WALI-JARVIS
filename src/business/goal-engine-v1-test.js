"use strict";

const assert = require("assert");
const { GoalEngineV1, GOAL_STATUSES } = require("./goal-engine-v1");

const engine = new GoalEngineV1();

const goal = engine.create({
    request_id: "GOAL_TEST_001",
    goal: "Close 15 Dubai real-estate clients today",
    target: { metric: "CLIENTS_CLOSED", value: 15 },
    context: {
        market: "REAL_ESTATE",
        geography: "Dubai",
        offer: "AI Lead Response & Qualification"
    },
    constraints: {
        human_approval_required: true,
        no_guaranteed_outcomes: true
    }
});

assert.strictEqual(goal.goal_id, "GOAL_GOAL_TEST_001");
assert.strictEqual(goal.status, GOAL_STATUSES.ACTIVE);
assert.strictEqual(goal.target.metric, "CLIENTS_CLOSED");
assert.strictEqual(goal.target.value, 15);
assert.strictEqual(goal.progress.current, 0);
assert.strictEqual(goal.progress.remaining, 15);
assert.strictEqual(goal.progress.percent, 0);

engine.recordProgress("GOAL_GOAL_TEST_001", {
    metric: "CLIENTS_CLOSED",
    value: 3,
    evidence_id: "EVIDENCE_001"
});

let state = engine.get("GOAL_GOAL_TEST_001");
assert.strictEqual(state.progress.current, 3);
assert.strictEqual(state.progress.remaining, 12);
assert.strictEqual(state.progress.percent, 20);
assert.strictEqual(state.status, GOAL_STATUSES.ACTIVE);

engine.recordProgress("GOAL_GOAL_TEST_001", {
    metric: "CLIENTS_CLOSED",
    value: 12,
    evidence_id: "EVIDENCE_002"
});

state = engine.get("GOAL_GOAL_TEST_001");
assert.strictEqual(state.progress.current, 15);
assert.strictEqual(state.progress.remaining, 0);
assert.strictEqual(state.progress.percent, 100);
assert.strictEqual(state.status, GOAL_STATUSES.ACHIEVED);
assert.strictEqual(state.evidence.length, 2);

assert.throws(
    () => engine.create({
        request_id: "GOAL_TEST_002",
        goal: "Do something",
        target: { metric: "CLIENTS_CLOSED", value: 0 }
    }),
    /GOAL_TARGET_INVALID/
);

assert.throws(
    () => engine.recordProgress("GOAL_UNKNOWN", {
        metric: "CLIENTS_CLOSED",
        value: 1
    }),
    /GOAL_NOT_FOUND/
);

assert.throws(
    () => engine.recordProgress("GOAL_GOAL_TEST_001", {
        metric: "REVENUE",
        value: 100
    }),
    /GOAL_METRIC_MISMATCH/
);

console.log("OUTCOME GOAL ENGINE V1 CONTRACT TEST: PASS");
