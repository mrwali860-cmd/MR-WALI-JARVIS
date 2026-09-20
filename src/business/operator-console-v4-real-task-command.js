"use strict";

const crypto = require("crypto");

/**
 * Operator Console V4 task-command adapter.
 *
 * This component only resolves an explicit service/task target and delegates
 * execution to the existing Orchestrator. It owns no task state and performs
 * no external execution itself.
 */
class OperatorConsoleV4TaskCommand {
    constructor({ orchestrator } = {}) {
        if (!orchestrator) throw new Error("orchestrator is required");
        this.orchestrator = orchestrator;
    }

    resolveTarget(target) {
        if (!target) return null;
        if (!this.orchestrator.serviceManager || !this.orchestrator.taskManager) return target;
        const service = this.orchestrator.serviceManager.getService(target.service_id);
        if (!service) return target;
        const exact = this.orchestrator.taskManager.getTask(target.task_id);
        if (exact) return target;
        const normalized = String(target.task_id).toUpperCase();
        const resolvedTaskId = service.tasks.find((taskId) => {
            const task = this.orchestrator.taskManager.getTask(taskId);
            return task && String(task.action).toUpperCase() === normalized;
        });
        return resolvedTaskId ? { ...target, task_id: resolvedTaskId } : target;
    }

    parse(message = "") {
        const text = String(message).trim();
        const match = text.match(/^(?:execute|run)\s+task\s+(\S+)\s+(\S+)$/i);
        if (!match) return null;
        return { service_id: match[1], task_id: match[2] };
    }

    isTaskCommand(message = "") {
        return /^(?:execute|run)\s+task\b/i.test(String(message).trim());
    }

    async execute(message, { approval_context = {}, input = null } = {}) {
        const target = this.parse(message);
        if (!target) {
            return {
                handled: true,
                success: false,
                status: "CLARIFICATION_REQUIRED",
                message: "Please specify the task as: execute task <service_id> <task_id>"
            };
        }

        const request_id = `v4-${crypto.randomUUID()}`;
        const resolvedTarget = this.resolveTarget(target);
        try {
            const result = await this.orchestrator.executeTask({
                ...resolvedTarget,
                action: "EXECUTE_TASK",
                request_id,
                approval_context,
                input
            });
            return {
                handled: true,
                success: result.success,
                status: result.status,
                request_id,
                message: result.success
                    ? `Task ${resolvedTarget.task_id} completed successfully.`
                    : `Task ${resolvedTarget.task_id}: ${result.status}${result.reason ? ` — ${result.reason}` : ""}`,
                result
            };
        } catch (error) {
            return {
                handled: true,
                success: false,
                status: "FAILED",
                request_id,
                message: error.message,
                error: error.message
            };
        }
    }
}

module.exports = OperatorConsoleV4TaskCommand;
