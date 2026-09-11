"use strict";

const assert = require("assert");
const ProviderAdapter = require("./provider-adapter-v1");

function expectThrow(fn, code) {
    assert.throws(fn, (error) => error && error.message === code);
}

const envelope = {
    request_id: "REQ-1",
    service_id: "SVC-1",
    task_id: "TASK-1",
    action: "SEND_MESSAGE",
    input: { recipient: "test@example.com", body: "hello" }
};

(function testStableProviderAndAction() {
    const adapter = new ProviderAdapter({ provider: "TEST_PROVIDER", action: "SEND_MESSAGE", operation: "sendMessage" });
    assert.strictEqual(adapter.provider, "TEST_PROVIDER");
    assert.strictEqual(adapter.action, "SEND_MESSAGE");
    assert.strictEqual(adapter.operation, "sendMessage");
})();

(function testRejectsMissingEnvelopeIdentity() {
    const adapter = new ProviderAdapter({ provider: "TEST_PROVIDER", action: "SEND_MESSAGE", operation: "sendMessage" });
    expectThrow(() => adapter.validateEnvelope({ ...envelope, request_id: "" }), "IDENTITY_REQUIRED");
})();

(function testRejectsActionMismatch() {
    const adapter = new ProviderAdapter({ provider: "TEST_PROVIDER", action: "SEND_MESSAGE", operation: "sendMessage" });
    expectThrow(() => adapter.validateEnvelope({ ...envelope, action: "CREATE_EVENT" }), "UNSUPPORTED_ACTION");
})();

(function testExecuteIsSingleDeclaredEntryPoint() {
    let operation;
    const adapter = new ProviderAdapter({
        provider: "TEST_PROVIDER",
        action: "SEND_MESSAGE",
        operation: "sendMessage",
        perform: (value) => { operation = value; return { accepted: true }; }
    });
    const result = adapter.execute(envelope);
    assert.deepStrictEqual(result, { accepted: true });
    assert.strictEqual(operation.action, "SEND_MESSAGE");
    assert.strictEqual(operation.request_id, "REQ-1");
})();

(function testProviderFailureRemainsError() {
    const adapter = new ProviderAdapter({
        provider: "TEST_PROVIDER",
        action: "SEND_MESSAGE",
        operation: "sendMessage",
        perform: () => { const error = new Error("provider unavailable"); error.code = "PROVIDER_DOWN"; throw error; }
    });
    assert.throws(() => adapter.execute(envelope), (error) => error.code === "PROVIDER_DOWN");
})();

(function testNoAuthorizationAuthority() {
    const adapter = new ProviderAdapter({ provider: "TEST_PROVIDER", action: "SEND_MESSAGE", operation: "sendMessage" });
    assert.strictEqual(typeof adapter.authorize, "undefined");
    assert.strictEqual(typeof adapter.approve, "undefined");
})();

(function testNoCredentialLeakInReturnedResult() {
    const adapter = new ProviderAdapter({
        provider: "TEST_PROVIDER",
        action: "SEND_MESSAGE",
        operation: "sendMessage",
        perform: () => ({ accepted: true })
    });
    const result = adapter.execute({ ...envelope, input: { token: "SECRET", message: "hello" } });
    assert.deepStrictEqual(result, { accepted: true });
    assert.strictEqual(JSON.stringify(result).includes("SECRET"), false);
})();

console.log("Provider Adapter V1 contract tests: PASS");
