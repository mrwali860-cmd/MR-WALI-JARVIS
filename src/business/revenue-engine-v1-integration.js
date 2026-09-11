"use strict";

const Revenue = require("./revenue");
const RevenueEngineV1 = require("./revenue-engine-v1").RevenueEngineV1;
const ServiceManagerIntegration = require("./service-manager-integration");
const ServiceManager = require("./service-manager");
const TaskManager = require("./task-manager");
const Orchestrator = require("./orchestrator");
const QualityAssurance = require("./qa");
const ClientApproval = require("./client-approval");
const Delivery = require("./delivery");

class RevenueEngineV1Integration {
    constructor({ revenueEngine, serviceManager, taskManager, serviceIntegration, orchestrator, qa, clientApproval, delivery, revenue } = {}) {
        this.revenueEngine = revenueEngine || new RevenueEngineV1();
        this.serviceManager = serviceManager || new ServiceManager();
        this.taskManager = taskManager || new TaskManager();
        this.serviceIntegration = serviceIntegration || new ServiceManagerIntegration({ serviceManager: this.serviceManager, taskManager: this.taskManager });
        this.orchestrator = orchestrator || new Orchestrator({ serviceManager: this.serviceManager, taskManager: this.taskManager });
        this.qa = qa || new QualityAssurance();
        this.clientApproval = clientApproval || new ClientApproval();
        this.delivery = delivery || new Delivery();
        this.revenue = revenue || new Revenue();
        this.servicesByOpportunity = new Map();
    }
    acquire(input = {}) { return this.revenueEngine.acquire(input); }
    qualify(opportunityId, nextAction = "CONTACT") { return this.revenueEngine.advance(opportunityId, "QUALIFIED", nextAction); }
    contact(opportunityId, nextAction = "WAIT_FOR_REPLY") { return this.revenueEngine.advance(opportunityId, "CONTACTED", nextAction); }
    reply(opportunityId, nextAction = "REQUEST_CALL") { return this.revenueEngine.advance(opportunityId, "REPLIED", nextAction); }
    requestCall(opportunityId, nextAction = "CREATE_OFFER") { return this.revenueEngine.advance(opportunityId, "CALL_REQUESTED", nextAction); }
    createOffer(input = {}) { return this.revenueEngine.createOffer(input); }
    approveOffer(offerId) { return this.revenueEngine.approveOffer(offerId); }
    confirmPayment(input = {}) {
        const payment = this.revenueEngine.confirmPayment(input);
        if (payment.duplicate) return payment;
        const serviceId = input.service_id || `SERVICE_${input.offer_id}`;
        const plan = this.serviceIntegration.createServicePlan({ service_id: serviceId, client: input.client || payment.opportunity_id, requirement: input.requirement });
        this.servicesByOpportunity.set(payment.opportunity_id, serviceId);
        return { ...payment, service_plan: plan };
    }
    async executeTask({ service_id, task_id, action, request_id, approval_context, input } = {}) {
        return this.orchestrator.execute({ service_id, task_id, action, request_id, approval_context, input });
    }
    evaluateQA(input = {}) {
        const result = this.qa.evaluate(input);
        if (result.decision === "PASS") {
            this.serviceManager.startQA(input.service_id);
            this.serviceManager.completeQA(input.service_id, true, result);
        } else if (result.decision === "FAIL") {
            this.serviceManager.startQA(input.service_id);
            this.serviceManager.completeQA(input.service_id, false, result);
        }
        return result;
    }
    decideClientApproval(input = {}) {
        const result = this.clientApproval.decide(input);
        if (result.decision !== "APPROVED") return result;

        const stateTransition = this.serviceManager.approveService(input.service_id, input.approval_context);
        if (!stateTransition.success) {
            throw new Error(`REVENUE_ENGINE_INTEGRATION: client approval state transition failed: ${stateTransition.reason}`);
        }
        if (stateTransition.service.delivery.status !== "READY") {
            throw new Error("REVENUE_ENGINE_INTEGRATION: approved service must have delivery status READY");
        }
        return { ...result, service_state: stateTransition.service };
    }
    deliver(input = {}) {
        const result = this.delivery.deliver(input);
        if (result.delivery_status === "DELIVERED") this.serviceManager.completeDelivery(input.service_id);
        return result;
    }
    recordRevenue(input = {}) {
        const result = this.revenue.record(input);
        if (result.revenue_status === "PAID") this.serviceManager.recordRevenue(input.service_id, input.amount, input.currency);
        return result;
    }
    intelligence() { return { ...this.revenueEngine.intelligence(), service_links: this.servicesByOpportunity.size, services: this.servicesByOpportunity.size }; }
    execute(input = {}) {
        const action = String(input.action || "").trim().toUpperCase();
        switch (action) {
            case "ACQUIRE": return this.acquire(input);
            case "QUALIFY": return this.qualify(input.opportunity_id, input.next_action);
            case "CONTACT": return this.contact(input.opportunity_id, input.next_action);
            case "REPLY": return this.reply(input.opportunity_id, input.next_action);
            case "CALL_REQUEST": return this.requestCall(input.opportunity_id, input.next_action);
            case "OFFER": return this.createOffer(input);
            case "APPROVE_OFFER": return this.approveOffer(input.offer_id);
            case "CONFIRM_PAYMENT": return this.confirmPayment(input);
            case "EXECUTE_TASK": return this.executeTask(input);
            case "QA": return this.evaluateQA(input);
            case "CLIENT_APPROVAL": return this.decideClientApproval(input);
            case "DELIVER": return this.deliver(input);
            case "RECORD_REVENUE": return this.recordRevenue(input);
            case "INTELLIGENCE": return this.intelligence();
            default: throw new Error(`REVENUE_ENGINE_INTEGRATION: unsupported action ${action}`);
        }
    }
}
module.exports = RevenueEngineV1Integration;
