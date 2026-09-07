"use strict";

/**
 * First Sellable Service Decision V1
 *
 * Revenue-first selection: choose the service with strong sellability,
 * measurable ROI, fast delivery, and manageable implementation complexity.
 */
const FIRST_SERVICE = Object.freeze({
    service_id: "AI_APPOINTMENT_BOOKING_AUTOMATION",
    name: "AI Appointment Booking Automation",
    category: "AI_AUTOMATION",
    target_market: ["REAL_ESTATE", "HIGH_TICKET_BUSINESSES", "SERVICE_BUSINESSES"],
    customer_problem: "Leads are lost because inquiries are not converted into qualified appointments quickly.",
    business_outcome: "Lead -> qualification -> appointment request -> approved booking -> CRM record",
    revenue_score: {
        sellability: 9,
        roi_clarity: 9,
        delivery_speed: 9,
        implementation_complexity: 5,
        total: 32
    },
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
        { task_type: "LEAD_INTAKE", name: "Lead Intake", required: true },
        { task_type: "LEAD_QUALIFICATION", name: "Lead Qualification", required: true },
        { task_type: "APPOINTMENT_REQUEST", name: "Appointment Request", required: true },
        { task_type: "APPROVAL_GATE", name: "Booking Approval Gate", required: true },
        { task_type: "BOOKING_EXECUTION", name: "Booking Execution", required: true },
        { task_type: "CRM_RECORD", name: "CRM Record", required: true },
        { task_type: "QA", name: "Quality Assurance", required: true },
        { task_type: "CLIENT_APPROVAL", name: "Client Approval", required: true },
        { task_type: "DELIVERY", name: "Delivery", required: true },
        { task_type: "REVENUE_RECORD", name: "Revenue Record", required: true }
    ],
    risk_controls: {
        external_message_send: "APPROVAL_REQUIRED",
        appointment_booking: "APPROVAL_REQUIRED",
        payment_or_money_movement: "APPROVAL_REQUIRED",
        data_deletion: "APPROVAL_REQUIRED"
    },
    success_metrics: [
        "lead_to_appointment_rate",
        "appointment_booking_time",
        "qualified_lead_rate",
        "show_rate",
        "client_revenue_impact"
    ],
    version: "1.0.0",
    status: "SELECTED"
});

function getFirstSellableService() {
    return FIRST_SERVICE;
}

module.exports = {
    FIRST_SERVICE,
    getFirstSellableService
};
