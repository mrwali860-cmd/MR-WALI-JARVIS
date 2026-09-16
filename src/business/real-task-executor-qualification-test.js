"use strict";

const assert = require("assert");
const RealTaskExecutor = require("./real-task-executor");

(async () => {
    const dependencyTask = {
        task_id: "intake-001",
        status: "COMPLETED",
        result: {
            status: "COMPLETE",
            prospects: [
                { id: "p1", name: "Agency One", phone: "+971500000001", website: "https://agency-one.example" },
                { id: "p2", name: "Agency Two", phone: "", website: "" },
                { id: "p3", name: "Agency Three", phone: "+971500000003", website: "" }
            ]
        }
    };

    const taskManager = {
        getTask(taskId) {
            return taskId === "intake-001" ? dependencyTask : null;
        }
    };

    const executor = new RealTaskExecutor({ taskManager });
    const result = await executor.execute({
        action: "LEAD_QUALIFICATION",
        task: { task_id: "qualification-001", dependencies: ["intake-001"], data: {} }
    });

    assert.equal(result.executed, true);
    assert.equal(result.status, "COMPLETE");
    assert.equal(result.total_evaluated, 3);
    assert.equal(result.qualified_count, 2);
    assert.equal(result.unqualified_count, 1);
    assert.equal(result.qualified_leads[0].id, "p1");
    assert.equal(result.qualified_leads[1].id, "p3");

    await assert.rejects(
        executor.execute({ action: "LEAD_QUALIFICATION", task: { task_id: "qualification-002", dependencies: [] } }),
        /LEAD_QUALIFICATION_REQUIRES_COMPLETED_LEAD_INTAKE/
    );

    console.log("real-task-executor qualification tests: PASS");
})();
