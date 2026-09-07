"use strict";

const fs = require("fs");
const path = require("path");
const ComponentContract = require("../../contracts/component-contract");

class SERVICE_MANAGER extends ComponentContract {
    constructor(config = {}) {
        super({
            id: "SERVICE_MANAGER",
            name: "Service Manager",
            version: "1.0.0",
            status: config.status || "AVAILABLE"
        });

        this.storePath = path.join(
            process.cwd(),
            "data",
            "services.json"
        );

        this.services = new Map();

        this.allowedStatuses = [
            "DRAFT",
            "READY",
            "IN_PROGRESS",
            "QA",
            "WAITING_FOR_APPROVAL",
            "DELIVERED",
            "COMPLETED",
            "CANCELLED",
            "FAILED"
        ];

        this.loadServices();
    }

    loadServices() {
        try {
            const dir = path.dirname(this.storePath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            if (!fs.existsSync(this.storePath)) {
                fs.writeFileSync(
                    this.storePath,
                    "[]",
                    "utf8"
                );
                return;
            }

            const raw = fs.readFileSync(
                this.storePath,
                "utf8"
            );

            if (!raw.trim()) {
                return;
            }

            const services = JSON.parse(raw);

            if (!Array.isArray(services)) {
                throw new Error(
                    "Service store must contain an array"
                );
            }

            this.services = new Map(
                services
                    .filter(service =>
                        service &&
                        service.service_id
                    )
                    .map(service => [
                        service.service_id,
                        service
                    ])
            );
        } catch (error) {
            console.error(
                "SERVICE_MANAGER LOAD ERROR:",
                error.message
            );
            this.services = new Map();
        }
    }

    saveServices() {
        const dir = path.dirname(this.storePath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const tempPath =
            `${this.storePath}.tmp`;

        const data = JSON.stringify(
            Array.from(this.services.values()),
            null,
            2
        );

        fs.writeFileSync(
            tempPath,
            data,
            "utf8"
        );

        fs.renameSync(
            tempPath,
            this.storePath
        );
    }

    createService(input = {}) {
        const serviceId =
            input.service_id ||
            `SERVICE_${Date.now()}`;

        const client =
            input.client ||
            input.service?.client ||
            null;

        const requirement =
            input.requirement ||
            input.service?.requirement ||
            input.service?.name ||
            null;

        if (!client) {
            throw new Error("client is required");
        }

        if (!requirement) {
            throw new Error("requirement is required");
        }

        if (this.services.has(serviceId)) {
            throw new Error(
                `Service already exists: ${serviceId}`
            );
        }

        const service = {
            service_id: serviceId,
            client: client,
            requirement: requirement,

            service_type:
                input.service_type ||
                input.service?.type ||
                "AI_AUTOMATION",

            name:
                input.name ||
                input.service?.name ||
                "AI Automation Service",

            status: "DRAFT",

            tasks: [],

            qa: {
                status: "NOT_STARTED",
                result: null
            },

            approval: {
                status: "NOT_REQUIRED",
                requested_at: null,
                approved_at: null
            },

            delivery: {
                status: "NOT_STARTED",
                delivered_at: null
            },

            revenue: {
                status: "NOT_RECORDED",
                amount: input.revenue_amount || 0,
                currency: input.currency || "USD"
            },

            created_at:
                new Date().toISOString(),

            updated_at:
                new Date().toISOString()
        };

        this.services.set(
            serviceId,
            service
        );

        this.saveServices();

        return {
            success: true,
            service
        };
    }

    getService(serviceId) {
        return this.services.get(serviceId) || null;
    }

    updateStatus(serviceId, status) {
        if (!this.allowedStatuses.includes(status)) {
            throw new Error(
                `Invalid service status: ${status}`
            );
        }

        const service =
            this.getService(serviceId);

        if (!service) {
            throw new Error(
                `Unknown service: ${serviceId}`
            );
        }

        service.status = status;
        service.updated_at =
            new Date().toISOString();

        this.saveServices();

        return {
            success: true,
            service
        };
    }

    addTask(serviceId, taskId) {
        const service =
            this.getService(serviceId);

        if (!service) {
            throw new Error(
                `Unknown service: ${serviceId}`
            );
        }

        if (!service.tasks.includes(taskId)) {
            service.tasks.push(taskId);
        }

        service.updated_at =
            new Date().toISOString();

        this.saveServices();

        return {
            success: true,
            service
        };
    }

    createServicePlan(input = {}) {
        const service =
            this.getService(input.service_id);

        if (!service) {
            throw new Error(
                `Unknown service: ${input.service_id}`
            );
        }

        const tasks =
            Array.isArray(input.tasks)
                ? input.tasks
                : [];

        service.tasks = tasks
            .map(task =>
                typeof task === "string"
                    ? task
                    : task.task_id
            )
            .filter(Boolean);

        service.status = "READY";
        service.updated_at =
            new Date().toISOString();

        this.saveServices();

        return {
            success: true,
            service_id: service.service_id,
            task_count: service.tasks.length,
            tasks: service.tasks
        };
    }

    startService(serviceId) {
        return this.updateStatus(
            serviceId,
            "IN_PROGRESS"
        );
    }

    startQA(serviceId) {
        const service =
            this.getService(serviceId);

        if (!service) {
            throw new Error(
                `Unknown service: ${serviceId}`
            );
        }

        service.status = "QA";
        service.qa.status = "IN_PROGRESS";
        service.updated_at =
            new Date().toISOString();

        this.saveServices();

        return {
            success: true,
            service
        };
    }

    completeQA(
        serviceId,
        passed = true,
        result = null
    ) {
        const service =
            this.getService(serviceId);

        if (!service) {
            throw new Error(
                `Unknown service: ${serviceId}`
            );
        }

        service.qa.status =
            passed ? "PASSED" : "FAILED";

        service.qa.result = result;

        if (passed) {
            service.status =
                "WAITING_FOR_APPROVAL";

            service.approval.status =
                "PENDING";

            service.approval.requested_at =
                new Date().toISOString();
        } else {
            service.status = "FAILED";
        }

        service.updated_at =
            new Date().toISOString();

        this.saveServices();

        return {
            success: passed,
            service
        };
    }

    approveService(serviceId) {
        const service =
            this.getService(serviceId);

        if (!service) {
            throw new Error(
                `Unknown service: ${serviceId}`
            );
        }

        service.approval.status =
            "APPROVED";

        service.approval.approved_at =
            new Date().toISOString();

        service.status = "DELIVERED";
        service.delivery.status = "READY";

        service.updated_at =
            new Date().toISOString();

        this.saveServices();

        return {
            success: true,
            service
        };
    }

    completeDelivery(serviceId) {
        const service =
            this.getService(serviceId);

        if (!service) {
            throw new Error(
                `Unknown service: ${serviceId}`
            );
        }

        service.delivery.status =
            "DELIVERED";

        service.delivery.delivered_at =
            new Date().toISOString();

        service.status = "COMPLETED";

        service.updated_at =
            new Date().toISOString();

        this.saveServices();

        return {
            success: true,
            service
        };
    }

    recordRevenue(
        serviceId,
        amount,
        currency = "USD"
    ) {
        const service =
            this.getService(serviceId);

        if (!service) {
            throw new Error(
                `Unknown service: ${serviceId}`
            );
        }

        service.revenue = {
            status: "RECORDED",
            amount: Number(amount) || 0,
            currency
        };

        service.updated_at =
            new Date().toISOString();

        this.saveServices();

        return {
            success: true,
            revenue: service.revenue
        };
    }

    listServices() {
        return Array.from(
            this.services.values()
        );
    }

    getSummary() {
        const services =
            this.listServices();

        const summary = {};

        for (const service of services) {
            summary[service.status] =
                (summary[service.status] || 0) + 1;
        }

        return {
            success: true,
            total: services.length,
            by_status: summary
        };
    }

    execute(input = {}) {
        const action =
            String(input.action || "")
                .toUpperCase();

        switch (action) {
            case "CREATE_SERVICE":
                return this.createService(input);

            case "GET_SERVICE":
                return {
                    success: true,
                    service:
                        this.getService(
                            input.service_id
                        )
                };

            case "UPDATE_SERVICE_STATUS":
                return this.updateStatus(
                    input.service_id,
                    input.status
                );

            case "ADD_SERVICE_TASK":
                return this.addTask(
                    input.service_id,
                    input.task_id
                );

            case "CREATE_SERVICE_PLAN":
                return this.createServicePlan(input);

            case "START_SERVICE":
                return this.startService(
                    input.service_id
                );

            case "START_QA":
                return this.startQA(
                    input.service_id
                );

            case "COMPLETE_QA":
                return this.completeQA(
                    input.service_id,
                    input.passed !== false,
                    input.result || null
                );

            case "APPROVE_SERVICE":
                return this.approveService(
                    input.service_id
                );

            case "COMPLETE_DELIVERY":
                return this.completeDelivery(
                    input.service_id
                );

            case "RECORD_REVENUE":
                return this.recordRevenue(
                    input.service_id,
                    input.amount,
                    input.currency
                );

            case "LIST_SERVICES":
                return {
                    success: true,
                    services:
                        this.listServices()
                };

            case "GET_SUMMARY":
                return this.getSummary();

            default:
                throw new Error(
                    `Unsupported service action: ${action}`
                );
        }
    }
}

module.exports = SERVICE_MANAGER;
