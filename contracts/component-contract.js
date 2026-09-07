"use strict";

/**
 * JARVIS Component Contract V1
 *
 * Every component exposes:
 * - getInfo()
 * - healthCheck()
 * - execute(input)
 *
 * Components must not silently perform actions outside
 * their declared responsibility.
 */
class ComponentContract {
    constructor(config = {}) {
        this.id = config.id || "UNKNOWN";
        this.name = config.name || this.id;
        this.version = config.version || "1.0.0";
        this.status = config.status || "MISSING";
    }

    getInfo() {
        return {
            id: this.id,
            name: this.name,
            version: this.version,
            status: this.status
        };
    }

    healthCheck() {
        return {
            component: this.id,
            status: this.status,
            healthy: this.status !== "BROKEN"
        };
    }

    execute() {
        throw new Error(
            `${this.id}: execute() is not implemented`
        );
    }
}

module.exports = ComponentContract;
