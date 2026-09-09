"use strict";

const assert = require("assert");
const QualityAssurance = require("./qa");
const ClientApproval = require("./client-approval");

const qa = new QualityAssurance();
const clientApproval = new ClientApproval();
const base = {
    service_id: "SERVICE-1",
    task_id: "TASK-1",
    request_id: "REQ-1",
    expected_output: { type: "booking_record" },
    actual_output: { type: "booking_record", appointment: "requested" },
    acceptance_criteria: [
        { name: "output_type", passed: true },
        { name: "required_fields", passed: true }
    ],
    execution_status: "COMPLETED"
};

function expectReject(patch, label) {
    assert.throws(() => qa.evaluate({ ...base, ...patch }), /QA: missing required fields/, label);
}

assert.deepStrictEqual(qa.getInfo(), {
    id: "QA",
    name: "QUALITY_ASSURANCE",
    version: "1.0.0",
    status: "AVAILABLE"
});
assert.strictEqual(qa.healthCheck().healthy, true);

for (const field of ["service_id", "task_id", "request_id", "expected_output", "actual_output", "acceptance_criteria", "execution_status"]) {
    expectReject({ [field]: undefined }, `missing ${field}`);
}

let result = qa.evaluate(base);
assert.strictEqual(result.decision, "PASS");
assert.strictEqual(result.service_id, base.service_id);
assert.strictEqual(result.task_id, base.task_id);
assert.strictEqual(result.request_id, base.request_id);
assert.ok(result.reason);
assert.ok(Array.isArray(result.checks));

result = qa.evaluate({ ...base, acceptance_criteria: [{ name: "required_fields", passed: false }] });
assert.strictEqual(result.decision, "FAIL");
assert.strictEqual(result.rework_required, true);
assert.strictEqual(result.retry_count, 0);
assert.strictEqual(result.max_retries, 0);

result = qa.evaluate({ ...base, execution_status: "FAILED" });
assert.strictEqual(result.decision, "FAIL");
assert.notStrictEqual(result.decision, "PASS");

result = qa.evaluate({ ...base, actual_output: "" });
assert.strictEqual(result.decision, "FAIL");

result = qa.evaluate({ ...base, acceptance_criteria: "cannot-evaluate" });
assert.strictEqual(result.decision, "REVIEW");
assert.ok(result.reason);

result = qa.evaluate({ ...base, acceptance_criteria: [{ bad: true }] });
assert.strictEqual(result.decision, "REVIEW");

for (const decision of ["PASS", "FAIL", "REVIEW"]) {
    const r = decision === "PASS"
        ? qa.evaluate(base)
        : decision === "FAIL"
            ? qa.evaluate({ ...base, acceptance_criteria: [{ name: "x", passed: false }] })
            : qa.evaluate({ ...base, acceptance_criteria: "ambiguous" });
    assert.ok(["PASS", "FAIL", "REVIEW"].includes(r.decision));
    for (const key of ["decision", "service_id", "task_id", "request_id", "reason", "checks"]) assert.ok(r[key] !== undefined);
}

assert.strictEqual(typeof qa.execute, "function");
assert.throws(() => qa.execute({ ...base, action: "BOOKING_EXECUTION" }), /unsupported action/);
assert.throws(() => qa.execute({ ...base, action: "CLIENT_APPROVAL" }), /unsupported action/);
assert.throws(() => qa.execute({ ...base, action: "DELIVERY" }), /unsupported action/);
assert.throws(() => qa.execute({ ...base, action: "REVENUE_RECORD" }), /unsupported action/);

result = qa.evaluate({ ...base, acceptance_criteria: [{ name: "x", passed: false }], retry_count: 2, max_retries: 3 });
assert.strictEqual(result.decision, "FAIL");
assert.strictEqual(result.retry_count, 2);
assert.strictEqual(result.max_retries, 3);
assert.strictEqual(result.rework_required, true);

// Integration: QA PASS makes the next stage eligible, but never grants approval.
const passedQa = qa.evaluate(base);
assert.strictEqual(passedQa.decision, "PASS");
const pendingApproval = clientApproval.decide({
    service_id: passedQa.service_id,
    request_id: passedQa.request_id,
    qa_decision: passedQa.decision,
    approval_context: {}
});
assert.strictEqual(pendingApproval.decision, "PENDING");
assert.match(pendingApproval.reason, /Awaiting explicit client approval/);

// QA FAIL blocks client approval progression.
const failedQa = qa.evaluate({ ...base, acceptance_criteria: [{ name: "required_fields", passed: false }] });
const blockedAfterFail = clientApproval.decide({
    service_id: failedQa.service_id,
    request_id: failedQa.request_id,
    qa_decision: failedQa.decision,
    approval_context: { approved: true }
});
assert.strictEqual(failedQa.decision, "FAIL");
assert.strictEqual(blockedAfterFail.decision, "PENDING");
assert.match(blockedAfterFail.reason, /QA is PASS/);

// QA REVIEW blocks automatic progression even when an approval signal exists.
const reviewQa = qa.evaluate({ ...base, acceptance_criteria: "ambiguous" });
const blockedAfterReview = clientApproval.decide({
    service_id: reviewQa.service_id,
    request_id: reviewQa.request_id,
    qa_decision: reviewQa.decision,
    approval_context: { approved: true }
});
assert.strictEqual(reviewQa.decision, "REVIEW");
assert.strictEqual(blockedAfterReview.decision, "PENDING");

const approved = clientApproval.decide({
    service_id: passedQa.service_id,
    request_id: passedQa.request_id,
    qa_decision: passedQa.decision,
    approval_context: { approved: true }
});
assert.strictEqual(approved.decision, "APPROVED");
assert.notStrictEqual(passedQa.decision, "APPROVED");
assert.notStrictEqual(typeof qa.approve, "function");
assert.notStrictEqual(typeof qa.decide, "function");

console.log("QA V1 TESTS: PASS");
