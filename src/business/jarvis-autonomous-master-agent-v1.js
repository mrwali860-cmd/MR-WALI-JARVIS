"use strict";

const ComponentContract = require("../../contracts/component-contract");
const ServiceManager = require("./service-manager");
const TaskManager = require("./task-manager");
const ServiceManagerIntegration = require("./service-manager-integration");
const Orchestrator = require("./orchestrator");
const RealTaskExecutor = require("./real-task-executor");

/**
 * JARVIS Autonomous Master Agent V1.
 *
 * Converts a business goal into an execution plan, runs the existing
 * TaskManager -> Orchestrator -> RealTaskExecutor pipeline, stops at policy
 * approval gates, performs bounded recovery, and returns evidence.
 *
 * V1 deliberately uses deterministic planning. Model-based planning can be
 * added behind the same contract later without changing execution ownership.
 */
class JarvisAutonomousMasterAgentV1 extends ComponentContract {
    constructor({ serviceManager, taskManager, orchestrator, executor, serviceIntegration, maxRetries = 3 } = {}) {
        super({ id: "JARVIS_AUTONOMOUS_MASTER_AGENT_V1", name: "JARVIS Autonomous Master Agent", version: "1.0.0", status: "AVAILABLE" });
        this.serviceManager = serviceManager || new ServiceManager();
        this.taskManager = taskManager || new TaskManager();
        this.executor = executor || new RealTaskExecutor({ taskManager: this.taskManager });
        this.orchestrator = orchestrator || new Orchestrator({
            serviceManager: this.serviceManager,
            taskManager: this.taskManager,
            executor: this.executor
        });
        this.serviceIntegration = serviceIntegration || new ServiceManagerIntegration({
            serviceManager: this.serviceManager,
            taskManager: this.taskManager
        });
        this.maxRetries = Number.isInteger(maxRetries) && maxRetries >= 0 ? maxRetries : 3;
        this.runs = new Map();
    }

    createPlan(input = {}) {
        const goal = String(input.goal || "").trim();
        if (!goal) throw new Error("GOAL_REQUIRED");

        const servicePlan = this.serviceIntegration.createServicePlan({
            service_id: input.service_id,
            client: input.client || "INTERNAL",
            requirement: input.requirement || goal,
            revenue_amount: input.revenue_amount,
            currency: input.currency
        });

        return {
            plan_id: `PLAN_${Date.now()}`,
            goal,
            service_id: servicePlan.service_id,
            task_ids: servicePlan.task_ids,
            task_count: servicePlan.task_count,
            approval_gates: servicePlan.approval_gates,
            execution_ready: servicePlan.execution_ready
        };
    }

    async executeGoal(input = {}) {
        const plan = input.plan || this.createPlan(input);
        const requestPrefix = input.request_id || `JARVIS_${Date.now()}`;
        const approvalContext = input.approval_context || {};
        const taskInput = input.task_input || {};
        const results = [];
        const recovery = [];
        const startedAt = Date.now();

        for (const taskId of plan.task_ids) {
            const task = this.taskManager.getTask(taskId);
            if (!task) throw new Error(`PLAN_TASK_MISSING: ${taskId}`);

            if (!this.taskManager.areDependenciesComplete(taskId)) {
                this.taskManager.markReady(taskId);
                const refreshed = this.taskManager.getTask(taskId);
                if (refreshed.status === "BLOCKED") {
                    return this.finishRun(plan, requestPrefix, results, recovery, "BLOCKED", "DEPENDENCIES_NOT_COMPLETE", startedAt);
                }
            }

            let attempt = 0;
            let result;
            while (attempt <= this.maxRetries) {
                attempt += 1;
                result = await this.orchestrator.executeTask({
                    service_id: plan.service_id,
                    task_id: taskId,
                    action: "EXECUTE_TASK",
                    request_id: `${requestPrefix}_${String(taskId).replace(/[^A-Za-z0-9_-]/g, "_")}_${attempt}`,
                    approval_context: approvalContext,
                    input: taskInput[task.action] || taskInput[taskId] || null
                });

                if (result.status !== "FAILED") break;

                if (attempt <= this.maxRetries) {
                    this.taskManager.retryTask(taskId, {
                        reason: "AUTONOMOUS_BOUNDED_RETRY",
                        attempt,
                        error: result.error || result.reason || "UNKNOWN_FAILURE"
                    });
                    recovery.push({ task_id: taskId, attempt, action: "RETRY" });
                }
            }

            results.push({ task_id: taskId, action: task.action, attempts: attempt, status: result.status, result: result.result || null, error: result.error || null });

            if (result.status === "WAITING_FOR_APPROVAL") {
                return this.finishRun(plan, requestPrefix, results, recovery, "WAITING_FOR_APPROVAL", result.reason, startedAt);
            }
            if (result.status !== "COMPLETED") {
                return this.finishRun(plan, requestPrefix, results, recovery, "FAILED", result.error || result.reason || "TASK_FAILED", startedAt);
            }
        }

        return this.finishRun(plan, requestPrefix, results, recovery, "COMPLETED", null, startedAt);
    }

    finishRun(plan, requestId, results, recovery, status, reason, startedAt) {
        const report = {
            success: status === "COMPLETED",
            status,
            reason,
            plan,
            request_id: requestId,
            completed_tasks: results.filter((item) => item.status === "COMPLETED").length,
            total_tasks: plan.task_count,
            results,
            recovery,
            duration_ms: Date.now() - startedAt,
            evidence: results.map((item) => ({ task_id: item.task_id, action: item.action, status: item.status, attempts: item.attempts }))
        };
        this.runs.set(requestId, report);
        return report;
    }

    getRun(requestId) {
        return this.runs.get(requestId) || null;
    }
}

module.exports = JarvisAutonomousMasterAgentV1;
