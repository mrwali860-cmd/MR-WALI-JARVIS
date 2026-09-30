"use strict";

const SUPPORTED_ACTIONS = Object.freeze([
    "PRODUCT_RESEARCH",
    "SUPPLIER_RESEARCH",
    "PRODUCT_LISTING_DRAFT",
    "INVENTORY_SYNC",
    "ORDER_INTAKE",
    "ORDER_STATUS_SYNC",
    "CUSTOMER_SUPPORT_DRAFT",
    "COMMERCE_ANALYTICS",
    "LISTING_PUBLISH",
    "ORDER_FULFILLMENT",
    "ORDER_REFUND"
]);

class EcommerceOperationsAdapterV1 {
    constructor({ provider } = {}) {
        if (!provider || typeof provider.execute !== "function") {
            throw new Error("ECOMMERCE_PROVIDER_REQUIRED");
        }
        this.provider = provider;
        this.adapter = "ECOMMERCE_OPERATIONS";
        this.version = "1.0.0";
    }

    async execute({ action, input = {}, request_id = null, service_id = null, task_id = null } = {}) {
        if (!SUPPORTED_ACTIONS.includes(action)) {
            throw new Error("UNSUPPORTED_ECOMMERCE_ACTION");
        }

        const result = await this.provider.execute({
            action,
            input,
            request_id,
            service_id,
            task_id
        });

        return {
            adapter: this.adapter,
            version: this.version,
            action,
            status: "EXECUTED",
            result
        };
    }
}

module.exports = {
    SUPPORTED_ACTIONS,
    EcommerceOperationsAdapterV1
};
