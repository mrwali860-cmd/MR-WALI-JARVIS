"use strict";

const assert = require("assert");
const ExecutionTrace = require("./execution-trace");

function test(name, fn) {
    try {
        fn();
        console.log(`PASS: ${name}`);
    } catch (error) {
        console.error(`FAILED: ${name}`);
        console.error(error.message);
        process.exitCode = 1;
    }
}

test("ExecutionTrace exposes required identity", () => {
    const trace = new ExecutionTrace({
        request_id: "REQ-TRACE-1",
        service_id: "SERVICE-1",
        task_id: "TASK-1",
        action: "LEAD_INTAKE"
    });
    assert.deepStrictEqual(trace.getSummary(), {
        request_id: "REQ-TRACE-1",
        service_id: "SERVICE-1",
        task_id: "TASK-1",
        action: "LEAD_INTAKE",
        status: "STARTED"
    });
});

test("ExecutionTrace records ordered events and terminal completion", () => {
    const trace = new ExecutionTrace({ request_id: "REQ-TRACE-2", service_id: "S", task_id: "T", action: "A" });
    trace.record("RUNNING");
    trace.record("COMPLETED", { result: { ok: true } });
    const output = trace.toJSON();
    assert.strictEqual(output.status, "COMPLETED");
    assert.ok(output.started_at);
    assert.ok(output.ended_at);
    assert.deepStrictEqual(output.events.map(event => event.status), ["STARTED", "RUNNING", "COMPLETED"]);
    assert.deepStrictEqual(output.events[2].result, { ok: true });
});

test("ExecutionTrace supports blocked and approval-waiting terminal outcomes", () => {
    const blocked = new ExecutionTrace({ request_id: "REQ-B", service_id: "S", task_id: "T", action: "A" });
    blocked.record("BLOCKED", { reason: "DEPENDENCIES_NOT_COMPLETE" });
    assert.strictEqual(blocked.toJSON().ended_at !== null, true);

    const waiting = new ExecutionTrace({ request_id: "REQ-W", service_id: "S", task_id: "T", action: "A" });
    waiting.record("WAITING_FOR_APPROVAL", { reason: "APPROVAL_REQUIRED" });
    assert.strictEqual(waiting.toJSON().ended_at, null);
});

test("ExecutionTrace rejects request-id reuse with different execution identity", () => {
    assert.throws(() => new ExecutionTrace({
        request_id: "REQ-SAME",
        service_id: "S",
        task_id: "T",
        action: "A",
        registry: new Map([["REQ-SAME", { service_id: "OTHER", task_id: "T", action: "A" }]])
    }), /request_id already bound/);
});

test("ExecutionTrace strips unsafe credential fields", () => {
    const trace = new ExecutionTrace({ request_id: "REQ-SAFE", service_id: "S", task_id: "T", action: "A" });
    trace.record("COMPLETED", { result: { ok: true, token: "secret", nested: { password: "secret" } } });
    const text = JSON.stringify(trace.toJSON());
    assert.ok(!text.includes("secret"));
    assert.ok(!text.includes("token"));
    assert.ok(!text.includes("password"));
});

if (process.exitCode) process.exit(1);
