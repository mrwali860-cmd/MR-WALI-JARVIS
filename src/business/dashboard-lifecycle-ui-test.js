"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const html = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf8");

function test(name, fn) {
    try { fn(); console.log(`PASS  ${name}`); }
    catch (error) { console.error(`FAIL  ${name}`); console.error(`      ${error.message}`); process.exitCode = 1; }
}

test("Dashboard UI reads QA, approval, delivery and revenue state", () => {
    for (const endpoint of [
        "/api/dashboard/qa",
        "/api/dashboard/client-approval",
        "/api/dashboard/delivery",
        "/api/dashboard/revenue"
    ]) assert.ok(html.includes(`fetch('${endpoint}')`), `Missing read API: ${endpoint}`);
});

test("Dashboard UI exposes the QA to Revenue lifecycle", () => {
    for (const section of ["QA", "Client Approval", "Delivery", "Revenue"]) {
        assert.ok(html.includes(`<h2>${section}</h2>`), `Missing lifecycle section: ${section}`);
    }
});

test("Lifecycle UI remains read-only", () => {
    assert.ok(html.includes("READ-ONLY CONTROL SURFACE"));
    assert.ok(!html.includes("fetch('/api/dashboard/actions'"));
    assert.ok(!html.includes("localStorage"));
    assert.ok(!html.includes("sessionStorage"));
});

test("Lifecycle UI escapes core values", () => {
    assert.ok(html.includes("function esc(value)"));
    assert.ok(html.includes("esc(qa.component.status)"));
    assert.ok(html.includes("esc(approval.component.status)"));
    assert.ok(html.includes("esc(delivery.component.status)"));
    assert.ok(html.includes("esc(revenue.component.status)"));
});

console.log("Dashboard lifecycle UI contract: " + (process.exitCode ? "FAILED" : "PASS"));
