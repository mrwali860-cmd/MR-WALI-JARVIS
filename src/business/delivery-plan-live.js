"use strict";

const { getFirstSellableService } = require("./first-service-contract");
const QualityAssurance = require("./qa");
const Delivery = require("./delivery");
const Revenue = require("./revenue");

/**
 * Delivery Plan Live - Level 4
 * From approved proposals → delivery checklist → QA → delivery mark.
 * Reuses existing QA, Delivery, Revenue components.
 * Human approves sensitive steps.
 */
class DeliveryPlanLive {
  constructor(options = {}) {
    this.service = options.service || getFirstSellableService();
    this.qa = options.qa || new QualityAssurance();
    this.delivery = options.delivery || new Delivery();
    this.revenue = options.revenue || new Revenue();
  }

  prepare(proposals = []) {
    const approved = (Array.isArray(proposals) ? proposals : []).filter(
      (p) => p.status === "APPROVED"
    );

    if (!approved.length) {
      return {
        executed: false,
        status: "BLOCKED",
        message: "No APPROVED proposals. Run prepare proposal + approve proposal first.",
        plans: [],
        total: 0
      };
    }

    const plans = approved.map((p, index) => {
      const checklist = (this.service.tasks || []).map((t, i) => ({
        step: i + 1,
        task_type: t.task_type,
        name: t.name,
        required: t.required !== false,
        status: "PENDING"
      }));

      return {
        id: `delivery_${index + 1}`,
        proposal_id: p.id,
        prospect_id: p.prospect_id,
        prospect_name: p.prospect_name,
        phone: p.phone || "",
        website: p.website || "",
        service_id: p.service_id || this.service.service_id,
        service_name: p.service_name || this.service.name,
        checklist,
        qa_status: "NOT_RUN",
        delivery_status: "PLANNED",
        revenue_status: "NOT_RECORDED",
        status: "PENDING_EXECUTION",
        created_at: new Date().toISOString()
      };
    });

    return {
      executed: true,
      status: "COMPLETE",
      total: plans.length,
      plans,
      message: `Level 4: Prepared ${plans.length} delivery plans from approved proposals. Next: run qa delivery, then complete delivery.`
    };
  }

  runQa(plans = [], options = {}) {
    const list = Array.isArray(plans) ? plans : [];
    if (!list.length) {
      return {
        executed: false,
        status: "BLOCKED",
        message: "No delivery plans. Run prepare delivery first.",
        plans: []
      };
    }

    const updated = list.map((plan, index) => {
      const requestId = `QA_${plan.id}_${Date.now()}`;
      const taskId = `TASK_${plan.id}`;

      // Operator-level deterministic QA for delivery plan readiness
      const acceptance_criteria = [
        { name: "has_prospect", passed: Boolean(plan.prospect_name) },
        { name: "has_service", passed: Boolean(plan.service_id) },
        { name: "checklist_present", passed: Array.isArray(plan.checklist) && plan.checklist.length > 0 },
        { name: "proposal_linked", passed: Boolean(plan.proposal_id) }
      ];

      const qaResult = this.qa.evaluate({
        service_id: plan.service_id,
        task_id: taskId,
        request_id: requestId,
        expected_output: "delivery_plan_ready",
        actual_output: JSON.stringify({
          prospect: plan.prospect_name,
          checklist_steps: plan.checklist.length
        }),
        acceptance_criteria,
        execution_status: "COMPLETED"
      });

      const checklist = (plan.checklist || []).map((step) => ({
        ...step,
        status: qaResult.decision === "PASS" ? "READY" : step.status
      }));

      return {
        ...plan,
        checklist,
        qa_status: qaResult.decision,
        qa_result: qaResult,
        status: qaResult.decision === "PASS" ? "QA_PASSED" : "QA_FAILED",
        updated_at: new Date().toISOString()
      };
    });

    const passed = updated.filter((p) => p.qa_status === "PASS").length;

    return {
      executed: true,
      status: "COMPLETE",
      total: updated.length,
      passed,
      plans: updated,
      message: `QA complete: ${passed}/${updated.length} plans PASS. Next: complete delivery (only PASS plans will deliver).`
    };
  }

  complete(plans = []) {
    const list = Array.isArray(plans) ? plans : [];
    if (!list.length) {
      return {
        executed: false,
        status: "BLOCKED",
        message: "No delivery plans. Run prepare delivery first.",
        plans: []
      };
    }

    const updated = list.map((plan) => {
      if (plan.qa_status !== "PASS") {
        return {
          ...plan,
          delivery_status: "BLOCKED",
          status: "BLOCKED_QA",
          delivery_reason: "Delivery requires QA PASS"
        };
      }

      const requestId = `DEL_${plan.id}_${Date.now()}`;
      const result = this.delivery.deliver({
        service_id: plan.service_id,
        request_id: requestId,
        qa_decision: "PASS",
        client_approval_decision: "APPROVED",
        delivery_payload: {
          prospect_name: plan.prospect_name,
          service_name: plan.service_name,
          checklist: plan.checklist,
          note: "Level 4 operator-confirmed delivery package ready"
        }
      });

      const checklist = (plan.checklist || []).map((step) => ({
        ...step,
        status: result.decision === "DELIVERED" ? "DONE" : step.status
      }));

      return {
        ...plan,
        checklist,
        delivery_status: result.decision,
        delivery_result: result,
        status: result.decision === "DELIVERED" ? "DELIVERED" : result.decision,
        updated_at: new Date().toISOString()
      };
    });

    const delivered = updated.filter((p) => p.delivery_status === "DELIVERED").length;

    return {
      executed: true,
      status: "COMPLETE",
      total: updated.length,
      delivered,
      plans: updated,
      message: `Delivery complete: ${delivered}/${updated.length} DELIVERED. Next Level 5: record revenue when payment is confirmed.`
    };
  }
}

module.exports = DeliveryPlanLive;
