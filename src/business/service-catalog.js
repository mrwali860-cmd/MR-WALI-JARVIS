"use strict";

const SERVICES = Object.freeze({
    WHATSAPP_LEAD_AUTOMATION: Object.freeze({
        service_id: "WHATSAPP_LEAD_AUTOMATION",
        name: "AI Automation Service — WhatsApp Lead Automation",
        category: "AI_AUTOMATION",
        target_market: ["REAL_ESTATE", "HIGH_TICKET_BUSINESSES"],
        outcome: "Incoming WhatsApp lead -> AI qualification -> lead scoring -> CRM record -> approved follow-up or booking workflow",
        lifecycle: [
            "CLIENT_REQUIREMENT",
            "SERVICE_CREATED",
            "SERVICE_PLAN",
            "TASKS_CREATED",
            "EXECUTION",
            "QA",
            "CLIENT_APPROVAL",
            "DELIVERY",
            "REVENUE"
        ],
        tasks: [
            { task_type: "WHATSAPP_LEAD_INTAKE", name: "WhatsApp Lead Intake", required: true },
            { task_type: "LEAD_VALIDATION", name: "Lead Validation", required: true },
            { task_type: "AI_QUALIFICATION", name: "AI Qualification", required: true },
            { task_type: "LEAD_SCORING", name: "Lead Scoring", required: true },
            { task_type: "CRM_RECORD", name: "CRM Record", required: true },
            { task_type: "FOLLOW_UP_PREPARATION", name: "Follow-up Preparation", required: true },
            { task_type: "QA", name: "Quality Assurance", required: true },
            { task_type: "CLIENT_APPROVAL", name: "Client Approval", required: true },
            { task_type: "DELIVERY", name: "Delivery", required: true },
            { task_type: "REVENUE_RECORD", name: "Revenue Record", required: true }
        ],
        inputs: [
            "client",
            "whatsapp_business_number",
            "lead_source",
            "crm_destination",
            "qualification_criteria",
            "approval_policy"
        ],
        outputs: [
            "qualified_lead",
            "lead_score",
            "crm_record",
            "approved_follow_up",
            "delivery_status",
            "revenue_record"
        ],
        risk_controls: {
            external_message_send: "APPROVAL_REQUIRED",
            appointment_booking: "APPROVAL_REQUIRED",
            payment_or_money_movement: "APPROVAL_REQUIRED",
            data_deletion: "APPROVAL_REQUIRED"
        },
        success_metrics: [
            "lead_response_time",
            "qualification_completion_rate",
            "crm_capture_rate",
            "approved_follow_up_rate",
            "delivery_time",
            "client_revenue_impact"
        ],
        version: "1.0.0",
        status: "READY"
    })
});

function getServiceContract(serviceId) {
    return SERVICES[serviceId] || null;
}

function listServiceContracts() {
    return Object.values(SERVICES);
}

module.exports = {
    SERVICES,
    getServiceContract,
    listServiceContracts
};
