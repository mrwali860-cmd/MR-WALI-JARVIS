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
 * Turns a business goal into an execution plan, executes canonical task
 * actions through the existing Orchestrator, stops at approval gates, and
 * performs bounded recovery. Execution ownership stays in Orchestrator.
 *
 * V1.1 adds in-process pause/resume: completed tasks are skipped on resume
 * and an approval-paused run continues from the first incomplete task.
 */
class JarvisAutonomousMasterAgentV1 extends ComponentContract {
    constructor({ serviceManager, taskManager, orchestrator, executor, serviceIntegration, intelligenceProvider, maxRetries = 3 } = {}) {
        super({ id: "JARVIS_AUTONOMOUS_MASTER_AGENT_V1", name: "JARVIS Autonomous Master Agent", version: "1.1.0", status: "AVAILABLE" });
        this.serviceManager = serviceManager || new ServiceManager();
        this.taskManager = taskManager || new TaskManager();
        this.executor = executor || new RealTaskExecutor({ taskManager: this.taskManager });
        this.orchestrator = orchestrator || new Orchestrator({ serviceManager: this.serviceManager, taskManager: this.taskManager, executor: this.executor });
        this.serviceIntegration = serviceIntegration || new ServiceManagerIntegration({ serviceManager: this.serviceManager, taskManager: this.taskManager });
        this.intelligenceProvider = intelligenceProvider || null;
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

            if (task.status === "COMPLETED") {
                results.push({
                    task_id: taskId,
                    action: task.action,
                    attempts: 0,
                    status: "COMPLETED",
                    result: task.result || null,
                    error: null,
                    resumed: true
                });
                continue;
            }

            if (!this.taskManager.areDependenciesComplete(taskId)) {
                this.taskManager.markReady(taskId);
                const refreshed = this.taskManager.getTask(taskId);
                if (refreshed.status === "BLOCKED") {
                    return this.finishRun(plan, requestPrefix, results, recovery, "BLOCKED", "DEPENDENCIES_NOT_COMPLETE", startedAt);
                }
            } else if (task.status === "CREATED") {
                this.taskManager.markReady(taskId);
            }

            let attempt = 0;
            let result;
            while (attempt <= this.maxRetries) {
                attempt += 1;
                const currentTask = this.taskManager.getTask(taskId);
                result = await this.orchestrator.executeTask({
                    service_id: plan.service_id,
                    task_id: taskId,
                    action: currentTask.action,
                    request_id: `${requestPrefix}_${String(taskId).replace(/[^A-Za-z0-9_-]/g, "_")}_${attempt}`,
                    approval_context: approvalContext,
                    input: taskInput[currentTask.action] || taskInput[taskId] || null
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

            results.push({
                task_id: taskId,
                action: task.action,
                attempts: attempt,
                status: result.status,
                result: result.result || null,
                error: result.error || null
            });

            if (result.status === "WAITING_FOR_APPROVAL") {
                return this.finishRun(plan, requestPrefix, results, recovery, "WAITING_FOR_APPROVAL", result.reason, startedAt);
            }
            if (result.status !== "COMPLETED") {
                return this.finishRun(plan, requestPrefix, results, recovery, "FAILED", result.error || result.reason || "TASK_FAILED", startedAt);
            }
        }

        return this.finishRun(plan, requestPrefix, results, recovery, "COMPLETED", null, startedAt);
    }

    async resumeRun(requestId, input = {}) {
        const previous = this.getRun(requestId);
        if (!previous) throw new Error("RUN_NOT_FOUND");
        if (previous.status !== "WAITING_FOR_APPROVAL") throw new Error("RUN_NOT_RESUMABLE");

        return this.executeGoal({
            plan: previous.plan,
            request_id: requestId,
            approval_context: input.approval_context || {},
            task_input: input.task_input || {}
        });
    }

    async createIntelligentPlan(input = {}) {
        if (!this.intelligenceProvider) throw new Error("INTELLIGENCE_PROVIDER_REQUIRED");
        const basePlan = this.createPlan(input);
        const availableActions = basePlan.task_ids.map((taskId) => this.taskManager.getTask(taskId)?.action).filter(Boolean);
        const intelligencePlan = await this.intelligenceProvider.plan({ goal: input.goal, context: input.context || {}, constraints: input.constraints || {}, available_actions: availableActions });
        const allowed = new Set(availableActions);
        const taskByAction = new Map(
            basePlan.task_ids.map((taskId) => [this.taskManager.getTask(taskId)?.action, taskId])
        );
        const intelligentTaskIds = [];
        for (const step of intelligencePlan.steps) {
            if (!allowed.has(step.action)) throw new Error(`INTELLIGENCE_ACTION_NOT_ALLOWED: ${step.action}`);
            const taskId = taskByAction.get(step.action);
            if (!taskId) throw new Error(`INTELLIGENCE_TASK_NOT_FOUND: ${step.action}`);
            if (!intelligentTaskIds.includes(taskId)) intelligentTaskIds.push(taskId);
        }

        // Preserve the planner's ordering while retaining any mandatory tasks
        // that the service plan contains but the model did not mention.
        const orderedTaskIds = [
            ...intelligentTaskIds,
            ...basePlan.task_ids.filter((taskId) => !intelligentTaskIds.includes(taskId))
        ];

        return { ...basePlan, task_ids: orderedTaskIds, intelligence: intelligencePlan };
    }

    async executeIntelligentGoal(input = {}) {
        const plan = input.plan || await this.createIntelligentPlan(input);
        return this.executeGoal({ ...input, plan });
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

    getRun(requestId) { return this.runs.get(requestId) || null; }
}

module.exports = JarvisAutonomousMasterAgentV1;
