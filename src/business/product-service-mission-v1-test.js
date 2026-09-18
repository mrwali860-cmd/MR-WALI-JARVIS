"use strict";

const assert = require("assert");
const {
    MISSION_TYPES,
    REQUIRED_OUTPUTS,
    createProductServiceMission
} = require("./product-service-mission-v1");

function test(name, fn) {
    try { fn(); console.log(`PASS: ${name}`); }
    catch (error) { console.error(`FAILED: ${name}`); console.error(error.message); process.exitCode = 1; }
}

test("Digital product mission has a production envelope", () => {
    const mission = createProductServiceMission({
        mission_type: MISSION_TYPES.DIGITAL_PRODUCT,
        goal: "Create a sellable AI product",
        deliverable: "Validated product package",
        target_customer: "Small businesses",
        success_criteria: ["usable", "tested", "delivery-ready"]
    });
    assert.strictEqual(mission.mission_type, "DIGITAL_PRODUCT");
    assert.strictEqual(mission.status, "READY");
    assert.deepStrictEqual(mission.required_outputs, REQUIRED_OUTPUTS);
});

test("Digital service mission is supported", () => {
    const mission = createProductServiceMission({
        mission_type: MISSION_TYPES.DIGITAL_SERVICE,
        goal: "Prepare an AI automation service",
        deliverable: "Client-ready service delivery",
    });
    assert.strictEqual(mission.mission_type, "DIGITAL_SERVICE");
    assert.strictEqual(mission.external_execution_requires_approval, true);
});

test("Invalid mission input is rejected", () => {
    assert.throws(
        () => createProductServiceMission({ mission_type: "UNKNOWN", goal: "x", deliverable: "y" }),
        /MISSION_TYPE_INVALID/
    );
    assert.throws(
        () => createProductServiceMission({ mission_type: "DIGITAL_PRODUCT", deliverable: "y" }),
        /MISSION_GOAL_REQUIRED/
    );
});

if (process.exitCode) process.exit(1);
