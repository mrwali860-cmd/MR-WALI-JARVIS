"use strict";

const assert = require("assert");
const RevenueEngineV1Integration = require("./revenue-engine-v1-integration");

(async () => {
    const app = new RevenueEngineV1Integration();
    const opportunityId = "opp-integration-001";
    const requestId = "REQ-REV-001";
    const serviceId = "SERVICE_REV_001";

    const acquired = app.acquire({ opportunity_id: opportunityId, request_id: requestId, service_id: "AI_APPOINTMENT_BOOKING_AUTOMATION", company: "Demo Realty", contact: "demo@example.com", market: "REAL_ESTATE", problem: "Slow lead response", budget: "1500", urgency: true });
    assert.strictEqual(acquired.stage, "PROSPECT");
    assert.strictEqual(app.qualify(opportunityId).stage, "QUALIFIED");
    assert.strictEqual(app.contact(opportunityId).stage, "CONTACTED");
    assert.strictEqual(app.reply(opportunityId).stage, "REPLIED");
    assert.strictEqual(app.requestCall(opportunityId).stage, "CALL_REQUESTED");

    const offer = app.createOffer({ opportunity_id: opportunityId, offer_id: "offer-integration-001", amount: 1500, currency: "USD", problem: "Slow lead response", outcome: "Qualified leads and approved appointment workflow" });
    assert.strictEqual(offer.status, "OFFER_SENT");
    assert.strictEqual(app.approveOffer(offer.offer_id).status, "APPROVED");
    assert.throws(() => app.confirmPayment({ offer_id: offer.offer_id, payment_status: "PENDING", transaction_reference: "tx-pending" }), /payment must be CONFIRMED/);

    const payment = app.confirmPayment({ offer_id: offer.offer_id, payment_status: "CONFIRMED", transaction_reference: "tx-integration-001", service_id: serviceId, client: "Demo Realty", requirement: "AI appointment booking automation" });
    assert.strictEqual(payment.payment_status, "CONFIRMED");
    assert.strictEqual(payment.service_plan.execution_ready, true);
    assert.strictEqual(payment.service_plan.task_count, 10);
    assert.strictEqual(app.confirmPayment({ offer_id: offer.offer_id, payment_status: "CONFIRMED", transaction_reference: "tx-integration-001" }).duplicate, true);

    const plan = app.serviceIntegration.getExecutionPlan(serviceId);
    const firstTask = plan.tasks[0];
    const execution = await app.executeTask({ service_id: serviceId, task_id: firstTask.task_id, action: firstTask.action, request_id: requestId });
    assert.strictEqual(execution.success, true);
    assert.strictEqual(execution.status, "COMPLETED");
    assert.strictEqual(execution.trace.request_id, requestId);

    const qa = app.evaluateQA({ service_id: serviceId, task_id: firstTask.task_id, request_id: requestId, expected_output: { result: "demo" }, actual_output: { result: "demo" }, acceptance_criteria: [{ name: "result", required: true, passed: true }], execution_status: "COMPLETED" });
    assert.strictEqual(qa.decision, "PASS");
    assert.strictEqual(app.serviceManager.getService(serviceId).qa.status, "PASSED");

    const approvalPending = app.decideClientApproval({ service_id: serviceId, request_id: requestId, qa_decision: "PASS", approval_context: { status: "PENDING" } });
    assert.strictEqual(approvalPending.decision, "PENDING");
    const approval = app.decideClientApproval({ service_id: serviceId, request_id: requestId, qa_decision: "PASS", approval_context: { status: "APPROVED", approved: true, source: "CLIENT" } });
    assert.strictEqual(approval.decision, "APPROVED");
    assert.strictEqual(app.serviceManager.getService(serviceId).delivery.status, "READY");

    const blockedDelivery = app.deliver({ service_id: serviceId, request_id: requestId, qa_decision: "FAIL", client_approval_decision: "APPROVED", delivery_payload: { result: "demo" } });
    assert.strictEqual(blockedDelivery.delivery_status, "BLOCKED");
    const delivered = app.deliver({ service_id: serviceId, request_id: requestId, qa_decision: "PASS", client_approval_decision: "APPROVED", delivery_payload: { result: "demo" } });
    assert.strictEqual(delivered.delivery_status, "DELIVERED");
    assert.strictEqual(app.serviceManager.getService(serviceId).status, "COMPLETED");

    const revenue = app.recordRevenue({ service_id: serviceId, request_id: requestId, delivery_status: delivered.delivery_status, payment_status: "CONFIRMED", amount: 1500, currency: "USD", transaction_reference: "tx-integration-001" });
    assert.strictEqual(revenue.revenue_status, "PAID");
    assert.strictEqual(revenue.decision, "RECORDED");
    assert.strictEqual(app.serviceManager.getService(serviceId).revenue.status, "RECORDED");

    const intelligence = app.intelligence();
    assert.strictEqual(intelligence.opportunities, 1);
    assert.strictEqual(intelligence.deals_won, 1);
    assert.strictEqual(intelligence.cash_collected, 1500);
    assert.strictEqual(intelligence.service_links, 1);
    console.log("Revenue Engine V1 Integration Tests: PASS");
})().catch((error) => { console.error(error); process.exit(1); });
