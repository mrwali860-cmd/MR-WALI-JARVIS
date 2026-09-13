"use strict";

const assert = require("assert");
const ExternalExecutionBoundary = require("./external-execution-boundary");
const ProviderAdapter = require("./provider-adapter-v1");
const { Verify } = require("./verify-v1");
const AuditEvidenceV1 = require("./audit-evidence-v1");
const ExecutionVerificationAuditV1 = require("./execution-verification-audit-v1");

function makeIntegration(perform = ({ input }) => ({ message_id: `msg-${input.lead_id}` })) {
    const calls = [];
    const adapter = new ProviderAdapter({ provider: "TEST_PROVIDER", action: "SEND_MESSAGE", operation: "send_message", perform: envelope => { calls.push(envelope); return perform(envelope); } });
    const boundary = new ExternalExecutionBoundary({ adapters: { TEST_PROVIDER: adapter } });
    const verifier = new Verify();
    const audit = new AuditEvidenceV1();
    return { calls, audit, integration: new ExecutionVerificationAuditV1({ executionBoundary: boundary, verifier, audit }) };
}

function base(overrides = {}) {
    return { request_id: "REQ-INTEGRATION-001", service_id: "AI_APPOINTMENT_BOOKING_AUTOMATION", task_id: "LEAD_OUTREACH_001", action: "SEND_MESSAGE", provider: "TEST_PROVIDER", approval_context: { allowed: true, source: "RISK_APPROVAL" }, input: { lead_id: "LEAD-001" }, verification_contract: { required_fields: ["message_id"], success_field: "message_id" }, ...overrides };
}

function run() {
    const happy = makeIntegration();
    const result = happy.integration.execute(base());
    assert.strictEqual(result.execution.success, true);
    assert.strictEqual(result.verification.status, "PASS");
    assert.strictEqual(result.audit.success, true);
    assert.strictEqual(result.audit.record.outcome, "COMPLETED");
    assert.strictEqual(happy.calls.length, 1);
    assert.deepStrictEqual(happy.calls[0], { request_id: "REQ-INTEGRATION-001", service_id: "AI_APPOINTMENT_BOOKING_AUTOMATION", task_id: "LEAD_OUTREACH_001", action: "SEND_MESSAGE", input: { lead_id: "LEAD-001" }, provider: "TEST_PROVIDER", operation: "send_message" });

    const denied = makeIntegration();
    assert.throws(() => denied.integration.execute(base({ approval_context: { allowed: false } })), /AUTHORIZATION_REQUIRED/);
    assert.strictEqual(denied.calls.length, 0);
    assert.strictEqual(denied.audit.list().length, 0);

    const verifyFail = makeIntegration();
    const failedVerification = verifyFail.integration.execute(base({ verification_contract: { required_fields: ["missing_field"], success_field: "missing_field" } }));
    assert.strictEqual(failedVerification.execution.success, true);
    assert.strictEqual(failedVerification.verification.status, "FAIL");
    assert.strictEqual(failedVerification.audit, null);
    assert.strictEqual(verifyFail.audit.list().length, 0);

    const providerFail = makeIntegration(() => { throw new Error("provider failed"); });
    const failedExecution = providerFail.integration.execute(base());
    assert.strictEqual(failedExecution.execution.success, false);
    assert.strictEqual(failedExecution.verification.status, "FAIL");
    assert.strictEqual(failedExecution.audit, null);

    const secret = makeIntegration(() => ({ message_id: "msg-safe", access_token: "SECRET", api_key: "SECRET" }));
    const secretResult = secret.integration.execute(base());
    const verificationAndAudit = JSON.stringify({ verification: secretResult.verification, audit: secretResult.audit });
    assert.ok(!verificationAndAudit.includes("SECRET"));
    assert.strictEqual(secretResult.audit.record.result.access_token, undefined);
    assert.strictEqual(secretResult.audit.record.result.api_key, undefined);

    const duplicate = happy.integration.execute(base());
    assert.strictEqual(duplicate.audit.success, true);
    assert.strictEqual(duplicate.audit.duplicate, true);
    assert.strictEqual(happy.audit.list().length, 1);

    console.log("Execution → Verify → Audit Integration V1 Contract Tests: PASS");
}
run();
