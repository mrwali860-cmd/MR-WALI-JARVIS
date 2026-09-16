"use strict";

const assert = require("assert");
const RealTaskExecutor = require("./real-task-executor");

(async () => {
    const calls = [];
    const executor = new RealTaskExecutor({
        prospectDiscovery: {
            async discover(input) {
                calls.push(input);
                return { executed: true, status: "COMPLETE", prospects: [{ name: "Test Prospect" }] };
            }
        }
    });

    const result = await executor.execute({
        action: "LEAD_INTAKE",
        task: { task_id: "T1", data: { query: "Dubai real estate", limit: 20 } }
    });

    assert.strictEqual(result.executed, true);
    assert.strictEqual(calls.length, 1);
    assert.deepStrictEqual(calls[0], { query: "Dubai real estate", limit: 20 });

    await assert.rejects(
        () => executor.execute({ action: "UNSUPPORTED", task: { task_id: "T2" } }),
        /UNSUPPORTED_REAL_TASK_ACTION/
    );

    console.log("REAL TASK EXECUTOR TEST: PASS");
})();
