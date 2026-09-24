"use strict";

const assert = require("assert");
const OutcomePlannerV1 = require("./outcome-planner-v1");

const planner = new OutcomePlannerV1();

const goal = {
    goal_id: "GOAL_REQ_001",
    goal: "Close 15 Dubai real-estate clients today",
    target: { metric: "clients_closed", value: 15 },
    progress: { current: 3 }
};

const plan = planner.plan({
    goal,
    stages: [
        { action: "DISCOVER_PROSPECTS", purpose: "Build a verified prospect pool." },
        { action: "QUALIFY_PROSPECTS", purpose: "Prioritize prospects against the offer." },
        { action: "PREPARE_OUTREACH", purpose: "Create personalized outreach drafts." },
        { action: "REQUEST_APPROVAL", purpose: "Require human approval before external send." },
        { action: "EXECUTE_APPROVED_OUTREACH", purpose: "Send only approved outreach." },
        { action: "MEASURE_RESPONSES", purpose: "Record replies, meetings and closes." },
        { action: "REPLAN", purpose: "Adjust the next actions from measured results." }
    ]
});

assert.strictEqual(plan.goal_id, "GOAL_REQ_001");
assert.strictEqual(plan.baseline.remaining, 12);
assert.strictEqual(plan.steps.length, 7);
assert.strictEqual(plan.steps[3].approval_required, true);
assert.strictEqual(plan.execution_policy.human_approval_required, true);
assert.strictEqual(plan.execution_policy.no_guaranteed_outcomes, true);

assert.throws(() => planner.plan({ goal, stages: [] }), /PLAN_STAGES_REQUIRED/);
assert.throws(() => planner.plan({ goal: { target: {} }, stages: [{ action: "X" }] }), /PLAN_GOAL_ID_REQUIRED/);
assert.throws(() => planner.plan({ goal, stages: [{ purpose: "missing action" }] }), /PLAN_ACTION_REQUIRED/);

console.log("OUTCOME PLANNER V1 CONTRACT TEST: PASS");
