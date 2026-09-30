"use strict";

const SERVICES = Object.freeze({
    WHATSAPP_LEAD_AUTOMATION: Object.freeze({
        service_id: "WHATSAPP_LEAD_AUTOMATION",
        name: "AI Automation Service — WhatsApp Lead Automation",
        category: "AI_AUTOMATION",
        target_market: ["REAL_ESTATE", "HIGH_TICKET_BUSINESSES"],
        outcome: "Incoming WhatsApp lead -> AI qualification -> lead scoring -> CRM record -> approved follow-up or booking workflow",
        lifecycle: ["CLIENT_REQUIREMENT","SERVICE_CREATED","SERVICE_PLAN","TASKS_CREATED","EXECUTION","QA","CLIENT_APPROVAL","DELIVERY","REVENUE"],
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
        inputs: ["client","whatsapp_business_number","lead_source","crm_destination","qualification_criteria","approval_policy"],
        outputs: ["qualified_lead","lead_score","crm_record","approved_follow_up","delivery_status","revenue_record"],
        risk_controls: { external_message_send: "APPROVAL_REQUIRED", appointment_booking: "APPROVAL_REQUIRED", payment_or_money_movement: "APPROVAL_REQUIRED", data_deletion: "APPROVAL_REQUIRED" },
        success_metrics: ["lead_response_time","qualification_completion_rate","crm_capture_rate","approved_follow_up_rate","delivery_time","client_revenue_impact"],
        version: "1.0.0",
        status: "READY"
    }),
    ECOMMERCE_OPERATIONS_AUTOMATION: Object.freeze({
        service_id: "ECOMMERCE_OPERATIONS_AUTOMATION",
        name: "AI Automation Service — E-commerce Operations",
        category: "ECOMMERCE_AUTOMATION",
        target_market: ["ECOMMERCE_STORES","DTC_BRANDS","ONLINE_SELLERS"],
        outcome: "Product research -> supplier research -> listing draft -> inventory/order operations -> support -> analytics, with approval-gated external commerce actions",
        lifecycle: ["CLIENT_REQUIREMENT","SERVICE_CREATED","SERVICE_PLAN","TASKS_CREATED","EXECUTION","QA","CLIENT_APPROVAL","DELIVERY","REVENUE"],
        tasks: [
            { task_type: "PRODUCT_RESEARCH", name: "Product Research", required: true },
            { task_type: "SUPPLIER_RESEARCH", name: "Supplier Research", required: true },
            { task_type: "PRODUCT_LISTING_DRAFT", name: "Product Listing Draft", required: true },
            { task_type: "INVENTORY_SYNC", name: "Inventory Sync", required: true },
            { task_type: "ORDER_INTAKE", name: "Order Intake", required: true },
            { task_type: "ORDER_STATUS_SYNC", name: "Order Status Sync", required: true },
            { task_type: "CUSTOMER_SUPPORT_DRAFT", name: "Customer Support Draft", required: true },
            { task_type: "COMMERCE_ANALYTICS", name: "Commerce Analytics", required: true },
            { task_type: "LISTING_PUBLISH", name: "Listing Publish", required: true },
            { task_type: "ORDER_FULFILLMENT", name: "Order Fulfillment", required: true },
            { task_type: "ORDER_REFUND", name: "Order Refund", required: true }
        ],
        inputs: ["store","platform","catalog","supplier_sources","inventory_source","order_source","approval_policy"],
        outputs: ["product_candidates","supplier_candidates","listing_drafts","inventory_snapshot","order_snapshot","support_drafts","commerce_metrics"],
        risk_controls: { listing_publish: "APPROVAL_REQUIRED", order_fulfillment: "APPROVAL_REQUIRED", order_refund: "APPROVAL_REQUIRED", payment_or_money_movement: "APPROVAL_REQUIRED", external_message_send: "APPROVAL_REQUIRED", data_deletion: "APPROVAL_REQUIRED" },
        success_metrics: ["research_time","listing_production_time","order_processing_time","support_response_time","fulfillment_accuracy","refund_rate","revenue","contribution_margin"],
        version: "1.0.0",
        status: "READY"
    })
});

function getServiceContract(serviceId) { return SERVICES[serviceId] || null; }
function listServiceContracts() { return Object.values(SERVICES); }

module.exports = { SERVICES, getServiceContract, listServiceContracts };
