"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * JARVIS Quality Assurance V1
 *
 * QA evaluates completed execution results against deterministic acceptance
 * criteria. It never executes external actions or grants downstream approval.
 */
class QualityAssurance extends ComponentContract {
    constructor(config = {}) {
        super({
            id: "QA",
            name: "QUALITY_ASSURANCE",
            version: "1.0.0",
            status: "AVAILABLE",
            ...config
        });
    }

    validateInput(input = {}) {
        const required = [
            "service_id",
            "task_id",
            "request_id",
            "expected_output",
            "actual_output",
            "acceptance_criteria",
            "execution_status"
        ];
        const missing = required.filter((key) => input[key] === undefined || input[key] === null);
        if (missing.length) {
            throw new Error(`QA: missing required fields: ${missing.join(", ")}`);
        }
    }

    evaluate(input = {}) {
        this.validateInput(input);

        const checks = [];
        const addCheck = (name, passed, detail) => checks.push({ name, passed, detail });

        const executionCompleted = input.execution_status === "COMPLETED";
        addCheck("execution_status", executionCompleted, `Expected COMPLETED, received ${input.execution_status}`);

        const hasActualOutput = input.actual_output !== "";
        addCheck("actual_output_present", hasActualOutput, "Actual output must be present");

        const criteria = Array.isArray(input.acceptance_criteria)
            ? input.acceptance_criteria
            : null;
        if (!criteria) {
            return this.result(input, "REVIEW", "Acceptance criteria must be a deterministic array", checks);
        }

        let ambiguous = false;
        for (const criterion of criteria) {
            if (!criterion || typeof criterion !== "object" || typeof criterion.name !== "string") {
                ambiguous = true;
                continue;
            }
            const passed = criterion.required === false ? true : criterion.passed === true;
            addCheck(`criterion:${criterion.name}`, passed, passed ? "Satisfied" : "Not satisfied");
        }

        if (!executionCompleted || !hasActualOutput || checks.some((c) => c.passed === false)) {
            return this.result(input, "FAIL", "One or more QA checks failed", checks, {
                retry_count: input.retry_count || 0,
                max_retries: input.max_retries === undefined ? 0 : input.max_retries,
                rework_required: true
            });
        }

        if (ambiguous) {
            return this.result(input, "REVIEW", "Automated QA cannot reliably evaluate all criteria", checks);
        }

        return this.result(input, "PASS", "All deterministic QA checks passed", checks);
    }

    result(input, decision, reason, checks, extra = {}) {
        return {
            decision,
            service_id: input.service_id,
            task_id: input.task_id,
            request_id: input.request_id,
            reason,
            checks,
            ...extra
        };
    }

    execute(input = {}) {
        const action = String(input.action || "EVALUATE").trim().toUpperCase();
        if (action !== "EVALUATE") {
            throw new Error(`QA: unsupported action ${action}`);
        }
        return this.evaluate(input);
    }
}

module.exports = QualityAssurance;
