"use strict";

const Revenue = require("./revenue");
const RevenueEngineV1 = require("./revenue-engine-v1").RevenueEngineV1;
const ServiceManagerIntegration = require("./service-manager-integration");
const ServiceManager = require("./service-manager");
const TaskManager = require("./task-manager");
const Orchestrator = require("./orchestrator");
const Delivery = require("./delivery");

/**
 * Commercial lifecycle adapter V1.
 *
 * RevenueEngineV1 owns prospect/offer/payment state. Existing lifecycle
 * components remain authoritative for service execution, delivery, and
 * accounting. This adapter only connects those boundaries; it does not
 * replace their state or bypass approval gates.
 */
class RevenueEngineV1Integration {
    constructor({
        revenueEngine,
        serviceManager,
        taskManager,
        serviceIntegration,
        orchestrator,
        delivery,
        revenue
    } = {}) {
        this.revenueEngine = revenueEngine || new RevenueEngineV1();
        this.serviceManager = serviceManager || new ServiceManager();
        this.taskManager = taskManager || new TaskManager();
        this.serviceIntegration = serviceIntegration || new ServiceManagerIntegration({
            serviceManager: this.serviceManager,
            taskManager: this.taskManager
        });
        this.orchestrator = orchestrator || new Orchestrator({
            serviceManager: this.serviceManager,
            taskManager: this.taskManager
        });
        this.delivery = delivery || new Delivery();
        this.revenue = revenue || new Revenue();
        this.servicesByOpportunity = new Map();
    }

    acquire(input = {}) {
        return this.revenueEngine.acquire(input);
    }

    qualify(opportunityId, nextAction = "CONTACT") {
        return this.revenueEngine.advance(opportunityId, "QUALIFIED", nextAction);
    }

    contact(opportunityId, nextAction = "WAIT_FOR_REPLY") {
        return this.revenueEngine.advance(opportunityId, "CONTACTED", nextAction);
    }

    reply(opportunityId, nextAction = "REQUEST_CALL") {
        return this.revenueEngine.advance(opportunityId, "REPLIED", nextAction);
    }

    requestCall(opportunityId, nextAction = "CREATE_OFFER") {
        return this.revenueEngine.advance(opportunityId, "CALL_REQUESTED", nextAction);
    }

    createOffer(input = {}) {
        return this.revenueEngine.createOffer(input);
    }

    approveOffer(offerId) {
        return this.revenueEngine.approveOffer(offerId);
    }

    confirmPayment(input = {}) {
        const payment = this.revenueEngine.confirmPayment(input);
        if (payment.duplicate) return payment;

        const serviceId = input.service_id || `SERVICE_${input.offer_id}`;
        const opportunityId = payment.opportunity_id;
        const plan = this.serviceIntegration.createServicePlan({
            service_id: serviceId,
            client: input.client || opportunityId,
            requirement: input.requirement
        });
        this.servicesByOpportunity.set(opportunityId, serviceId);
        return { ...payment, service_plan: plan };
    }

    async executeTask({ service_id, task_id, action, request_id, approval_context, input } = {}) {
        return this.orchestrator.execute({
            service_id,
            task_id,
            action,
            request_id,
            approval_context,
            input
        });
    }

    deliver(input = {}) {
        return this.delivery.deliver(input);
    }

    recordRevenue(input = {}) {
        return this.revenue.record(input);
    }

    intelligence() {
        return {
            ...this.revenueEngine.intelligence(),
            service_links: this.servicesByOpportunity.size,
            services: this.servicesByOpportunity.size
        };
    }

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
            case "DELIVER": return this.deliver(input);
            case "RECORD_REVENUE": return this.recordRevenue(input);
            case "INTELLIGENCE": return this.intelligence();
            default: throw new Error(`REVENUE_ENGINE_INTEGRATION: unsupported action ${action}`);
        }
    }
}

module.exports = RevenueEngineV1Integration;
