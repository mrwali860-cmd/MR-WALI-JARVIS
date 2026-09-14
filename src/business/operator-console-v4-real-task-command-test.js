"use strict";
const assert = require("assert");
const OperatorConsoleV4TaskCommand = require("./operator-console-v4-real-task-command");

(async () => {
  let received = null;
  const orchestrator = { executeTask: async (input) => { received = input; return { success: true, status: "COMPLETED", trace: { request_id: input.request_id } }; } };
  const adapter = new OperatorConsoleV4TaskCommand({ orchestrator });

  assert.deepStrictEqual(adapter.parse("execute task SERVICE_1 TASK_1"), { service_id: "SERVICE_1", task_id: "TASK_1" });
  assert.deepStrictEqual(adapter.parse("run task SERVICE_1 TASK_1"), { service_id: "SERVICE_1", task_id: "TASK_1" });
  assert.strictEqual(adapter.parse("execute task SERVICE_1"), null);

  const result = await adapter.execute("execute task SERVICE_1 TASK_1");
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, "COMPLETED");
  assert.ok(/^v4-/.test(result.request_id));
  assert.strictEqual(received.service_id, "SERVICE_1");
  assert.strictEqual(received.task_id, "TASK_1");
  assert.strictEqual(received.action, "EXECUTE_TASK");
  assert.strictEqual(received.request_id, result.request_id);

  const clarification = await adapter.execute("execute task SERVICE_1");
  assert.strictEqual(clarification.status, "CLARIFICATION_REQUIRED");

  const failing = new OperatorConsoleV4TaskCommand({ orchestrator: { executeTask: async () => { throw new Error("unknown task"); } } });
  const failure = await failing.execute("run task SERVICE_1 TASK_404");
  assert.strictEqual(failure.status, "FAILED");
  assert.strictEqual(failure.error, "unknown task");

  console.log("OPERATOR CONSOLE V4 REAL TASK COMMAND TEST: PASS");
})().catch((error) => { console.error(error); process.exit(1); });
