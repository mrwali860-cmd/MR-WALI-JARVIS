"use strict";

const assert = require("assert");
const AuditEvidenceV1 = require("./audit-evidence-v1");

function run() {
    const audit = new AuditEvidenceV1();

    const base = {
        request_id: "REQ-AUDIT-001",
        service_id: "SERVICE_AUDIT_001",
        task_id: "TASK_AUDIT_001",
        action: "EXECUTE_TASK",
        outcome: "COMPLETED",
        evidence: [
            { type: "EXECUTION_TRACE", source: "ExecutionTrace", reference: "REQ-AUDIT-001" }
        ]
    };

    const first = audit.record(base);
    assert.strictEqual(first.success, true, "audit record should be created");
    assert.ok(first.audit_id, "audit_id required");
    assert.strictEqual(first.record.evidence.length, 1, "evidence required");

    const duplicate = audit.record(base);
    assert.strictEqual(duplicate.success, true, "duplicate identical record should be idempotent");
    assert.strictEqual(duplicate.duplicate, true, "duplicate flag required");
    assert.strictEqual(audit.list().length, 1, "duplicate must not create a second record");

    assert.throws(() => audit.record({ ...base, outcome: "FAILED" }), /identity|audit/i, "same identity with different outcome must be rejected");
    assert.throws(() => audit.record({ ...base, request_id: "REQ-AUDIT-002" }), /identity|audit/i, "identity mismatch must be rejected");

    const unsafe = audit.record({
        ...base,
        request_id: "REQ-AUDIT-003",
        task_id: "TASK_AUDIT_003",
        evidence: [{ type: "EXECUTION_TRACE", source: "ExecutionTrace", reference: "REQ-AUDIT-003", token: "secret-token" }],
        metadata: { api_key: "secret-key", result: "safe" }
    });
    const serialized = JSON.stringify(unsafe.record);
    assert.ok(!serialized.includes("secret-token"), "credential token must be sanitized");
    assert.ok(!serialized.includes("secret-key"), "credential api_key must be sanitized");
    assert.doesNotThrow(() => JSON.stringify(audit.toJSON()), "audit output must be JSON serializable");

    assert.throws(() => audit.record({
        request_id: "REQ-AUDIT-004",
        service_id: "SERVICE_AUDIT_004",
        task_id: "TASK_AUDIT_004",
        action: "EXECUTE_TASK",
        outcome: "COMPLETED",
        evidence: []
    }), /evidence/i, "empty evidence must be rejected");

    console.log("Audit Evidence V1 Contract Tests: PASS");
}

run();
