"use strict";

const ComponentContract = require("../../contracts/component-contract");

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED", "BLOCKED"]);
const STATUSES = new Set(["STARTED", "RUNNING", "WAITING_FOR_APPROVAL", "COMPLETED", "FAILED", "BLOCKED"]);
const UNSAFE_KEYS = new Set(["api_key", "access_token", "authorization", "password", "secret", "token"]);

function sanitize(value) {
    if (Array.isArray(value)) return value.map(sanitize);
    if (!value || typeof value !== "object") return value;
    const output = {};
    for (const [key, item] of Object.entries(value)) {
        if (UNSAFE_KEYS.has(key.toLowerCase())) continue;
        output[key] = sanitize(item);
    }
    return output;
}

class ExecutionTrace extends ComponentContract {
    constructor(input = {}) {
        super({ id: "EXECUTION_TRACE", name: "JARVIS Execution Trace", version: "1.0.0", status: "AVAILABLE" });
        for (const key of ["request_id", "service_id", "task_id", "action"]) {
            if (!input[key]) throw new Error(`${key} is required`);
        }
        const registry = input.registry;
        if (registry?.has(input.request_id)) {
            const existing = registry.get(input.request_id);
            if (existing.service_id !== input.service_id || existing.task_id !== input.task_id || existing.action !== input.action) {
                throw new Error(`request_id already bound to a different execution: ${input.request_id}`);
            }
        } else if (registry) {
            registry.set(input.request_id, {
                service_id: input.service_id,
                task_id: input.task_id,
                action: input.action
            });
        }

        this.request_id = input.request_id;
        this.service_id = input.service_id;
        this.task_id = input.task_id;
        this.action = input.action;
        this.started_at = new Date().toISOString();
        this.ended_at = null;
        this.status = "STARTED";
        this.events = [{ type: "EXECUTION_STARTED", timestamp: this.started_at, status: "STARTED" }];
    }

    record(status, metadata = {}) {
        if (!STATUSES.has(status)) throw new Error(`Invalid trace status: ${status}`);
        if (this.ended_at) throw new Error("Execution trace is already terminal");
        const timestamp = new Date().toISOString();
        const event = { type: `EXECUTION_${status}`, timestamp, status, ...sanitize(metadata) };
        this.events.push(event);
        this.status = status;
        if (TERMINAL_STATUSES.has(status)) this.ended_at = timestamp;
        return event;
    }

    getSummary() {
        return {
            request_id: this.request_id,
            service_id: this.service_id,
            task_id: this.task_id,
            action: this.action,
            status: this.status
        };
    }

    toJSON() {
        return sanitize({
            request_id: this.request_id,
            service_id: this.service_id,
            task_id: this.task_id,
            action: this.action,
            status: this.status,
            started_at: this.started_at,
            ended_at: this.ended_at,
            events: this.events
        });
    }

    execute(input = {}) {
        return this.record(input.status, input.metadata || {});
    }
}

module.exports = ExecutionTrace;
