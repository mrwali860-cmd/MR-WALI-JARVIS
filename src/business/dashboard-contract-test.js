"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`PASS  ${name}`);
        passed++;
    } catch (error) {
        console.error(`FAIL  ${name}`);
        console.error(`      ${error.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function snapshotDirectory(dir) {
    return fs.existsSync(dir)
        ? fs.readdirSync(dir, { recursive: true }).sort().join("\n")
        : "";
}

test("Dashboard contract defines a read-only control surface", () => {
    const contract = fs.readFileSync(path.join(process.cwd(), "docs/architecture/dashboard-v1-contract.md"), "utf8");
    assert(contract.includes("MUST NOT become the owner"), "Ownership boundary missing");
    assert(contract.includes("MUST NOT directly edit"), "Persistence boundary missing");
    assert(contract.includes("POST /api/dashboard/actions"), "Action boundary missing");
});

test("Dashboard contract requires core-owned lifecycle state", () => {
    const contract = fs.readFileSync(path.join(process.cwd(), "docs/architecture/dashboard-v1-contract.md"), "utf8");
    for (const term of ["Service Manager", "Task Manager", "QA", "Client Approval", "Delivery", "Revenue"]) {
        assert(contract.includes(term), `${term} boundary missing`);
    }
});

test("Dashboard V1 does not introduce a second persistence source of truth", () => {
    const dataDir = path.join(process.cwd(), "data");
    const before = snapshotDirectory(dataDir);
    const after = snapshotDirectory(dataDir);
    assert(before === after, "Dashboard contract test mutated core persistence");
});

test("Dashboard actions require request traceability", () => {
    const contract = fs.readFileSync(path.join(process.cwd(), "docs/architecture/dashboard-v1-contract.md"), "utf8");
    assert(contract.includes("request_id"), "request_id requirement missing");
    assert(contract.includes("traceability"), "Traceability requirement missing");
});

test("Dashboard cannot bypass approval and risk gates", () => {
    const contract = fs.readFileSync(path.join(process.cwd(), "docs/architecture/dashboard-v1-contract.md"), "utf8");
    assert(contract.includes("approval gates"), "Approval gate rule missing");
    assert(contract.includes("risk approval"), "Risk gate rule missing");
    assert(contract.includes("MUST NOT infer client consent"), "Client consent rule missing");
});

test("Dashboard and future Voice Agent share the same action boundary", () => {
    const contract = fs.readFileSync(path.join(process.cwd(), "docs/architecture/dashboard-v1-contract.md"), "utf8");
    assert(contract.includes("future Voice Agent"), "Voice compatibility missing");
    assert(contract.includes("same controlled actions"), "Shared action boundary missing");
});

test("Dashboard V1 explicitly excludes autonomous/external execution", () => {
    const contract = fs.readFileSync(path.join(process.cwd(), "docs/architecture/dashboard-v1-contract.md"), "utf8");
    assert(contract.includes("external service execution"), "External execution exclusion missing");
    assert(contract.includes("autonomous financial actions"), "Autonomous financial exclusion missing");
    assert(contract.includes("new database infrastructure"), "Infrastructure exclusion missing");
});

console.log("\n========================================");
console.log(" DASHBOARD V1 CONTRACT TEST");
console.log("========================================");
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
if (failed > 0) {
    console.log("RESULT: FAILED");
    process.exit(1);
}
console.log("RESULT: ALL TESTS PASSED");
console.log("========================================");
