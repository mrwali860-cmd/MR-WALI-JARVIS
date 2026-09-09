"use strict";

class DashboardReadModel {
    constructor({ serviceManager, taskManager, qa } = {}) {
        if (!serviceManager) throw new Error("serviceManager is required");
        if (!taskManager) throw new Error("taskManager is required");
        this.serviceManager = serviceManager;
        this.taskManager = taskManager;
        this.qa = qa || null;
    }

    getServices() {
        const services = this.serviceManager.listServices();
        return { success: true, control_surface: "READ_ONLY", total: services.length, by_status: this.serviceManager.getSummary().by_status, items: services };
    }
    getTasks() {
        const tasks = this.taskManager.listTasks();
        const byStatus = {};
        for (const task of tasks) byStatus[task.status] = (byStatus[task.status] || 0) + 1;
        return { success: true, control_surface: "READ_ONLY", actions_mutable: false, total: tasks.length, by_status: byStatus, items: tasks };
    }
    getActivity() {
        const items = [];
        for (const task of this.taskManager.listTasks()) for (const entry of Array.isArray(task.audit) ? task.audit : []) items.push({ task_id: task.task_id, from: entry.from ?? null, to: entry.to, timestamp: entry.timestamp, reason: entry.reason ?? null, ...(entry.request_id ? { request_id: entry.request_id } : {}) });
        items.sort((a, b) => String(b.timestamp).localeCompare(String(a.timestamp)));
        return { success: true, control_surface: "READ_ONLY", actions_mutable: false, total: items.length, items };
    }
    getQA() {
        if (!this.qa) throw new Error("qa is required");
        return { success: true, control_surface: "READ_ONLY", actions_mutable: false, component: this.qa.getInfo(), health: this.qa.healthCheck() };
    }
    getStatus() {
        const services = this.serviceManager.listServices();
        const tasks = this.taskManager.listTasks();
        const byStatus = {};
        for (const task of tasks) byStatus[task.status] = (byStatus[task.status] || 0) + 1;
        const blockers = tasks.filter(task => ["BLOCKED", "FAILED", "WAITING", "WAITING_FOR_APPROVAL"].includes(task.status)).map(task => ({ task_id: task.task_id, status: task.status, reason: task.reason || null }));
        return { success: true, name: "MR WALI JARVIS", control_surface: "READ_ONLY", actions_mutable: false, services: { total: services.length, by_status: this.serviceManager.getSummary().by_status, items: services }, tasks: { total: tasks.length, by_status: byStatus, items: tasks }, blockers };
    }
}

module.exports = DashboardReadModel;
