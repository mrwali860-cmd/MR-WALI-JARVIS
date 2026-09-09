"use strict";

const assert = require("assert");
const DecisionEngine = require("./decision-engine");

const engine = new DecisionEngine();

assert.deepEqual(engine.getInfo(), {
    id: "DECISION_ENGINE",
    name: "JARVIS Decision Engine",
    version: "1.0.0",
    status: "AVAILABLE"
});

const proceed = engine.execute({
    decision_id: "decision-1",
    goal: "Acquire a qualified real estate client",
    options: ["QUALIFY_LEAD", "SEND_OUTREACH"]
});
assert.equal(proceed.decision, "PROCEED");
assert.equal(proceed.selected_action, "QUALIFY_LEAD");
assert.equal(proceed.decision_id, "decision-1");
assert.equal(proceed.goal, "Acquire a qualified real estate client");
assert.ok(proceed.rationale);

const clarifyMissingGoal = engine.execute({
    decision_id: "decision-2",
    options: ["QUALIFY_LEAD"]
});
assert.equal(clarifyMissingGoal.decision, "CLARIFY");
assert.equal(clarifyMissingGoal.selected_action, null);

const clarifyMissingOptions = engine.execute({
    decision_id: "decision-3",
    goal: "Acquire a client",
    options: []
});
assert.equal(clarifyMissingOptions.decision, "CLARIFY");
assert.equal(clarifyMissingOptions.selected_action, null);

const filtered = engine.execute({
    decision_id: "decision-4",
    goal: "Acquire a client",
    options: ["", "   ", "SEND_OUTREACH"]
});
assert.equal(filtered.decision, "PROCEED");
assert.equal(filtered.selected_action, "SEND_OUTREACH");

assert.doesNotThrow(() => engine.execute({
    goal: "Plan next step",
    options: ["TASK_A"]
}));

console.log("PASS Decision Engine V1 contract tests");
