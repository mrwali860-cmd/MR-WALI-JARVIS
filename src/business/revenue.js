"use strict";

const ComponentContract = require("../../contracts/component-contract");

class Revenue extends ComponentContract {
    constructor(config = {}) {
        super({
            id: "REVENUE",
            name: "Revenue",
            version: "1.0.0",
            status: "AVAILABLE",
            ...config
        });
        this.recordedTransactions = new Set();
    }

    validateInput(input = {}) {
        const required = [
            "service_id",
            "request_id",
            "delivery_status",
            "payment_status",
            "amount",
            "currency",
            "transaction_reference"
        ];
        const missing = required.filter((key) => input[key] === undefined || input[key] === null);
        if (missing.length) {
            throw new Error(`REVENUE: missing required fields: ${missing.join(", ")}`);
        }
        if (typeof input.amount !== "number" || !Number.isFinite(input.amount) || input.amount <= 0) {
            throw new Error("REVENUE: amount must be a finite positive number");
        }
        if (!String(input.currency).trim()) throw new Error("REVENUE: currency is required");
        if (!String(input.transaction_reference).trim()) throw new Error("REVENUE: transaction_reference is required");
    }

    record(input = {}) {
        this.validateInput(input);

        const delivery = String(input.delivery_status).trim().toUpperCase();
        const payment = String(input.payment_status).trim().toUpperCase();
        const ref = String(input.transaction_reference).trim();
        const timestamp = new Date().toISOString();

        if (this.recordedTransactions.has(ref)) {
            return this.result(input, "FAILED", "Duplicate transaction reference", timestamp);
        }
        if (delivery !== "DELIVERED") {
            return this.result(input, "PENDING", "Revenue requires DELIVERED service", timestamp);
        }
        if (payment === "REFUNDED") return this.result(input, "REFUNDED", "Payment has been refunded", timestamp);
        if (payment === "FAILED") return this.result(input, "FAILED", "Payment failed", timestamp);
        if (payment !== "CONFIRMED") return this.result(input, "PENDING", "Revenue requires confirmed payment", timestamp);

        this.recordedTransactions.add(ref);
        return this.result(input, "PAID", "Revenue recorded after delivery and confirmed payment", timestamp);
    }

    result(input, status, reason, timestamp) {
        return {
            decision: status === "PAID" ? "RECORDED" : status,
            service_id: input.service_id,
            request_id: input.request_id,
            revenue_status: status,
            amount: input.amount,
            currency: String(input.currency).trim().toUpperCase(),
            transaction_reference: String(input.transaction_reference).trim(),
            reason,
            timestamp
        };
    }

    execute(input = {}) {
        const action = String(input.action || "RECORD").trim().toUpperCase();
        if (action !== "RECORD") throw new Error(`REVENUE: unsupported action ${action}`);
        return this.record(input);
    }
}

module.exports = Revenue;
