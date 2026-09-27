"use strict";

const assert = require("assert");
const { RevenueMissionV1 } = require("./revenue-mission-v1");
const OutreachLive = require("./outreach-live");

class FakeLiveDiscovery {
    async discover() {
        return { status: "COMPLETE", mode: "TEST", query: "real estate agency Dubai", source: "TEST_PROVIDER", total_found: 2,
            prospects: [
                { id: "p1", name: "Dubai Realty One", website: "https://example.com/one", phone: "+971500000001" },
                { id: "p2", name: "Dubai Realty Two", website: "https://example.com/two", phone: "+971500000002" }
            ]
        };
    }
}

(async () => {
    const mission = new RevenueMissionV1();
    const result = await mission.runLive({ request_id: "revenue-loop-1", target_market: "REAL_ESTATE" }, { liveDiscovery: FakeLiveDiscovery });
    assert.equal(result.status, "READY");
    assert.equal(result.metrics.prospects, 2);
    assert.equal(result.metrics.qualified, 2);
    assert.equal(result.metrics.drafts, 2);
    assert.equal(result.evidence.outbound_sending_performed, false);
    assert.equal(result.next_action, "REQUEST_OUTREACH_APPROVAL");

    const outreach = new OutreachLive();
    const prepared = outreach.prepare(result.qualified_opportunities.map((opportunity, index) => ({
        id: opportunity.opportunity_id,
        name: "Dubai Realty " + (index + 1),
        website: "https://example.com"
    })));
    assert.equal(prepared.status, "COMPLETE");
    assert.equal(prepared.total, 2);
    assert(prepared.messages.every(message => message.status === "PENDING_APPROVAL"));

    const approved = outreach.approve(prepared.messages, [prepared.messages[0].id]);
    assert.equal(approved.total, 1);
    assert.equal(approved.messages[0].status, "APPROVED");
    assert.equal(approved.messages[1].status, "PENDING_APPROVAL");

    console.log("Revenue Mission -> Outreach Approval Boundary V1: PASS");
})().catch(error => { console.error(error); process.exitCode = 1; });
