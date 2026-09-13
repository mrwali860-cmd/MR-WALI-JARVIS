"use strict";

const ExternalExecutionBoundary = require("./external-execution-boundary");
const { Verify } = require("./verify-v1");
const AuditEvidenceV1 = require("./audit-evidence-v1");

/**
 * Composition-only boundary for the existing execution, verification, and
 * evidence layers. It does not replace or modify any of those owners.
 */
class ExecutionVerificationAuditV1 {
    constructor({ executionBoundary, verifier, audit } = {}) {
        this.executionBoundary = executionBoundary || new ExternalExecutionBoundary();
        this.verifier = verifier || new Verify();
        this.audit = audit || new AuditEvidenceV1();
    }

    execute(input = {}) {
        const {
            request_id: requestId,
            service_id: serviceId,
            task_id: taskId,
            action,
            provider,
            approval_context: approvalContext,
            input: executionInput,
            verification_contract: verificationContract
        } = input;

        const execution = this.executionBoundary.execute({
            request_id: requestId,
            service_id: serviceId,
            task_id: taskId,
            action,
            provider,
            approval_context: approvalContext,
            input: executionInput
        });

        const verificationInput = {
            request_id: requestId,
            service_id: serviceId,
            task_id: taskId,
            action: String(action || "").trim().toUpperCase(),
            contract: verificationContract,
            execution_result: {
                ...execution,
                ...(execution && execution.result && typeof execution.result === "object" ? execution.result : {})
            }
        };

        let verification;
        try {
            verification = this.verifier.verify(verificationInput);
        } catch (error) {
            verification = {
                request_id: requestId,
                service_id: serviceId,
                task_id: taskId,
                action: verificationInput.action,
                status: "FAIL",
                reason_code: "VERIFIER_ERROR"
            };
        }

        if (verification.status !== "PASS") {
            return { execution, verification, audit: null };
        }

        const audit = this.audit.record({
            request_id: requestId,
            service_id: serviceId,
            task_id: taskId,
            action: verificationInput.action,
            outcome: "COMPLETED",
            evidence: [
                { type: "EXECUTION_RESULT", source: "ExternalExecutionBoundary", reference: requestId },
                { type: "VERIFICATION_RESULT", source: "VerifyV1", reference: verification.reason_code }
            ],
            result: execution.result
        });

        return { execution, verification, audit };
    }
}

module.exports = ExecutionVerificationAuditV1;
