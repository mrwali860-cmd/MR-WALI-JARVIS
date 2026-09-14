"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const architecture = fs.readFileSync(path.join(root, "docs/architecture/operator-console-v4-real-tasks.md"), "utf8");
const orchestrator = fs.readFileSync(path.join(root, "src/business/orchestrator.js"), "utf8");
const dashboardBoundary = fs.readFileSync(path.join(root, "src/business/dashboard-actions.js"), "utf8");
const server = fs.readFileSync(path.join(root, "server.js"), "utf8");

function test(name, fn) {
  try { fn(); console.log(`PASS: ${name}`); }
  catch (error) { console.error(`FAILED: ${name}`); console.error(error.message); process.exitCode = 1; }
}

test("V4 architecture locks chat to Orchestrator execution", () => {
  assert.ok(architecture.includes("Browser chat → POST /ask → V4 task-command adapter → Orchestrator.executeTask()"));
  assert.ok(architecture.includes("No approval bypass."));
});

test("Existing Orchestrator is the execution authority", () => {
  assert.ok(orchestrator.includes("async executeTask(input = {})"));
  assert.ok(orchestrator.includes("this.taskManager.updateTaskStatus"));
  assert.ok(orchestrator.includes("this.riskPolicy.evaluate"));
});

test("Existing Dashboard Action Boundary remains distinct", () => {
  assert.ok(dashboardBoundary.includes("class DashboardActionBoundary"));
  assert.ok(dashboardBoundary.includes("this.orchestrator.executeTask(request)"));
});

test("Server retains the existing /ask boundary", () => {
  assert.ok(server.includes('app.post("/ask"'));
});

test("V4 is not allowed to create a second execution engine", () => {
  assert.ok(!server.includes("child_process"));
  assert.ok(!server.includes("execFileSync"));
});

console.log("OPERATOR CONSOLE V4 REAL TASK CONTRACT TEST: " + (process.exitCode ? "FAILED" : "PASS"));
