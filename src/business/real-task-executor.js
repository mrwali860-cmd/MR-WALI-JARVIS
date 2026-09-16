"use strict";

const ProspectDiscoveryLive = require("./prospect-discovery-live");

/**
 * Production Task Executor V1
 *
 * The Orchestrator owns lifecycle/state. This adapter owns the mapping from a
 * canonical task action to a real external capability. Unsupported actions
 * fail closed; they are never silently simulated.
 */
class RealTaskExecutor {
    constructor({ prospectDiscovery } = {}) {
        this.prospectDiscovery = prospectDiscovery || new ProspectDiscoveryLive({
            limit: 20,
            query: "real estate agency Dubai"
        });
    }

    async execute({ action, task, input = null }) {
        if (!task || !task.task_id) throw new Error("TASK_REQUIRED");

        switch (action) {
            case "LEAD_INTAKE": {
                const query = input?.query || task.data?.query || "real estate agency Dubai";
                const limit = input?.limit || task.data?.limit || 20;
                return this.prospectDiscovery.discover({ query, limit });
            }
            default:
                throw new Error(`UNSUPPORTED_REAL_TASK_ACTION: ${action}`);
        }
    }
}

module.exports = RealTaskExecutor;
