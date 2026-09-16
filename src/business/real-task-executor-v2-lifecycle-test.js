"use strict";

const assert = require("assert");
const RealTaskExecutor = require("./real-task-executor");
const CalendarBookingProviderAdapterV1 = require("./calendar-booking-provider-adapter-v1");

(async () => {
    const tasks = new Map();
    const providerCalls = [];
    const serviceId = "V2_SERVICE";
    const requestId = "V2_REQUEST";

    const makeTask = (taskId, action, dependencyId = null) => {
        const task = {
            task_id: taskId,
            action,
            dependencies: dependencyId ? [dependencyId] : [],
            data: { service_id: serviceId }
        };
        tasks.set(taskId, task);
        return task;
    };

    const intake = makeTask("T1", "LEAD_INTAKE");
    intake.status = "COMPLETED";
    intake.result = {
        prospects: [{ id: "lead-001", name: "Test Lead", phone: "+971500000000", website: "https://example.com" }]
    };

    const qualification = makeTask("T2", "LEAD_QUALIFICATION", intake.task_id);
    qualification.status = "COMPLETED";
    qualification.result = {
        qualified_leads: [{ id: "lead-001", name: "Test Lead", phone: "+971500000000", website: "https://example.com" }]
    };

    const appointment = makeTask("T3", "APPOINTMENT_REQUEST", qualification.task_id);
    appointment.status = "COMPLETED";
    appointment.result = {
        appointment_requests: [{
            request_id: "appointment_request_lead-001",
            lead_id: "lead-001",
            lead_name: "Test Lead",
            requested_time: "2026-10-01T10:00:00Z",
            requested_duration_minutes: 30
        }]
    };

    const approvalGate = makeTask("T4", "APPROVAL_GATE", appointment.task_id);
    approvalGate.status = "COMPLETED";
    approvalGate.result = { decision: "APPROVED" };

    const booking = makeTask("T5", "BOOKING_EXECUTION", approvalGate.task_id);
    const crm = makeTask("T6", "CRM_RECORD", booking.task_id);
    const qa = makeTask("T7", "QA", crm.task_id);
    const clientApproval = makeTask("T8", "CLIENT_APPROVAL", qa.task_id);
    const delivery = makeTask("T9", "DELIVERY", clientApproval.task_id);
    const revenue = makeTask("T10", "REVENUE_RECORD", delivery.task_id);

    const taskManager = {
        getTask(taskId) { return tasks.get(taskId) || null; }
    };

    const provider = new CalendarBookingProviderAdapterV1({
        provider: "TEST_CALENDAR",
        perform(input) {
            providerCalls.push(input);
            return {
                executed: true,
                status: "CONFIRMED",
                booking_id: "booking-001",
                ...input
            };
        }
    });

    const executor = new RealTaskExecutor({ taskManager, calendarBookingProvider: provider });

    const noProvider = new RealTaskExecutor({ taskManager });
    await assert.rejects(
        () => noProvider.execute({ action: "BOOKING_EXECUTION", task: booking, request_id: requestId, approval_context: { approved: true } }),
        /CALENDAR_PROVIDER_NOT_CONFIGURED/
    );

    const bookingResult = await executor.execute({
        action: "BOOKING_EXECUTION",
        task: booking,
        request_id: requestId,
        approval_context: { approved: true },
        input: appointment.result.appointment_requests[0]
    });
    booking.status = "COMPLETED";
    booking.result = bookingResult;
    assert.strictEqual(bookingResult.status, "CONFIRMED");
    assert.strictEqual(providerCalls.length, 1);

    const crmResult = await executor.execute({ action: "CRM_RECORD", task: crm, request_id: requestId });
    crm.status = "COMPLETED";
    crm.result = crmResult;
    assert.strictEqual(crmResult.status, "COMPLETE");
    assert.strictEqual(crmResult.crm_record.booking_task_id, booking.task_id);

    const qaResult = await executor.execute({
        action: "QA",
        task: qa,
        request_id: requestId,
        input: { acceptance_criteria: [{ name: "booking-confirmed", passed: true }] }
    });
    qa.status = "COMPLETED";
    qa.result = qaResult;
    assert.strictEqual(qaResult.decision, "PASS");

    const pendingApproval = await executor.execute({
        action: "CLIENT_APPROVAL",
        task: clientApproval,
        request_id: requestId,
        approval_context: {}
    });
    assert.strictEqual(pendingApproval.decision, "PENDING");

    const approvalResult = await executor.execute({
        action: "CLIENT_APPROVAL",
        task: clientApproval,
        request_id: requestId,
        approval_context: { status: "APPROVED", source: "TEST_CLIENT" }
    });
    clientApproval.status = "COMPLETED";
    clientApproval.result = approvalResult;
    assert.strictEqual(approvalResult.decision, "APPROVED");

    const deliveryResult = await executor.execute({
        action: "DELIVERY",
        task: delivery,
        request_id: requestId,
        input: { delivery_payload: { booking_id: "booking-001", crm_recorded: true } }
    });
    delivery.status = "COMPLETED";
    delivery.result = deliveryResult;
    assert.strictEqual(deliveryResult.delivery_status, "DELIVERED");

    const unpaid = await executor.execute({
        action: "REVENUE_RECORD",
        task: revenue,
        request_id: requestId,
        input: { payment_status: "PENDING", amount: 5000, currency: "USD", transaction_reference: "V2_PENDING" }
    });
    assert.strictEqual(unpaid.revenue_status, "PENDING");

    const paid = await executor.execute({
        action: "REVENUE_RECORD",
        task: revenue,
        request_id: requestId,
        input: { payment_status: "CONFIRMED", amount: 5000, currency: "USD", transaction_reference: "V2_PAID" }
    });
    assert.strictEqual(paid.revenue_status, "PAID");
    assert.strictEqual(paid.decision, "RECORDED");

    console.log("REAL TASK EXECUTOR V2 LIFECYCLE TEST: PASS");
})();
