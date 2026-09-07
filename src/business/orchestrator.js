"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * JARVIS Orchestrator Execution Contract V1
 *
 * Coordinates task execution without owning service data or bypassing
 * risk/approval controls. External providers are injected through executor.
 */
class Orchestrator extends ComponentContract {
    constructor({ serviceManager, taskManager, executor } = {}) {
        super({
            id: "ORCHESTRATOR",
            name: "JARVIS Orchestrator",
            version: "1.0.0",
            status: "AVAILABLE"
        });

        if (!serviceManager) throw new Error("serviceManager is required");
        if (!taskManager) throw new Error("taskManager is required");

        this.serviceManager = serviceManager;
        this.taskManager = taskManager;
        this.executor = executor || (async ({ action, task_id }) => ({
            simulated: true,
            action,
            task_id
        }));

        this.approvalRequiredActions = new Set([
            "BOOKING_EXECUTION",
            "EXTERNAL_MESSAGE_SEND",
            "PAYMENT_OR_MONEY_MOVEMENT",
            "DATA_DELETION"
        ]);
    }

    getTaskOrThrow(taskId) {
        const task = this.taskManager.getTask(taskId);
        if (!task) throw new Error(`Unknown task: ${taskId}`);
        return task;
    }

    validateRequest(input = {}) {
        const { service_id: serviceId, task_id: taskId, action, request_id: requestId } = input;
        if (!serviceId) throw new Error("service_id is required");
        if (!taskId) throw new Error("task_id is required");
        if (!action) throw new Error("action is required");
        if (!requestId) throw new Error("request_id is required");

        const service = this.serviceManager.getService(serviceId);
        if (!service) throw new Error(`Unknown service: ${serviceId}`);

        const task = this.getTaskOrThrow(taskId);
        if (!service.tasks.includes(taskId)) {
            throw new Error(`Task does not belong to service: ${taskId}`);
        }
        if (task.action !== action) {
            throw new Error(`Action mismatch for task ${taskId}: expected ${task.action}`);
        }

        return { service, task };
    }

    requiresApproval(task, approvalContext = {}) {
        return this.approvalRequiredActions.has(task.action) ||
            task.action === "APPOINTMENT_REQUEST" && approvalContext.require_appointment_approval === true;
    }

    isApproved(approvalContext = {}) {
        return approvalContext.approved === true || approvalContext.status === "APPROVED";
    }

    async executeTask(input = {}) {
        const { service, task } = this.validateRequest(input);
        const approvalContext = input.approval_context || {};

        if (!this.taskManager.areDependenciesComplete(task.task_id)) {
            this.taskManager.updateTaskStatus(task.task_id, "BLOCKED", {
                blocked_reason: "DEPENDENCIES_NOT_COMPLETE",
                request_id: input.request_id
            });
            return {
                success: false,
                status: "BLOCKED",
                reason: "DEPENDENCIES_NOT_COMPLETE",
                task_id: task.task_id
            };
        }

        if (this.requiresApproval(task, approvalContext) && !this.isApproved(approvalContext)) {
            this.taskManager.updateTaskStatus(task.task_id, "WAITING_FOR_APPROVAL", {
                approval_reason: "APPROVAL_REQUIRED",
                request_id: input.request_id
            });
            return {
                success: false,
                status: "WAITING_FOR_APPROVAL",
                reason: "APPROVAL_REQUIRED",
                task_id: task.task_id
            };
        }

        this.taskManager.updateTaskStatus(task.task_id, "RUNNING", {
            request_id: input.request_id,
            started_at: new Date().toISOString()
        });

        try {
            const result = await this.executor({
                service,
                task,
                action: input.action,
                request_id: input.request_id,
                approval_context: approvalContext,
                input: input.input || null
            });

            this.taskManager.completeTask(task.task_id, result);
            const completedTask = this.taskManager.getTask(task.task_id);

            return {
                success: true,
                status: "COMPLETED",
                task: completedTask,
                result
            };
        } catch (error) {
            this.taskManager.failTask(task.task_id, error.message || error);
            return {
                success: false,
                status: "FAILED",
                task: this.taskManager.getTask(task.task_id),
                error: error.message || String(error)
            };
        }
    }

    async execute(input = {}) {
        return this.executeTask(input);
    }
}

module.exports = Orchestrator;
