"use strict";

const assert = require("assert");
const { MISSION_TYPES, createProductServiceMission } = require("./product-service-mission-v1");

function test(name, fn) {
    try { fn(); console.log(`PASS: ${name}`); }
    catch (error) { console.error(`FAILED: ${name}`); console.error(error.message); process.exitCode = 1; }
}

test("Product/service mission contract covers a real sellable service mission", () => {
    const mission = createProductServiceMission({
        mission_id: "MISSION_REAL_SERVICE_TEST",
        mission_type: MISSION_TYPES.DIGITAL_SERVICE,
        goal: "Deliver AI lead response and appointment automation for a real estate client",
        deliverable: "Client-ready lead automation service",
        target_customer: "Dubai real estate agency",
        constraints: { budget: "low", approval_required_for_external_actions: true },
        success_criteria: [
            "lead response workflow is ready",
            "qualification is verified",
            "delivery evidence exists"
        ]
    });

    assert.strictEqual(mission.mission_id, "MISSION_REAL_SERVICE_TEST");
    assert.strictEqual(mission.mission_type, "DIGITAL_SERVICE");
    assert.strictEqual(mission.status, "READY");
    assert.ok(mission.success_criteria.length >= 3);
    assert.strictEqual(mission.external_execution_requires_approval, true);
});

test("Product mission contract covers a sellable digital product", () => {
    const mission = createProductServiceMission({
        mission_type: MISSION_TYPES.DIGITAL_PRODUCT,
        goal: "Build a sellable AI workflow product",
        deliverable: "Tested product package",
        target_customer: "Small businesses"
    });

    assert.strictEqual(mission.mission_type, "DIGITAL_PRODUCT");
    assert.strictEqual(mission.status, "READY");
    assert.ok(mission.required_outputs.includes("final_deliverable"));
});

if (process.exitCode) process.exit(1);
