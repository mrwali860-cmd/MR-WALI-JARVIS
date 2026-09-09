"use strict";

const fs = require("fs");
const path = require("path");
const ComponentContract = require("../../contracts/component-contract");

class TaskManager extends ComponentContract {
    constructor(config = {}) {
        super({ id: "TASK_MANAGER", name: "Task Manager", version: "1.0.0", status: "AVAILABLE", ...config });
        this.storagePath = config.storagePath || path.join(__dirname, "../../data/tasks.json");
        this.tasks = new Map();
        this.allowedStatuses = new Set(["CREATED", "READY", "RUNNING", "WAITING", "BLOCKED", "WAITING_FOR_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"]);
        this.allowedTransitions = {
            CREATED: new Set(["READY", "BLOCKED", "WAITING_FOR_APPROVAL", "RUNNING", "FAILED", "CANCELLED"]),
            READY: new Set(["RUNNING", "BLOCKED", "WAITING_FOR_APPROVAL", "FAILED", "CANCELLED"]),
            RUNNING: new Set(["WAITING", "WAITING_FOR_APPROVAL", "COMPLETED", "FAILED", "CANCELLED"]),
            WAITING: new Set(["READY", "RUNNING", "FAILED", "CANCELLED"]),
            BLOCKED: new Set(["READY", "FAILED", "CANCELLED"]),
            WAITING_FOR_APPROVAL: new Set(["READY", "RUNNING", "FAILED", "CANCELLED"]),
            COMPLETED: new Set(), FAILED: new Set(), CANCELLED: new Set()
        };
        this.loadTasks();
    }

    loadTasks() {
        if (!fs.existsSync(this.storagePath)) return;
        try {
            const raw = fs.readFileSync(this.storagePath, "utf8");
            const tasks = raw.trim() ? JSON.parse(raw) : [];
            if (!Array.isArray(tasks)) throw new Error("Task storage must contain an array");
            this.tasks = new Map(tasks.map(task => [task.task_id, task]));
        } catch (error) {
            throw new Error(`Failed to load task storage: ${error.message}`);
        }
    }

    saveTasks() {
        fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
        const tempPath = `${this.storagePath}.tmp`;
        fs.writeFileSync(tempPath, JSON.stringify(this.listTasks(), null, 2), "utf8");
        fs.renameSync(tempPath, this.storagePath);
    }

    createTask(input = {}) {
        const taskId = input.task_id;
        if (!taskId) throw new Error("task_id is required");
        if (this.tasks.has(taskId)) throw new Error(`Task already exists: ${taskId}`);
        const now = new Date().toISOString();
        const task = {
            task_id: taskId, intent: input.intent || "", action: input.action || "", target: input.target || null,
            data: input.data || {}, priority: input.priority || "NORMAL", status: "CREATED",
            dependencies: Array.isArray(input.dependencies) ? [...new Set(input.dependencies)] : [],
            created_at: now, updated_at: now,
            audit: [{ from: null, to: "CREATED", timestamp: now, reason: "TASK_CREATED" }]
        };
        this.tasks.set(taskId, task);
        this.saveTasks();
        return task;
    }

    getTask(taskId) { return this.tasks.get(taskId) || null; }

    updateTaskStatus(taskId, status, metadata = {}) {
        const task = this.getTask(taskId);
        if (!task) throw new Error(`Unknown task: ${taskId}`);
        if (!this.allowedStatuses.has(status)) throw new Error(`Invalid task status: ${status}`);
        const previousStatus = task.status;
        if (previousStatus !== status && !this.allowedTransitions[previousStatus]?.has(status)) {
            throw new Error(`Invalid task transition: ${previousStatus} -> ${status}`);
        }
        const now = new Date().toISOString();
        task.status = status;
        Object.assign(task, metadata);
        task.updated_at = now;
        if (!Array.isArray(task.audit)) task.audit = [];
        if (previousStatus !== status) task.audit.push({
            from: previousStatus,
            to: status,
            timestamp: now,
            reason: metadata.reason || metadata.request_id || null,
            ...(metadata.request_id ? { request_id: metadata.request_id } : {})
        });
        this.saveTasks();
        return task;
    }

    addDependency(taskId, dependencyId) {
        const task = this.getTask(taskId);
        if (!task) throw new Error(`Unknown task: ${taskId}`);
        if (!this.getTask(dependencyId)) throw new Error(`Unknown dependency: ${dependencyId}`);
        if (taskId === dependencyId) throw new Error("Task cannot depend on itself");
        if (!task.dependencies.includes(dependencyId)) task.dependencies.push(dependencyId);
        task.updated_at = new Date().toISOString();
        this.saveTasks();
        return task;
    }

    areDependenciesComplete(taskId) {
        const task = this.getTask(taskId);
        if (!task) throw new Error(`Unknown task: ${taskId}`);
        return task.dependencies.every(id => this.getTask(id)?.status === "COMPLETED");
    }

    markReady(taskId) {
        if (!this.areDependenciesComplete(taskId)) return this.updateTaskStatus(taskId, "BLOCKED", { reason: "DEPENDENCIES_NOT_COMPLETE" });
        return this.updateTaskStatus(taskId, "READY");
    }

    listTasks() { return Array.from(this.tasks.values()); }
    cancelTask(taskId, reason = null) { return this.updateTaskStatus(taskId, "CANCELLED", { reason }); }
    completeTask(taskId, result = null) { return this.updateTaskStatus(taskId, "COMPLETED", { result }); }
    failTask(taskId, error = null) { return this.updateTaskStatus(taskId, "FAILED", { error: error ? String(error) : null }); }

    getSummary() {
        const byStatus = {};
        for (const task of this.listTasks()) byStatus[task.status] = (byStatus[task.status] || 0) + 1;
        return { total: this.tasks.size, by_status: byStatus };
    }

    execute(input = {}) {
        switch (input.action) {
            case "CREATE_TASK": return { success: true, task: this.createTask(input) };
            case "GET_TASK": return { success: true, task: this.getTask(input.task_id) };
            case "UPDATE_TASK_STATUS": return { success: true, task: this.updateTaskStatus(input.task_id, input.status, input.metadata) };
            case "ADD_TASK_DEPENDENCY": return { success: true, task: this.addDependency(input.task_id, input.dependency_id) };
            case "MARK_READY": return { success: true, task: this.markReady(input.task_id) };
            case "COMPLETE_TASK": return { success: true, task: this.completeTask(input.task_id, input.result) };
            case "FAIL_TASK": return { success: true, task: this.failTask(input.task_id, input.error) };
            case "CANCEL_TASK": return { success: true, task: this.cancelTask(input.task_id, input.reason) };
            case "LIST_TASKS": return { success: true, tasks: this.listTasks() };
            case "GET_SUMMARY": return { success: true, ...this.getSummary() };
            default: throw new Error(`Unknown task action: ${input.action}`);
        }
    }
}

module.exports = TaskManager;
