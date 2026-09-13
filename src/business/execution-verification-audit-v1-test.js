"use strict";

const assert = require("assert");
const ExternalExecutionBoundary = require("./external-execution-boundary");
const ProviderAdapter = require("./provider-adapter-v1");
const { Verify } = require("./verify-v1");
const AuditEvidenceV1 = require("./audit-evidence-v1");

function makeIntegration() {
    const calls = [];
    const adapter = new ProviderAdapter({
        provider: "TEST_PROVIDER",
        action: "SEND_MESSAGE",
        operation: "send_message",
        perform: ({ request_id, service_id, task_id, action, input }) => {
            calls.push({ request_id, service_id, task_id, action });
            return { message_id: `msg-${input.lead_id}` };
        }
    });

    const boundary = new ExternalExecutionBoundary({ adapters: { TEST_PROVIDER: adapter } });
    const verifier = new Verify();
    const audit = new AuditEvidenceV1();

    return { calls, boundary, verifier, audit };
}

function base(overrides = {}) {
    return {
        request_id: "REQ-INTEGRATION-001",
        service_id: "AI_APPOINTMENT_BOOKING_AUTOMATION",
        task_id: "LEAD_OUTREACH_001",
        action: "SEND_MESSAGE",
        provider: "TEST_PROVIDER",
        approval_context: { allowed: true, source: "RISK_APPROVAL" },
        input: { lead_id: "LEAD-001" },
        verification_contract: { required_fields: ["message_id"], success_field: "message_id" },
        ...overrides
    };
}

function run() {
    const { calls, boundary, verifier, audit } = makeIntegration();

    const input = base();
    const execution = boundary.execute(input);
    assert.strictEqual(execution.success, true);
    assert.strictEqual(execution.request_id, input.request_id);
    assert.strictEqual(execution.action, input.action);
    assert.strictEqual(calls.length, 1);

    const verification = verifier.verify({
        request_id: input.request_id,
        service_id: input.service_id,
        task_id: input.task_id,
        action: input.action,
        contract: input.verification_contract,
        execution_result: { ...execution, ...execution.result }
    });
    assert.strictEqual(verification.status, "PASS");

    const auditResult = audit.record({
        request_id: input.request_id,
        service_id: input.service_id,
        task_id: input.task_id,
        action: input.action,
        outcome: "COMPLETED",
        evidence: [
            { type: "EXECUTION_RESULT", source: "ExternalExecutionBoundary", reference: input.request_id },
            { type: "VERIFICATION_RESULT", source: "VerifyV1", reference: "VERIFIED" }
        ],
        result: execution.result
    });
    assert.strictEqual(auditResult.success, true);
    assert.strictEqual(auditResult.record.outcome, "COMPLETED");

    const deniedCalls = makeIntegration();
    assert.throws(() => deniedCalls.boundary.execute(base({ approval_context: { allowed: false } })), /AUTHORIZATION_REQUIRED/);
    assert.strictEqual(deniedCalls.calls.length, 0, "denied execution must not reach provider");

    const failedExecution = makeIntegration().boundary.execute(base({ input: { lead_id: "FAIL" } }));
    assert.strictEqual(failedExecution.success, true, "test provider succeeds for deterministic happy path");
    const verificationFailure = verifier.verify({
        ...base(),
        contract: { required_fields: ["missing_field"], success_field: "missing_field" },
        execution_result: failedExecution
    });
    assert.strictEqual(verificationFailure.status, "FAIL");

    const auditCountBefore = audit.list().length;
    assert.strictEqual(auditCountBefore, 1, "verification failure must not create a second success audit");

    const providerFailure = new ExternalExecutionBoundary({
        adapters: {
            TEST_PROVIDER: new ProviderAdapter({
                provider: "TEST_PROVIDER",
                action: "SEND_MESSAGE",
                operation: "send_message",
                perform: () => { throw new Error("provider failed"); }
            })
        }
    }).execute(input);
    assert.strictEqual(providerFailure.success, false);
    const providerVerification = verifier.verify({
        ...base(),
        execution_result: providerFailure
    });
    assert.strictEqual(providerVerification.status, "FAIL");

    const secretExecution = {
        ...execution,
        result: { ...execution.result, access_token: "SECRET", api_key: "SECRET" }
    };
    const safeVerification = verifier.verify({
        ...base(),
        execution_result: secretExecution
    });
    assert.ok(!JSON.stringify(safeVerification).includes("SECRET"));

    console.log("Execution → Verify → Audit Integration V1 Contract Tests: PASS");
}

run();
