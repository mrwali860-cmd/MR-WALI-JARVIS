const assert = require('assert');

let Verify;
try {
  ({ Verify } = require('./verify-v1'));
} catch (error) {
  Verify = null;
}

function makeVerifier() {
  assert.ok(Verify, 'Verify V1 implementation must exist before tests can pass');
  return new Verify();
}

function validInput(overrides = {}) {
  return {
    request_id: 'req-verify-001',
    service_id: 'svc-whatsapp-lead-automation',
    task_id: 'task-01',
    action: 'SEND_MESSAGE',
    contract: {
      required_fields: ['message_id'],
      success_field: 'message_id'
    },
    execution_result: {
      success: true,
      message_id: 'msg-001'
    },
    ...overrides
  };
}

function run() {
  const verifier = makeVerifier();

  const pass = verifier.verify(validInput());
  assert.strictEqual(pass.status, 'PASS');
  assert.strictEqual(pass.request_id, 'req-verify-001');
  assert.strictEqual(pass.service_id, 'svc-whatsapp-lead-automation');
  assert.strictEqual(pass.task_id, 'task-01');
  assert.strictEqual(pass.action, 'SEND_MESSAGE');
  assert.ok(pass.reason_code);

  const fail = verifier.verify(validInput({ execution_result: { success: true } }));
  assert.strictEqual(fail.status, 'FAIL');

  for (const field of ['request_id', 'service_id', 'task_id', 'action']) {
    const input = validInput({ [field]: undefined });
    assert.strictEqual(verifier.verify(input).status, 'FAIL', `${field} must fail closed`);
  }

  assert.strictEqual(
    verifier.verify(validInput({ execution_result: { ...validInput().execution_result, request_id: 'other-request' } })).status,
    'FAIL',
    'identity mismatch must fail closed'
  );

  assert.strictEqual(verifier.verify(validInput({ contract: null })).status, 'FAIL');
  assert.strictEqual(verifier.verify(validInput({ execution_result: null })).status, 'FAIL');
  assert.strictEqual(verifier.verify(validInput({ action: 'DELETE_ALL' })).status, 'FAIL');

  const verifier2 = makeVerifier();
  const a = verifier.verify(validInput());
  const b = verifier2.verify(validInput());
  assert.deepStrictEqual(a, b, 'verification must be deterministic');

  let providerCalled = false;
  global.__verifyProviderProbe = () => { providerCalled = true; };
  verifier.verify(validInput());
  delete global.__verifyProviderProbe;
  assert.strictEqual(providerCalled, false, 'Verify must not execute providers');

  const secretInput = validInput({ execution_result: {
    success: true,
    message_id: 'msg-001',
    access_token: 'SECRET',
    authorization: 'Bearer SECRET',
    api_key: 'SECRET'
  }});
  const secretResult = verifier.verify(secretInput);
  const serialized = JSON.stringify(secretResult);
  assert.ok(!serialized.includes('SECRET'), 'verification output must not leak credentials');

  assert.strictEqual(Object.isExtensible(pass), true, 'result must be safely serializable');
  JSON.stringify(pass);

  console.log('Verify V1 contract tests: PASS');
}

run();
