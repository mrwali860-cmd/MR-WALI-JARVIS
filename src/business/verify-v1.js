const SECRET_KEYS = /token|secret|password|authorization|api[_-]?key|private[_-]?key/i;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitize(value) {
  if (Array.isArray(value)) return value.map(sanitize);
  if (!isObject(value)) return value;
  const out = {};
  for (const [key, val] of Object.entries(value)) {
    if (SECRET_KEYS.test(key)) continue;
    out[key] = sanitize(val);
  }
  return out;
}

function fail(input, reason_code) {
  return {
    request_id: input && input.request_id,
    service_id: input && input.service_id,
    task_id: input && input.task_id,
    action: input && input.action,
    status: 'FAIL',
    reason_code
  };
}

class Verify {
  verify(input) {
    if (!isObject(input)) return fail({}, 'INVALID_INPUT');

    const { request_id, service_id, task_id, action, contract, execution_result } = input;
    if (![request_id, service_id, task_id, action].every(v => typeof v === 'string' && v.length > 0)) {
      return fail(input, 'INVALID_IDENTITY');
    }
    if (!isObject(contract) || !Array.isArray(contract.required_fields) || typeof contract.success_field !== 'string') {
      return fail(input, 'INVALID_CONTRACT');
    }
    if (!isObject(execution_result) || execution_result.success !== true) {
      return fail(input, 'EXECUTION_NOT_SUCCESSFUL');
    }
    if (execution_result.request_id !== undefined && execution_result.request_id !== request_id) {
      return fail(input, 'IDENTITY_MISMATCH');
    }
    if (execution_result.service_id !== undefined && execution_result.service_id !== service_id) {
      return fail(input, 'IDENTITY_MISMATCH');
    }
    if (execution_result.task_id !== undefined && execution_result.task_id !== task_id) {
      return fail(input, 'IDENTITY_MISMATCH');
    }
    if (execution_result.action !== undefined && execution_result.action !== action) {
      return fail(input, 'ACTION_MISMATCH');
    }

    const sanitized = sanitize(execution_result);
    for (const field of contract.required_fields) {
      if (typeof field !== 'string' || sanitized[field] === undefined || sanitized[field] === null) {
        return fail(input, 'OUTPUT_CONTRACT_MISMATCH');
      }
    }
    if (sanitized[contract.success_field] === undefined || sanitized[contract.success_field] === null) {
      return fail(input, 'OUTPUT_CONTRACT_MISMATCH');
    }

    return {
      request_id,
      service_id,
      task_id,
      action,
      status: 'PASS',
      reason_code: 'VERIFIED',
      checks: {
        execution_success: true,
        identity_consistent: true,
        output_contract: true
      }
    };
  }
}

module.exports = { Verify, sanitize };
