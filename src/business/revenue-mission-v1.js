"use strict";

const { ProspectDiscoveryV1 } = require("./prospect-discovery-v1");
const { BusinessAcquisitionAgentV1 } = require("./business-acquisition-agent-v1");

class RevenueMissionV1 {
    constructor({ discovery, acquisition } = {}) {
        this.discovery = discovery || new ProspectDiscoveryV1();
        this.acquisition = acquisition || new BusinessAcquisitionAgentV1();
    }

    run(input = {}) {
        const requestId = String(input.request_id || "").trim();
        const targetMarket = input.target_market || "REAL_ESTATE";
        const discovery = this.discovery.discover({
            request_id: requestId,
            target_market: targetMarket,
            search_context: input.search_context || {},
            provider_results: input.provider_results || []
        });

        if (discovery.status !== "READY") {
            return { status: "REJECTED", request_id: requestId || null, reason: discovery.reason, discovery, qualified_opportunities: [], outreach_drafts: [], metrics: { prospects: 0, qualified: 0, drafts: 0 } };
        }

        const evaluated = discovery.prospects.map((prospect, index) => {
            const opportunityId = prospect.opportunity_id || requestId + "_OPP_" + (index + 1);
            return this.acquisition.evaluate({
                request_id: opportunityId,
                prospect: {
                    ...prospect,
                    opportunity_id: opportunityId,
                    contact: prospect.contact || prospect.email || prospect.company,
                    market: prospect.market || targetMarket,
                    problem: prospect.problem || input.default_problem || "Property enquiries may be losing speed before a sales agent can qualify and follow up."
                }
            });
        });

        const qualified = evaluated.filter(item => item.qualification === "QUALIFIED");
        const drafts = qualified.filter(item => item.outreach && item.outreach.status === "DRAFT").map(item => ({
            opportunity_id: item.opportunity_id,
            channel: item.outreach.channel,
            message: item.outreach.message,
            approval_required: true
        }));

        return {
            status: "READY",
            request_id: requestId,
            target_market: targetMarket,
            discovery,
            evaluations: evaluated,
            qualified_opportunities: qualified,
            outreach_drafts: drafts,
            metrics: { prospects: discovery.prospects.length, qualified: qualified.length, drafts: drafts.length, rejected_by_discovery: discovery.rejected_count },
            next_action: drafts.length ? "REQUEST_OUTREACH_APPROVAL" : "FIND_MORE_QUALIFIED_PROSPECTS",
            evidence: { deterministic: true, external_execution: false, sending_performed: false, approval_required_for_outbound: true }
        };
    }
}

module.exports = { RevenueMissionV1 };
