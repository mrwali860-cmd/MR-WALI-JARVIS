"use strict";

const ComponentContract = require("../../contracts/component-contract");

const UNSAFE_KEYS = new Set(["api_key", "access_token", "authorization", "password", "secret", "token"]);
const REQUIRED = ["request_id", "service_id", "task_id", "action", "outcome", "evidence"];

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

class AuditEvidenceV1 extends ComponentContract {
    constructor() {
        super({ id: "AUDIT_EVIDENCE", name: "JARVIS Audit Evidence V1", version: "1.0.0", status: "AVAILABLE" });
        this.records = new Map();
        this.identities = new Map();
    }

    _identity(input) {
        return [input.request_id, input.service_id, input.task_id, input.action].join("|");
    }

    _validate(input) {
        for (const key of REQUIRED) {
            if (input[key] === undefined || input[key] === null || input[key] === "") throw new Error(`${key} is required`);
        }
        if (!Array.isArray(input.evidence) || input.evidence.length === 0) throw new Error("evidence must be a non-empty array");
        for (const item of input.evidence) {
            if (!item || !item.type || !item.source || !item.reference) throw new Error("each evidence item requires type, source, and reference");
        }
    }

    _auditId(identity) {
        let hash = 2166136261;
        for (const char of identity) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
        return `AUDIT-${(hash >>> 0).toString(16).padStart(8, "0")}`;
    }

    record(input = {}) {
        this._validate(input);
        const identity = this._identity(input);
        const auditId = this._auditId(identity);
        const normalized = sanitize({
            audit_id: auditId,
            request_id: input.request_id,
            service_id: input.service_id,
            task_id: input.task_id,
            action: input.action,
            outcome: input.outcome,
            recorded_at: input.recorded_at || new Date().toISOString(),
            evidence: input.evidence,
            ...(input.reason !== undefined ? { reason: input.reason } : {}),
            ...(input.policy_decision !== undefined ? { policy_decision: input.policy_decision } : {}),
            ...(input.result !== undefined ? { result: input.result } : {}),
            ...(input.error !== undefined ? { error: input.error } : {}),
            ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
        });

        const existingIdentity = this.identities.get(input.request_id);
        if (existingIdentity && existingIdentity !== identity) throw new Error(`audit identity collision for request_id: ${input.request_id}`);
        this.identities.set(input.request_id, identity);

        const existing = this.records.get(auditId);
        if (existing) {
            if (JSON.stringify(existing.evidence) !== JSON.stringify(normalized.evidence) || existing.outcome !== normalized.outcome) {
                throw new Error(`audit record mutation rejected: ${auditId}`);
            }
            return { success: true, duplicate: true, audit_id: auditId, record: existing };
        }

        this.records.set(auditId, Object.freeze(normalized));
        return { success: true, duplicate: false, audit_id: auditId, record: normalized };
    }

    get(auditId) { return this.records.get(auditId) || null; }
    list() { return Array.from(this.records.values()).map(record => sanitize(record)); }
    toJSON() { return this.list(); }
    execute(input = {}) { return this.record(input); }
}

module.exports = AuditEvidenceV1;
