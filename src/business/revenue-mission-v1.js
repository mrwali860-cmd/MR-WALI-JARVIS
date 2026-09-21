"use strict";

const { ProspectDiscoveryV1 } = require("./prospect-discovery-v1");
const { BusinessAcquisitionAgentV1 } = require("./business-acquisition-agent-v1");

class RevenueMissionV1 {
    constructor({ discovery, acquisition } = {}) {
        this.discovery = discovery || new ProspectDiscoveryV1();
        this.acquisition = acquisition || new BusinessAcquisitionAgentV1();
    }

    async runLive(input = {}, { liveDiscovery } = {}) {
        const provider = liveDiscovery || require("./prospect-discovery-live");
        const adapter = typeof provider === "function" ? new provider(input.live_discovery_options || {}) : provider;
        if (!adapter || typeof adapter.discover !== "function") {
            return { status: "REJECTED", request_id: input.request_id || null, reason: "LIVE_DISCOVERY_ADAPTER_REQUIRED" };
        }
        const live = await adapter.discover(input.live_discovery_options || {});
        if (!live || live.status !== "COMPLETE") {
            return { status: "BLOCKED", request_id: input.request_id || null, reason: live?.message || "LIVE_DISCOVERY_FAILED", live_discovery: live || null };
        }
        const providerResults = (live.prospects || []).map((prospect) => ({
            provider: "Apify Google Maps",
            provider_record_id: prospect.place_id || prospect.id || prospect.website || prospect.name,
            company: prospect.name,
            website: prospect.website || "",
            phone: prospect.phone || "",
            city: "Dubai",
            country: "United Arab Emirates",
            category: prospect.category || "Real Estate Agency"
        }));
        const result = this.run({
            ...input,
            provider_results: providerResults,
            search_context: input.search_context || { query: live.query, source: live.source || "Apify Google Maps" }
        });
        return { ...result, live_discovery: { executed: true, status: live.status, mode: live.mode, query: live.query, total_found: live.total_found }, evidence: { ...result.evidence, live_discovery_executed: true, external_execution: true, outbound_sending_performed: false } };
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
