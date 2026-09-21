"use strict";

const assert = require("node:assert");
const { RevenueMissionV1 } = require("./revenue-mission-v1");

class FakeLiveDiscovery {
    async discover() {
        return {
            status: "COMPLETE",
            mode: "LIVE",
            query: "real estate agency Dubai",
            total_found: 3,
            prospects: [
                { id: "p1", name: "Alpha Realty", website: "https://alpha.example", phone: "+971500000001", place_id: "place-1", category: "Real Estate Agency" },
                { id: "p2", name: "Alpha Realty", website: "https://alpha.example", phone: "+971500000001", place_id: "place-1", category: "Real Estate Agency" },
                { id: "p3", name: "Beta Realty", website: "https://beta.example", phone: "+971500000002", place_id: "place-2", category: "Real Estate Agency" }
            ]
        };
    }
}

async function run() {
    const mission = new RevenueMissionV1();
    const result = await mission.runLive({
        request_id: "REV_LIVE_CONTRACT_001",
        target_market: "REAL_ESTATE"
    }, { liveDiscovery: FakeLiveDiscovery });

    assert.strictEqual(result.status, "READY");
    assert.strictEqual(result.live_discovery.mode, "LIVE");
    assert.strictEqual(result.metrics.prospects, 2);
    assert.strictEqual(result.metrics.qualified, 2);
    assert.strictEqual(result.metrics.drafts, 2);
    assert.strictEqual(result.next_action, "REQUEST_OUTREACH_APPROVAL");
    assert.strictEqual(result.evidence.live_discovery_executed, true);
    assert.strictEqual(result.evidence.outbound_sending_performed, false);
    console.log("REVENUE MISSION LIVE INTEGRATION TEST: PASS");
}

run().catch((error) => {
    console.error("REVENUE MISSION LIVE INTEGRATION TEST: FAIL");
    console.error(error);
    process.exitCode = 1;
});
