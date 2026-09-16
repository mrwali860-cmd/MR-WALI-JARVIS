"use strict";

const ProspectDiscoveryLive = require("./prospect-discovery-live");
const CalendarBookingProviderAdapterV1 = require("./calendar-booking-provider-adapter-v1");
const QualityAssurance = require("./qa");
const ClientApproval = require("./client-approval");
const Delivery = require("./delivery");
const Revenue = require("./revenue");

/**
 * Production Task Executor V2.
 *
 * The Orchestrator owns lifecycle/state. This adapter maps canonical task
 * actions to deterministic capabilities. Unsupported actions fail closed;
 * external booking is delegated to the provider-neutral calendar boundary.
 */
class RealTaskExecutor {
    constructor({ prospectDiscovery, taskManager, calendarBookingProvider, calendarProvider, calendarPerform, qa, clientApproval, delivery, revenue } = {}) {
        this.prospectDiscovery = prospectDiscovery || new ProspectDiscoveryLive({
            limit: 20,
            query: "real estate agency Dubai"
        });
        this.taskManager = taskManager || null;
        this.calendarBookingProvider = calendarBookingProvider || (
            calendarProvider
                ? new CalendarBookingProviderAdapterV1({ provider: calendarProvider, perform: calendarPerform })
                : null
        );
        this.qa = qa || new QualityAssurance();
        this.clientApproval = clientApproval || new ClientApproval();
        this.delivery = delivery || new Delivery();
        this.revenue = revenue || new Revenue();
    }

    getDependencyTask(task, errorCode) {
        const dependencyId = Array.isArray(task.dependencies) ? task.dependencies[0] : null;
        if (!dependencyId || !this.taskManager) throw new Error(errorCode);
        const dependency = this.taskManager.getTask(dependencyId);
        if (!dependency || dependency.status !== "COMPLETED") throw new Error(errorCode);
        return dependency;
    }

    async execute({ action, task, request_id: requestId, approval_context: approvalContext = {}, input = null }) {
        if (!task || !task.task_id) throw new Error("TASK_REQUIRED");

        switch (action) {
            case "LEAD_INTAKE": {
                const query = input?.query || task.data?.query || "real estate agency Dubai";
                const limit = input?.limit || task.data?.limit || 20;
                return this.prospectDiscovery.discover({ query, limit });
            }
            case "LEAD_QUALIFICATION": {
                const intakeTask = this.getDependencyTask(task, "LEAD_QUALIFICATION_REQUIRES_COMPLETED_LEAD_INTAKE");
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
                const qualificationTask = this.getDependencyTask(task, "APPOINTMENT_REQUEST_REQUIRES_COMPLETED_LEAD_QUALIFICATION");
                const qualifiedLeads = Array.isArray(qualificationTask.result?.qualified_leads) ? qualificationTask.result.qualified_leads : [];
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
            case "APPROVAL_GATE": {
                const appointmentTask = this.getDependencyTask(task, "APPROVAL_GATE_REQUIRES_COMPLETED_APPOINTMENT_REQUEST");
                return {
                    executed: true,
                    status: "COMPLETE",
                    decision: approvalContext.approved === true || approvalContext.status === "APPROVED" ? "APPROVED" : "PENDING_APPROVAL",
                    source_task_id: appointmentTask.task_id,
                    appointment_requests: appointmentTask.result?.appointment_requests || [],
                    message: "Booking authorization evaluated; external booking remains approval-gated."
                };
            }
            case "BOOKING_EXECUTION": {
                if (!this.calendarBookingProvider) throw new Error("CALENDAR_PROVIDER_NOT_CONFIGURED");
                const approvalTask = this.getDependencyTask(task, "BOOKING_EXECUTION_REQUIRES_COMPLETED_APPROVAL_GATE");
                if (!(approvalContext.approved === true || approvalContext.status === "APPROVED")) {
                    throw new Error("BOOKING_EXECUTION_APPROVAL_REQUIRED");
                }
                const request = input || approvalTask.result?.appointment_requests?.[0];
                if (!request) throw new Error("BOOKING_REQUEST_REQUIRED");
                return await this.calendarBookingProvider.execute({
                    request_id: requestId,
                    service_id: task.target?.service_id || task.data?.service_id || "",
                    task_id: task.task_id,
                    action,
                    input: {
                        lead_id: request.lead_id,
                        requested_time: request.requested_time,
                        duration_minutes: request.requested_duration_minutes
                    }
                });
            }
            case "CRM_RECORD": {
                const bookingTask = this.getDependencyTask(task, "CRM_RECORD_REQUIRES_COMPLETED_BOOKING");
                const booking = bookingTask.result || {};
                return {
                    executed: true,
                    status: "COMPLETE",
                    mode: "INTERNAL_CRM_RECORD",
                    crm_record: {
                        record_id: `crm_${bookingTask.task_id}`,
                        booking_task_id: bookingTask.task_id,
                        booking: booking,
                        recorded_at: new Date().toISOString()
                    }
                };
            }
            case "QA": {
                const crmTask = this.getDependencyTask(task, "QA_REQUIRES_COMPLETED_CRM_RECORD");
                const actualOutput = crmTask.result?.crm_record || crmTask.result;
                return this.qa.execute({
                    action: "EVALUATE",
                    service_id: task.data?.service_id || task.target?.service_id || "",
                    task_id: task.task_id,
                    request_id: requestId,
                    expected_output: input?.expected_output || task.data?.expected_output || { crm_recorded: true },
                    actual_output: actualOutput,
                    acceptance_criteria: input?.acceptance_criteria || task.data?.acceptance_criteria || [{ name: "crm-recorded", passed: Boolean(actualOutput) }],
                    execution_status: "COMPLETED"
                });
            }
            case "CLIENT_APPROVAL": {
                const qaTask = this.getDependencyTask(task, "CLIENT_APPROVAL_REQUIRES_COMPLETED_QA");
                return this.clientApproval.execute({
                    action: "DECIDE",
                    service_id: task.data?.service_id || task.target?.service_id || "",
                    request_id: requestId,
                    qa_decision: qaTask.result?.decision || "PENDING",
                    approval_context: input?.approval_context || approvalContext
                });
            }
            case "DELIVERY": {
                const approvalTask = this.getDependencyTask(task, "DELIVERY_REQUIRES_COMPLETED_CLIENT_APPROVAL");
                const qaTask = this.taskManager.getTask(approvalTask.dependencies?.[0]);
                return this.delivery.execute({
                    action: "DELIVER",
                    service_id: task.data?.service_id || task.target?.service_id || "",
                    request_id: requestId,
                    qa_decision: qaTask?.result?.decision || "PENDING",
                    client_approval_decision: approvalTask.result?.decision || "PENDING",
                    delivery_payload: input?.delivery_payload || task.data?.delivery_payload || { lifecycle: "completed" }
                });
            }
            case "REVENUE_RECORD": {
                const deliveryTask = this.getDependencyTask(task, "REVENUE_RECORD_REQUIRES_COMPLETED_DELIVERY");
                return this.revenue.execute({
                    action: "RECORD",
                    service_id: task.data?.service_id || task.target?.service_id || "",
                    request_id: requestId,
                    delivery_status: deliveryTask.result?.delivery_status || "PENDING",
                    payment_status: input?.payment_status || task.data?.payment_status || "PENDING",
                    amount: Number(input?.amount || task.data?.amount || 0),
                    currency: input?.currency || task.data?.currency || "USD",
                    transaction_reference: input?.transaction_reference || task.data?.transaction_reference || `txn_${requestId}`
                });
            }
            default:
                throw new Error(`UNSUPPORTED_REAL_TASK_ACTION: ${action}`);
        }
    }
}

module.exports = RealTaskExecutor;
