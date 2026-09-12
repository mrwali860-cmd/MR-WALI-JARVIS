"use strict";

const { FIRST_SERVICE } = require("./first-service-contract");

const TARGET_MARKETS = new Set(FIRST_SERVICE.target_market);

function required(value) {
    return typeof value === "string" && value.trim().length > 0;
}

class BusinessAcquisitionAgentV1 {
    evaluate(input) {
        const prospect = input && input.prospect ? input.prospect : {};
        const requestId = input && input.request_id;
        const opportunityId = prospect.opportunity_id;
        const validIdentity = required(requestId) && required(opportunityId);
        const validContext = required(prospect.company) && required(prospect.contact) && required(prospect.market) && required(prospect.problem);
        const qualified = validIdentity && validContext && TARGET_MARKETS.has(prospect.market);

        if (!qualified) {
            const unsupportedMarket = validIdentity && validContext && !TARGET_MARKETS.has(prospect.market);
            return {
                request_id: requestId ?? null,
                opportunity_id: opportunityId ?? null,
                qualification: "DISQUALIFIED",
                problem: validContext ? prospect.problem : "",
                service_id: null,
                outreach: { status: "NOT_READY", channel: null, message: null },
                next_action: unsupportedMarket ? "FIND_A_SUPPORTED_TARGET_MARKET" : "COLLECT_MISSING_PROSPECT_CONTEXT",
                evidence: {
                    deterministic: true,
                    external_execution: false,
                    decision_basis: unsupportedMarket ? "TARGET_MARKET_NOT_SUPPORTED" : "REQUIRED_CONTEXT_MISSING"
                }
            };
        }

        return {
            request_id: requestId,
            opportunity_id: opportunityId,
            qualification: "QUALIFIED",
            problem: prospect.problem,
            service_id: FIRST_SERVICE.service_id,
            outreach: {
                status: "DRAFT",
                channel: "EMAIL",
                message: `Hello ${prospect.contact}, I noticed a potential issue around ${prospect.problem}. We may be able to help improve lead response and appointment conversion.`
            },
            next_action: "REQUEST_OUTREACH_APPROVAL",
            evidence: {
                deterministic: true,
                external_execution: false,
                decision_basis: "TARGET_MARKET_AND_PROBLEM_MATCH",
                service_status: FIRST_SERVICE.status
            }
        };
    }
}

module.exports = { BusinessAcquisitionAgentV1 };
