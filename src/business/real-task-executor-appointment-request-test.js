"use strict";

const assert = require("assert");
const RealTaskExecutor = require("./real-task-executor");

(async () => {
    const qualificationTask = {
        task_id: "qualification-001",
        status: "COMPLETED",
        result: {
            status: "COMPLETE",
            qualified_leads: [
                { id: "p1", name: "Agency One", phone: "+971500000001", website: "https://agency-one.example", qualification_status: "QUALIFIED" },
                { id: "p3", name: "Agency Three", phone: "+971500000003", website: "", qualification_status: "QUALIFIED" }
            ]
        }
    };

    const taskManager = {
        getTask(taskId) {
            return taskId === "qualification-001" ? qualificationTask : null;
        }
    };

    const executor = new RealTaskExecutor({ taskManager });
    const result = await executor.execute({
        action: "APPOINTMENT_REQUEST",
        task: { task_id: "appointment-001", dependencies: ["qualification-001"], data: {} }
    });

    assert.equal(result.executed, true);
    assert.equal(result.status, "COMPLETE");
    assert.equal(result.mode, "REQUEST_PREPARATION");
    assert.equal(result.source_task_id, "qualification-001");
    assert.equal(result.request_count, 2);
    assert.equal(result.appointment_requests[0].lead_id, "p1");
    assert.equal(result.appointment_requests[0].status, "PENDING_APPROVAL");
    assert.equal(result.appointment_requests[0].requested_duration_minutes, 30);
    assert.equal(result.appointment_requests[1].lead_id, "p3");

    await assert.rejects(
        executor.execute({
            action: "APPOINTMENT_REQUEST",
            task: { task_id: "appointment-002", dependencies: [] }
        }),
        /APPOINTMENT_REQUEST_REQUIRES_COMPLETED_LEAD_QUALIFICATION/
    );

    await assert.rejects(
        executor.execute({
            action: "APPOINTMENT_REQUEST",
            task: { task_id: "appointment-003", dependencies: ["missing"] }
        }),
        /APPOINTMENT_REQUEST_REQUIRES_COMPLETED_LEAD_QUALIFICATION/
    );

    console.log("real-task-executor appointment request tests: PASS");
})();
