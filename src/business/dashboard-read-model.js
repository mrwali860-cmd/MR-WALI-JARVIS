"use strict";

class DashboardReadModel {
    constructor({ serviceManager, taskManager } = {}) {
        if (!serviceManager) throw new Error("serviceManager is required");
        if (!taskManager) throw new Error("taskManager is required");
        this.serviceManager = serviceManager;
        this.taskManager = taskManager;
    }

    getStatus() {
        const services = this.serviceManager.listServices();
        const tasks = this.taskManager.listTasks();
        const byStatus = {};

        for (const task of tasks) {
            byStatus[task.status] = (byStatus[task.status] || 0) + 1;
        }

        const blockers = tasks
            .filter(task => ["BLOCKED", "FAILED", "WAITING", "WAITING_FOR_APPROVAL"].includes(task.status))
            .map(task => ({
                task_id: task.task_id,
                status: task.status,
                reason: task.reason || null
            }));

        return {
            success: true,
            name: "MR WALI JARVIS",
            control_surface: "READ_ONLY",
            actions_mutable: false,
            services: {
                total: services.length,
                by_status: this.serviceManager.getSummary().by_status,
                items: services
            },
            tasks: {
                total: tasks.length,
                by_status: byStatus,
                items: tasks
            },
            blockers
        };
    }
}

module.exports = DashboardReadModel;
