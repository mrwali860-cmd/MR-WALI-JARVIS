"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const indexPath = path.join(process.cwd(), "index.html");
const html = fs.readFileSync(indexPath, "utf8");

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

test("Dashboard UI has the Control Center shell", () => {
    assert.ok(html.includes("MR WALI JARVIS"));
    assert.ok(html.includes("Business Operating System — Control Center"));
});

test("Dashboard UI consumes only the defined read APIs", () => {
    assert.ok(html.includes("fetch('/api/dashboard/status')"));
    assert.ok(html.includes("fetch('/api/dashboard/services')"));
    assert.ok(!html.includes("fetch('/api/dashboard/actions'"));
});

test("Dashboard UI exposes core-owned state sections", () => {
    for (const section of ["Services", "Task Status", "Blockers & Gates", "Service Status"]) {
        assert.ok(html.includes(`<h2>${section}</h2>`), `Missing UI section: ${section}`);
    }
});

test("Dashboard UI is explicitly read-only", () => {
    assert.ok(html.includes("READ-ONLY CONTROL SURFACE"));
    assert.ok(html.includes("Live core state"));
});

test("Dashboard UI does not introduce a second persistence source", () => {
    assert.ok(!html.includes("services.json"));
    assert.ok(!html.includes("tasks.json"));
    assert.ok(!html.includes("localStorage"));
    assert.ok(!html.includes("sessionStorage"));
});

test("Dashboard UI escapes core values before rendering", () => {
    assert.ok(html.includes("function esc(value)"));
    assert.ok(html.includes("esc(service.service_id)"));
    assert.ok(html.includes("esc(item.task_id)"));
});

test("Dashboard UI has responsive/mobile layout support", () => {
    assert.ok(html.includes("@media (max-width:800px)"));
    assert.ok(html.includes("@media (max-width:480px)"));
});

console.log("\n========================================");
console.log(" DASHBOARD V1 UI CONTRACT TEST");
console.log("========================================");
console.log("RESULT: " + (process.exitCode ? "FAILED" : "ALL TESTS PASSED"));
console.log("========================================");
