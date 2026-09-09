"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const contract = fs.readFileSync(
    path.join(process.cwd(), "docs/architecture/dashboard-v1-contract.md"),
    "utf8"
);

function test(name, fn) {
    try {
        fn();
        console.log(`PASS  ${name}`);
    } catch (error) {
        console.error(`FAIL  ${name}`);
        console.error(`      ${error.message}`);
        process.exitCode = 1;
    }
}

test("Dashboard action boundary is core-owned", () => {
    assert.ok(contract.includes("POST /api/dashboard/actions"));
    assert.ok(contract.includes("actions already owned by the core contracts"));
    assert.ok(contract.includes("MUST NOT invent alternate lifecycle transitions"));
});

test("Dashboard action requests require traceable identity", () => {
    assert.ok(contract.includes("action"));
    assert.ok(contract.includes("target entity"));
    assert.ok(contract.includes("request_id"));
    assert.ok(contract.includes("optional reason/context"));
    assert.ok(contract.includes("Every mutation request MUST carry a request identifier"));
});

test("Dashboard actions cannot bypass safety gates", () => {
    assert.ok(contract.includes("MUST NOT bypass QA"));
    assert.ok(contract.includes("client approval"));
    assert.ok(contract.includes("delivery eligibility"));
    assert.ok(contract.includes("risk approval gates"));
    assert.ok(contract.includes("core module remains responsible for validating whether the action is legal"));
});

test("Dashboard action boundary is compatible with future voice control", () => {
    assert.ok(contract.includes("future Voice Agent can call the same controlled actions"));
    assert.ok(contract.includes("Neither interface becomes the source of truth"));
});

test("Dashboard actions do not create a second persistence source", () => {
    assert.ok(contract.includes("MUST NOT directly edit `services.json`, `tasks.json`"));
    assert.ok(contract.includes("no new persistence source of truth is introduced"));
});

console.log("Dashboard action boundary contract: " + (process.exitCode ? "FAILED" : "PASS"));
