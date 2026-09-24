"use strict";

const ComponentContract = require("../../contracts/component-contract");

/**
 * Outcome Plan Executor V1.
 *
 * Bridges a planner-produced step to the existing Orchestrator.
 * It never executes an action string directly and never bypasses
 * the existing dependency / risk / approval / trace boundaries.
 */
class OutcomePlanExecutorV1 extends ComponentContract {
    constructor({ orchestrator } = {}) {
        super({
            id: "OUTCOME_PLAN_EXECUTOR_V1",
            name: "Outcome Plan Executor",
            version: "1.0.0",
            status: "AVAILABLE"
        });
        if (!orchestrator || typeof orchestrator.executeTask !== "function") {
            throw new Error("orchestrator is required");
        }
        this.orchestrator = orchestrator;
    }

    validatePlan(plan) {
        if (!plan || typeof plan !== "object") throw new Error("PLAN_REQUIRED");
        if (!plan.plan_id) throw new Error("PLAN_ID_REQUIRED");
        if (!plan.goal_id) throw new Error("PLAN_GOAL_ID_REQUIRED");
        if (!Array.isArray(plan.steps) || !plan.steps.length) throw new Error("PLAN_STEPS_REQUIRED");
    }

    resolveStep(step, mapping) {
        if (!step || typeof step !== "object") throw new Error("PLAN_STEP_REQUIRED");
        const action = String(step.action || "").trim();
        if (!action) throw new Error("PLAN_ACTION_REQUIRED");
        if (!mapping || typeof mapping !== "object") {
            return { supported: false, reason: "PLAN_STEP_UNSUPPORTED", action };
        }

        const serviceId = String(mapping.service_id || "").trim();
        const taskId = String(mapping.task_id || "").trim();
        const executionAction = String(mapping.action || "EXECUTE_TASK").trim();

        if (!serviceId || !taskId) {
            return { supported: false, reason: "PLAN_STEP_UNSUPPORTED", action };
        }

        return {
            supported: true,
            action,
            service_id: serviceId,
            task_id: taskId,
            execution_action: executionAction
        };
    }

    async executeStep({ plan, step, mapping, request_id, approval_context, input } = {}) {
        const resolved = this.resolveStep(step, mapping);
        if (!resolved.supported) {
            return {
                success: false,
                status: "UNSUPPORTED",
                reason: resolved.reason,
                plan_id: plan.plan_id,
                goal_id: plan.goal_id,
                step_id: step?.step_id || null,
                action: resolved.action
            };
        }

        const requestId = String(request_id || "").trim();
        if (!requestId) throw new Error("request_id is required");

        const result = await this.orchestrator.executeTask({
            request_id: requestId,
            service_id: resolved.service_id,
            task_id: resolved.task_id,
            action: resolved.execution_action,
            approval_context: approval_context || {},
            input: input || null
        });

        return {
            ...result,
            plan_id: plan.plan_id,
            goal_id: plan.goal_id,
            step_id: step.step_id,
            planned_action: step.action,
            resolved_action: resolved.execution_action
        };
    }

    async execute({ plan, step_mappings = {}, request_id, approval_context = {}, input_by_step = {} } = {}) {
        this.validatePlan(plan);
        const requestId = String(request_id || "").trim();
        if (!requestId) throw new Error("request_id is required");

        const results = [];
        for (const step of plan.steps) {
            const mapping = step_mappings[step.step_id] || step_mappings[step.action] || null;
            const result = await this.executeStep({
                plan,
                step,
                mapping,
                request_id: `${requestId}_${step.step_id}`,
                approval_context: approval_context[step.step_id] || approval_context[step.action] || {},
                input: input_by_step[step.step_id] || input_by_step[step.action] || null
            });
            results.push(result);

            // A plan cannot silently advance past a blocked, approval-gated,
            // denied, or unsupported step.
            if (["BLOCKED", "WAITING_FOR_APPROVAL", "FAILED", "UNSUPPORTED"].includes(result.status)) {
                return {
                    success: false,
                    status: result.status,
                    plan_id: plan.plan_id,
                    goal_id: plan.goal_id,
                    stopped_at_step: step.step_id,
                    results
                };
            }
        }

        return {
            success: true,
            status: "COMPLETED",
            plan_id: plan.plan_id,
            goal_id: plan.goal_id,
            results
        };
    }
}

module.exports = OutcomePlanExecutorV1;
