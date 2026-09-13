"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const contract = fs.readFileSync(
    path.join(process.cwd(), "docs/architecture/operator-console-v1-contract.md"),
    "utf8"
);
const html = fs.readFileSync(path.join(process.cwd(), "jarvis.html"), "utf8");

function test(name, fn) {
    try { fn(); console.log(`PASS  ${name}`); }
    catch (error) { console.error(`FAIL  ${name}`); console.error(`      ${error.message}`); process.exitCode = 1; }
}

test("Operator console has a separate contract from read-only dashboard", () => {
    assert.ok(contract.includes("distinct from the read-only Dashboard V1 surface"));
    assert.ok(contract.includes("existing Node/Express application"));
});

test("Console supports text and voice interaction", () => {
    assert.ok(contract.includes("both text input and browser voice input"));
    assert.ok(html.includes("SpeechRecognition"));
    assert.ok(html.includes("SpeechSynthesis"));
});

test("Console keeps execution behind the existing controlled boundary", () => {
    assert.ok(contract.includes("POST /api/dashboard/actions"));
    assert.ok(contract.includes("MUST NOT directly mutate business persistence"));
    assert.ok(html.includes("/api/dashboard/actions"));
});

test("Console keeps the supplied artwork as the base visual", () => {
    assert.ok(contract.includes("core artwork unchanged"));
    assert.ok(html.includes("/assets/jarvis-core.jpg"));
});

console.log("Operator Console V1 contract: " + (process.exitCode ? "FAILED" : "PASS"));
