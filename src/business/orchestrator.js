"use strict";

const ComponentContract = require("../../contracts/component-contract");
const RiskApprovalPolicy = require("./risk-approval-policy");
const ExecutionTrace = require("./execution-trace");

/**
 * JARVIS Orchestrator Execution Contract V1
 *
 * Coordinates task execution without owning service data or bypassing
 * the central risk/approval policy. External providers are injected.
 */
class Orchestrator extends ComponentContract {
    constructor({ serviceManager, taskManager, executor, riskPolicy } = {}) {
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
        this.riskPolicy = riskPolicy || new RiskApprovalPolicy();
        this.executor = executor || (async ({ action, task_id }) => ({
            simulated: true,
            action,
            task_id
        }));
        this.executionTraces = new Map();
    }

    getTaskOrThrow(taskId) {
        const task = this.taskManager.getTask(taskId);
        if (!task) throw new Error(`Unknown task: ${taskId}`);
        return task;
    }

    getExecutionTrace(requestId) {
        const trace = this.executionTraces.get(requestId);
        return trace ? trace.toJSON() : null;
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

    createTrace(input) {
        const trace = new ExecutionTrace({
            request_id: input.request_id,
            service_id: input.service_id,
            task_id: input.task_id,
            action: input.action,
            registry: new Map(this.executionTraces)
        });
        this.executionTraces.set(input.request_id, trace);
        return trace;
    }

    async executeTask(input = {}) {
        const { service, task } = this.validateRequest(input);
        const trace = this.createTrace(input);
        const approvalContext = input.approval_context || {};

        if (!this.taskManager.areDependenciesComplete(task.task_id)) {
            this.taskManager.updateTaskStatus(task.task_id, "BLOCKED", {
                blocked_reason: "DEPENDENCIES_NOT_COMPLETE",
                request_id: input.request_id
            });
            trace.record("BLOCKED", { reason: "DEPENDENCIES_NOT_COMPLETE" });
            return {
                success: false,
                status: "BLOCKED",
                reason: "DEPENDENCIES_NOT_COMPLETE",
                task_id: task.task_id,
                trace: trace.toJSON()
            };
        }

        const policyDecision = this.riskPolicy.evaluate({
            action: task.action,
            approval_context: approvalContext
        });

        if (policyDecision.decision === "WAIT") {
            this.taskManager.updateTaskStatus(task.task_id, "WAITING_FOR_APPROVAL", {
                approval_reason: policyDecision.reason,
                request_id: input.request_id
            });
            trace.record("WAITING_FOR_APPROVAL", {
                reason: policyDecision.reason,
                policy_decision: policyDecision
            });
            return {
                success: false,
                status: "WAITING_FOR_APPROVAL",
                reason: policyDecision.reason,
                task_id: task.task_id,
                policy: policyDecision,
                trace: trace.toJSON()
            };
        }

        if (policyDecision.decision === "DENY") {
            this.taskManager.updateTaskStatus(task.task_id, "FAILED", {
                blocked_reason: policyDecision.reason,
                request_id: input.request_id
            });
            trace.record("FAILED", {
                reason: policyDecision.reason,
                policy_decision: policyDecision
            });
            return {
                success: false,
                status: "FAILED",
                reason: policyDecision.reason,
                task_id: task.task_id,
                policy: policyDecision,
                trace: trace.toJSON()
            };
        }

        this.taskManager.updateTaskStatus(task.task_id, "RUNNING", {
            request_id: input.request_id,
            started_at: new Date().toISOString()
        });
        trace.record("RUNNING");

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
            trace.record("COMPLETED", { result });

            return {
                success: true,
                status: "COMPLETED",
                task: completedTask,
                result,
                policy: policyDecision,
                trace: trace.toJSON()
            };
        } catch (error) {
            this.taskManager.failTask(task.task_id, error.message || error);
            trace.record("FAILED", { error: error.message || String(error) });
            return {
                success: false,
                status: "FAILED",
                task: this.taskManager.getTask(task.task_id),
                error: error.message || String(error),
                trace: trace.toJSON()
            };
        }
    }

    async execute(input = {}) {
        return this.executeTask(input);
    }
}

module.exports = Orchestrator;
