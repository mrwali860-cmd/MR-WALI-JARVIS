"use strict";

const ExternalExecutionBoundary = require("./external-execution-boundary");

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`PASS  ${name}`);
        passed++;
    } catch (error) {
        console.error(`FAIL  ${name}`);
        console.error(`      ${error.message}`);
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function assertThrows(fn, expected) {
    try {
        fn();
        throw new Error(`Expected ${expected}`);
    } catch (error) {
        assert(error.message === expected, `Expected ${expected}, got ${error.message}`);
    }
}

const base = {
    request_id: "REQ_EEB_V1_001",
    service_id: "SERVICE_EEB_V1",
    task_id: "TASK_EEB_V1",
    action: "EXTERNAL_MESSAGE_SEND",
    provider: "TEST_PROVIDER",
    approval_context: { allowed: true },
    input: { message: "hello" }
};

/* Contract identity and fail-closed authorization */
test("rejects missing identity", () => {
    const boundary = new ExternalExecutionBoundary({ adapters: {} });
    assertThrows(() => boundary.execute({ ...base, request_id: "" }), "IDENTITY_REQUIRED");
});

test("rejects missing authorization before adapter invocation", () => {
    let invoked = false;
    const boundary = new ExternalExecutionBoundary({
        adapters: { TEST_PROVIDER: { action: base.action, execute: () => { invoked = true; } } }
    });
    assertThrows(() => boundary.execute({ ...base, approval_context: undefined }), "AUTHORIZATION_REQUIRED");
    assert(invoked === false, "Adapter must not run before authorization");
});

test("rejects denied authorization", () => {
    const boundary = new ExternalExecutionBoundary({ adapters: { TEST_PROVIDER: { execute() {} } } });
    assertThrows(() => boundary.execute({ ...base, approval_context: { allowed: false } }), "AUTHORIZATION_REQUIRED");
});

test("rejects unsupported provider", () => {
    const boundary = new ExternalExecutionBoundary({ adapters: {} });
    assertThrows(() => boundary.execute(base), "UNSUPPORTED_PROVIDER");
});

test("rejects unsupported action mapping", () => {
    const boundary = new ExternalExecutionBoundary({
        adapters: { TEST_PROVIDER: { action: "BOOKING_EXECUTION", execute() {} } }
    });
    assertThrows(() => boundary.execute(base), "UNSUPPORTED_ACTION");
});

/* Authorized adapter execution and normalized outcomes */
test("invokes adapter only after authorization and preserves request identity", () => {
    let received;
    const boundary = new ExternalExecutionBoundary({
        adapters: {
            TEST_PROVIDER: {
                action: base.action,
                execute(input) {
                    received = input;
                    return { provider_message_id: "TEST-1", status: "accepted" };
                }
            }
        }
    });

    const result = boundary.execute(base);
    assert(result.success === true, "Expected success");
    assert(result.request_id === base.request_id, "request_id must be preserved");
    assert(result.action === base.action, "action must be preserved");
    assert(result.provider === base.provider, "provider must be reported");
    assert(received.request_id === base.request_id, "Adapter must receive request_id");
    assert(received.input.message === "hello", "Adapter input mismatch");
});

test("normalizes adapter failure without converting it to success", () => {
    const boundary = new ExternalExecutionBoundary({
        adapters: {
            TEST_PROVIDER: {
                action: base.action,
                execute() {
                    const error = new Error("provider unavailable");
                    error.code = "PROVIDER_DOWN";
                    throw error;
                }
            }
        }
    });

    const result = boundary.execute(base);
    assert(result.success === false, "Provider failure must remain failure");
    assert(result.request_id === base.request_id, "request_id must be preserved on failure");
    assert(result.error.code === "PROVIDER_DOWN", "Error code mismatch");
    assert(result.error.message === "provider unavailable", "Error message mismatch");
});

test("does not retry adapter execution in V1", () => {
    let calls = 0;
    const boundary = new ExternalExecutionBoundary({
        adapters: {
            TEST_PROVIDER: {
                action: base.action,
                execute() {
                    calls++;
                    throw new Error("fail once");
                }
            }
        }
    });

    const result = boundary.execute(base);
    assert(result.success === false, "Expected failure");
    assert(calls === 1, "V1 must not retry provider execution");
});

/* No credential leakage through normalized result */
test("does not copy credentials into the normalized envelope", () => {
    const boundary = new ExternalExecutionBoundary({
        adapters: {
            TEST_PROVIDER: {
                action: base.action,
                execute() {
                    return { provider_message_id: "TEST-2", status: "accepted" };
                }
            }
        }
    });

    const result = boundary.execute({
        ...base,
        input: { message: "hello", credential: "SHOULD_NOT_BE_OUTPUT" }
    });

    const serialized = JSON.stringify(result);
    assert(!serialized.includes("SHOULD_NOT_BE_OUTPUT"), "Credential-like input leaked into output");
});

console.log(`External Execution Boundary V1: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
