"use strict";

const ServiceManager = require("./service-manager");
const TaskManager = require("./task-manager");
const { getFirstSellableService } = require("./first-service-contract");

/**
 * Service Manager Integration Layer V1
 *
 * Responsibility:
 * - create a sellable service through Service Manager
 * - materialize its contract tasks in Task Manager
 * - connect tasks with deterministic dependencies
 * - attach task IDs back to the service
 * - return an execution-ready plan for the Orchestrator
 *
 * It does NOT execute external actions.
 */
class ServiceManagerIntegration {
    constructor({ serviceManager, taskManager } = {}) {
        this.serviceManager = serviceManager || new ServiceManager();
        this.taskManager = taskManager || new TaskManager();
    }

    createServicePlan(input = {}) {
        const contract = getFirstSellableService();
        const serviceId = input.service_id || `SERVICE_${Date.now()}`;

        const created = this.serviceManager.createService({
            service_id: serviceId,
            client: input.client,
            requirement: input.requirement || contract.name,
            service_type: contract.category,
            name: contract.name,
            revenue_amount: input.revenue_amount,
            currency: input.currency
        });

        const taskIds = [];
        const tasks = contract.tasks;

        for (let index = 0; index < tasks.length; index += 1) {
            const definition = tasks[index];
            const taskId = `${serviceId}__${String(index + 1).padStart(2, "0")}__${definition.task_type}`;
            const dependencyId = index > 0 ? taskIds[index - 1] : null;

            this.taskManager.createTask({
                task_id: taskId,
                intent: definition.name,
                action: definition.task_type,
                target: serviceId,
                data: {
                    service_id: serviceId,
                    task_type: definition.task_type,
                    required: definition.required
                },
                priority: index < 3 ? "HIGH" : "NORMAL",
                dependencies: dependencyId ? [dependencyId] : []
            });

            taskIds.push(taskId);
        }

        this.serviceManager.createServicePlan({
            service_id: serviceId,
            tasks: taskIds
        });

        return {
            success: true,
            service_id: serviceId,
            service_status: this.serviceManager.getService(serviceId).status,
            task_ids: taskIds,
            task_count: taskIds.length,
            execution_ready: true,
            approval_gates: contract.risk_controls,
            dependencies: taskIds.map((taskId, index) => ({
                task_id: taskId,
                depends_on: index > 0 ? taskIds[index - 1] : null
            }))
        };
    }

    getExecutionPlan(serviceId) {
        const service = this.serviceManager.getService(serviceId);
        if (!service) throw new Error(`Unknown service: ${serviceId}`);

        const tasks = service.tasks.map((taskId) => this.taskManager.getTask(taskId));
        if (tasks.some((task) => !task)) {
            throw new Error(`Service plan contains missing task: ${serviceId}`);
        }

        return {
            success: true,
            service_id: serviceId,
            service_status: service.status,
            tasks,
            execution_ready: service.status === "READY"
        };
    }
}

module.exports = ServiceManagerIntegration;
