"use strict";

const ComponentContract = require("../../contracts/component-contract");

class TaskManager extends ComponentContract {
    constructor(config = {}) {
        super({
            id: "TASK_MANAGER",
            name: "Task Manager",
            version: "1.0.0",
            status: "AVAILABLE",
            ...config
        });

        this.tasks = new Map();
        this.allowedStatuses = new Set([
            "CREATED",
            "READY",
            "RUNNING",
            "WAITING",
            "BLOCKED",
            "WAITING_FOR_APPROVAL",
            "COMPLETED",
            "FAILED",
            "CANCELLED"
        ]);
    }

    createTask(input = {}) {
        const taskId = input.task_id;
        if (!taskId) throw new Error("task_id is required");
        if (this.tasks.has(taskId)) throw new Error(`Task already exists: ${taskId}`);

        const task = {
            task_id: taskId,
            intent: input.intent || "",
            action: input.action || "",
            target: input.target || null,
            data: input.data || {},
            priority: input.priority || "NORMAL",
            status: "CREATED",
            dependencies: Array.isArray(input.dependencies) ? [...new Set(input.dependencies)] : [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.tasks.set(taskId, task);
        return task;
    }

    getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }

    updateTaskStatus(taskId, status, metadata = {}) {
        const task = this.getTask(taskId);
        if (!task) throw new Error(`Unknown task: ${taskId}`);
        if (!this.allowedStatuses.has(status)) throw new Error(`Invalid task status: ${status}`);

        task.status = status;
        Object.assign(task, metadata);
        task.updated_at = new Date().toISOString();
        return task;
    }

    addDependency(taskId, dependencyId) {
        const task = this.getTask(taskId);
        if (!task) throw new Error(`Unknown task: ${taskId}`);
        if (!this.getTask(dependencyId)) throw new Error(`Unknown dependency: ${dependencyId}`);
        if (!task.dependencies.includes(dependencyId)) task.dependencies.push(dependencyId);
        task.updated_at = new Date().toISOString();
        return task;
    }

    areDependenciesComplete(taskId) {
        const task = this.getTask(taskId);
        if (!task) throw new Error(`Unknown task: ${taskId}`);
        return task.dependencies.every((id) => this.getTask(id)?.status === "COMPLETED");
    }

    markReady(taskId) {
        if (!this.areDependenciesComplete(taskId)) {
            return this.updateTaskStatus(taskId, "BLOCKED");
        }
        return this.updateTaskStatus(taskId, "READY");
    }

    listTasks() {
        return Array.from(this.tasks.values());
    }

    cancelTask(taskId, reason = null) {
        return this.updateTaskStatus(taskId, "CANCELLED", { reason });
    }

    completeTask(taskId, result = null) {
        return this.updateTaskStatus(taskId, "COMPLETED", { result });
    }

    failTask(taskId, error = null) {
        return this.updateTaskStatus(taskId, "FAILED", { error: error ? String(error) : null });
    }

    getSummary() {
        const tasks = this.listTasks();
        const byStatus = {};
        for (const task of tasks) byStatus[task.status] = (byStatus[task.status] || 0) + 1;
        return { total: tasks.length, by_status: byStatus };
    }

    execute(input = {}) {
        const action = input.action;
        switch (action) {
            case "CREATE_TASK":
                return { success: true, task: this.createTask(input) };
            case "GET_TASK":
                return { success: true, task: this.getTask(input.task_id) };
            case "UPDATE_TASK_STATUS":
                return { success: true, task: this.updateTaskStatus(input.task_id, input.status, input.metadata) };
            case "ADD_TASK_DEPENDENCY":
                return { success: true, task: this.addDependency(input.task_id, input.dependency_id) };
            case "MARK_READY":
                return { success: true, task: this.markReady(input.task_id) };
            case "COMPLETE_TASK":
                return { success: true, task: this.completeTask(input.task_id, input.result) };
            case "FAIL_TASK":
                return { success: true, task: this.failTask(input.task_id, input.error) };
            case "CANCEL_TASK":
                return { success: true, task: this.cancelTask(input.task_id, input.reason) };
            case "LIST_TASKS":
                return { success: true, tasks: this.listTasks() };
            case "GET_SUMMARY":
                return { success: true, ...this.getSummary() };
            default:
                throw new Error(`Unknown task action: ${action}`);
        }
    }
}

module.exports = TaskManager;
