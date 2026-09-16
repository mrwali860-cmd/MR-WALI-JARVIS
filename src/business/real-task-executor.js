"use strict";

const ProspectDiscoveryLive = require("./prospect-discovery-live");

/**
 * Production Task Executor V1.
 *
 * The Orchestrator owns lifecycle/state. This adapter owns the mapping from a
 * canonical task action to a real external capability. Unsupported actions
 * fail closed; they are never silently simulated.
 */
class RealTaskExecutor {
    constructor({ prospectDiscovery, taskManager } = {}) {
        this.prospectDiscovery = prospectDiscovery || new ProspectDiscoveryLive({
            limit: 20,
            query: "real estate agency Dubai"
        });
        this.taskManager = taskManager || null;
    }

    async execute({ action, task, input = null }) {
        if (!task || !task.task_id) throw new Error("TASK_REQUIRED");

        switch (action) {
            case "LEAD_INTAKE": {
                const query = input?.query || task.data?.query || "real estate agency Dubai";
                const limit = input?.limit || task.data?.limit || 20;
                return this.prospectDiscovery.discover({ query, limit });
            }
            case "LEAD_QUALIFICATION": {
                const intakeTaskId = Array.isArray(task.dependencies) ? task.dependencies[0] : null;
                if (!intakeTaskId || !this.taskManager) {
                    throw new Error("LEAD_QUALIFICATION_REQUIRES_COMPLETED_LEAD_INTAKE");
                }
                const intakeTask = this.taskManager.getTask(intakeTaskId);
                if (!intakeTask || intakeTask.status !== "COMPLETED") {
                    throw new Error("LEAD_QUALIFICATION_REQUIRES_COMPLETED_LEAD_INTAKE");
                }
                const prospects = Array.isArray(intakeTask.result?.prospects) ? intakeTask.result.prospects : [];
                const requiredContact = input?.required_contact || task.data?.required_contact || "phone_or_website";
                const qualifiedLeads = prospects.filter((lead) => {
                    const hasName = Boolean(String(lead?.name || "").trim());
                    const hasPhone = Boolean(String(lead?.phone || "").trim());
                    const hasWebsite = Boolean(String(lead?.website || "").trim());
                    return hasName && (requiredContact === "phone" ? hasPhone : requiredContact === "website" ? hasWebsite : hasPhone || hasWebsite);
                });
                return {
                    executed: true,
                    status: "COMPLETE",
                    mode: "RULE_BASED",
                    total_evaluated: prospects.length,
                    qualified_count: qualifiedLeads.length,
                    unqualified_count: prospects.length - qualifiedLeads.length,
                    qualified_leads: qualifiedLeads.map((lead) => ({ ...lead, qualification_status: "QUALIFIED" })),
                    message: `Qualified ${qualifiedLeads.length} of ${prospects.length} leads using configured contact criteria.`
                };
            }
            case "APPOINTMENT_REQUEST": {
                const qualificationTaskId = Array.isArray(task.dependencies) ? task.dependencies[0] : null;
                if (!qualificationTaskId || !this.taskManager) {
                    throw new Error("APPOINTMENT_REQUEST_REQUIRES_COMPLETED_LEAD_QUALIFICATION");
                }
                const qualificationTask = this.taskManager.getTask(qualificationTaskId);
                if (!qualificationTask || qualificationTask.status !== "COMPLETED") {
                    throw new Error("APPOINTMENT_REQUEST_REQUIRES_COMPLETED_LEAD_QUALIFICATION");
                }
                const qualifiedLeads = Array.isArray(qualificationTask.result?.qualified_leads)
                    ? qualificationTask.result.qualified_leads
                    : [];
                const requestedDurationMinutes = Number(input?.duration_minutes || task.data?.duration_minutes || 30);
                const requestedTime = input?.requested_time || task.data?.requested_time || null;
                const requests = qualifiedLeads.map((lead) => ({
                    request_id: `appointment_request_${lead.id}`,
                    lead_id: lead.id,
                    lead_name: lead.name,
                    phone: lead.phone || "",
                    website: lead.website || "",
                    requested_duration_minutes: requestedDurationMinutes,
                    requested_time: requestedTime,
                    status: "PENDING_APPROVAL"
                }));
                return {
                    executed: true,
                    status: "COMPLETE",
                    mode: "REQUEST_PREPARATION",
                    source_task_id: qualificationTask.task_id,
                    request_count: requests.length,
                    appointment_requests: requests,
                    message: `Prepared ${requests.length} appointment request(s); booking remains approval-gated.`
                };
            }
            default:
                throw new Error(`UNSUPPORTED_REAL_TASK_ACTION: ${action}`);
        }
    }
}

module.exports = RealTaskExecutor;
