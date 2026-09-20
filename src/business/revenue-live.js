"use strict";

const Revenue = require("./revenue");

/**
 * Revenue Live - Level 5
 * Record revenue only for DELIVERED delivery plans when payment is confirmed.
 * Uses existing Revenue component. No fake money movement.
 */
class RevenueLive {
  constructor(options = {}) {
    this.revenue = options.revenue || new Revenue();
    this.defaultAmount = typeof options.defaultAmount === "number" ? options.defaultAmount : 500;
    this.defaultCurrency = options.defaultCurrency || "USD";
  }

  record(plans = [], options = {}) {
    const list = Array.isArray(plans) ? plans : [];
    if (!list.length) {
      return {
        executed: false,
        status: "BLOCKED",
        message: "No delivery plans. Run prepare delivery → complete delivery first.",
        records: [],
        total: 0
      };
    }

    const amount = typeof options.amount === "number" ? options.amount : this.defaultAmount;
    const currency = options.currency || this.defaultCurrency;
    const records = [];
    const updatedPlans = [];

    for (const plan of list) {
      if (plan.delivery_status !== "DELIVERED") {
        updatedPlans.push({
          ...plan,
          revenue_status: plan.revenue_status || "NOT_RECORDED",
          revenue_reason: "Requires DELIVERED status"
        });
        continue;
      }

      if (plan.revenue_status === "PAID" || plan.revenue_status === "RECORDED") {
        updatedPlans.push(plan);
        records.push({
          plan_id: plan.id,
          prospect_name: plan.prospect_name,
          status: "SKIPPED_ALREADY_RECORDED"
        });
        continue;
      }

      const requestId = `REV_${plan.id}_${Date.now()}`;
      const transaction_reference = options.transaction_reference || `TXN_${plan.id}_${Date.now()}`;

      const result = this.revenue.record({
        service_id: plan.service_id,
        request_id: requestId,
        delivery_status: "DELIVERED",
        payment_status: "CONFIRMED",
        amount,
        currency,
        transaction_reference
      });

      const revenue_status = result.revenue_status || result.decision;
      updatedPlans.push({
        ...plan,
        revenue_status,
        revenue_result: result,
        transaction_reference,
        amount,
        currency,
        updated_at: new Date().toISOString()
      });

      records.push({
        plan_id: plan.id,
        prospect_name: plan.prospect_name,
        status: revenue_status,
        amount,
        currency,
        transaction_reference,
        reason: result.reason
      });
    }

    const paid = records.filter((r) => r.status === "PAID" || r.status === "RECORDED").length;

    return {
      executed: true,
      status: "COMPLETE",
      total: records.length,
      paid,
      records,
      plans: updatedPlans,
      message: `Level 5: Revenue recorded for ${paid} delivered plan(s). Amount ${amount} ${currency} each (operator-confirmed payment).`
    };
  }

  summary(plans = []) {
    const list = Array.isArray(plans) ? plans : [];
    const rows = list.map((p, i) => {
      const amt = p.amount != null ? `${p.amount} ${p.currency || ""}` : "-";
      return `${i + 1}. [${p.revenue_status || "NOT_RECORDED"}] DEL:${p.delivery_status || "-"} ${p.prospect_name} | ${amt}`;
    });
    return {
      executed: true,
      status: "COMPLETE",
      total: list.length,
      message: list.length
        ? `Revenue / delivery summary (${list.length}):\n\n${rows.join("\n")}`
        : "No delivery plans yet."
    };
  }
}

module.exports = RevenueLive;
